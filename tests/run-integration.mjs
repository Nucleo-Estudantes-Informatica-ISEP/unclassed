#!/usr/bin/env node
/**
 * Cross-platform integration test runner for Unclassed.
 *
 * This script automates the complete lifecycle required for MongoDB integration tests:
 * 1. Verifies Docker daemon availability with platform-specific guidance (Windows, Linux, macOS).
 * 2. Starts an ephemeral MongoDB 7 replica set container (`mongo-integration`) on port 27017.
 * 3. Polls until MongoDB is responsive, initiates `rs0`, and waits for primary election.
 * 4. Deploys the Prisma schema and versioned partial unique indexes to `unclassed_integration`.
 * 5. Executes the Vitest integration test suite (`vitest.integration.config.mts`).
 * 6. Guarantees container teardown and environment cleanup upon completion or interruption.
 *
 * Usage:
 *   pnpm test:integration                # Run full automated lifecycle (start -> test -> cleanup)
 *   pnpm test:integration --keep-alive   # Keep the MongoDB container running for fast local re-runs
 *   pnpm test:integration --skip-deploy  # Skip schema deploy (useful when container was kept alive)
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

// Configuration constants
const DEFAULT_PORT = process.env.MONGO_PORT || "27017";
const DEFAULT_DATABASE_URL = `mongodb://127.0.0.1:${DEFAULT_PORT}/unclassed_integration?replicaSet=rs0&directConnection=true`;
const CONTAINER_NAME = "mongo-integration";
const IMAGE = process.env.MONGO_IMAGE || "mongo:7";

// Command line arguments
const args = process.argv.slice(2);
const keepAlive = args.includes("--keep-alive") || args.includes("-k");
const skipDeploy = args.includes("--skip-deploy");

// Tracks whether this execution started the container
let startedContainer = false;

/**
 * Log formatted info message with cyan tag.
 */
function log(message) {
  console.log(`\x1b[36m[integration-test]\x1b[0m ${message}`);
}

/**
 * Log formatted error message with red tag.
 */
function logError(message) {
  console.error(`\x1b[31m[integration-test error]\x1b[0m ${message}`);
}

/**
 * Executes a command synchronously with inherited stdio (output streamed to console).
 * Automatically handles shell execution on Windows (e.g. for pnpm.cmd).
 */
function runCommand(command, cmdArgs, options = {}) {
  return spawnSync(command, cmdArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
}

/**
 * Executes a command silently and captures its stdout/stderr for inspection.
 */
function runSilent(command, cmdArgs) {
  return spawnSync(command, cmdArgs, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

/**
 * Verifies that the Docker daemon is accessible.
 * If not, prints helpful platform-specific troubleshooting instructions and exits.
 */
function checkDockerAvailable() {
  const result = runSilent("docker", ["info"]);
  if (result.status !== 0) {
    logError("Docker daemon is not running or accessible.");
    if (process.platform === "win32") {
      logError("Please start Docker Desktop on Windows before running integration tests.");
    } else if (process.platform === "darwin") {
      logError("Please start Docker Desktop on macOS before running integration tests.");
    } else {
      logError(
        "Please start the Docker service (e.g. 'sudo systemctl start docker') and ensure your user has docker permissions."
      );
    }
    process.exit(1);
  }
}

/**
 * Checks if the ephemeral test container is currently running.
 */
function isContainerRunning() {
  const result = runSilent("docker", [
    "ps",
    "--filter",
    `name=^/${CONTAINER_NAME}$`,
    "--format",
    "{{.Names}}",
  ]);
  return result.stdout.trim() === CONTAINER_NAME;
}

/**
 * Checks if a container with the test name exists (even if stopped).
 */
function isContainerExisting() {
  const result = runSilent("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^/${CONTAINER_NAME}$`,
    "--format",
    "{{.Names}}",
  ]);
  return result.stdout.trim() === CONTAINER_NAME;
}

/**
 * Pure JavaScript async delay utility (cross-platform, non-blocking).
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts the ephemeral MongoDB 7 replica set container and waits for primary readiness.
 */
async function startMongoContainer() {
  checkDockerAvailable();

  // If already running (e.g. from previous run with --keep-alive), reuse it
  if (isContainerRunning()) {
    log(`Container "${CONTAINER_NAME}" is already running. Reusing existing instance.`);
    return;
  }

  // Remove stale stopped container if present
  if (isContainerExisting()) {
    log(`Removing stopped container "${CONTAINER_NAME}"...`);
    runSilent("docker", ["rm", "-f", CONTAINER_NAME]);
  }

  // Launch fresh MongoDB container configured for replica set rs0
  log(`Starting ephemeral MongoDB replica set container (${IMAGE}) on port ${DEFAULT_PORT}...`);
  const runRes = runSilent("docker", [
    "run",
    "-d",
    "--name",
    CONTAINER_NAME,
    "-p",
    `${DEFAULT_PORT}:27017`,
    IMAGE,
    "--replSet",
    "rs0",
    "--bind_ip_all",
  ]);

  if (runRes.status !== 0) {
    logError(`Failed to start docker container: ${runRes.stderr}`);
    process.exit(1);
  }

  startedContainer = true;

  // Poll until MongoDB accepts connections (ping command succeeds)
  log("Waiting for MongoDB to accept connections...");
  const maxAttempts = 30;
  let ready = false;
  for (let i = 0; i < maxAttempts; i++) {
    const ping = runSilent("docker", [
      "exec",
      CONTAINER_NAME,
      "mongosh",
      "--quiet",
      "--eval",
      "db.runCommand({ ping: 1 }).ok",
    ]);
    if (ping.status === 0 && ping.stdout.includes("1")) {
      ready = true;
      break;
    }
    await sleep(1000);
  }

  if (!ready) {
    logError("MongoDB failed to respond within 30 seconds.");
    cleanup();
    process.exit(1);
  }

  // Initiate replica set rs0 with local bind
  log("Initiating replica set rs0...");
  runSilent("docker", [
    "exec",
    CONTAINER_NAME,
    "mongosh",
    "--quiet",
    "--eval",
    `try { rs.status(); } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }); }`,
  ]);

  // Poll until primary election completes (isWritablePrimary returns true)
  log("Waiting for replica set primary election...");
  let primary = false;
  for (let i = 0; i < maxAttempts; i++) {
    const checkPrimary = runSilent("docker", [
      "exec",
      CONTAINER_NAME,
      "mongosh",
      "--quiet",
      "--eval",
      "db.hello().isWritablePrimary",
    ]);
    if (checkPrimary.status === 0 && checkPrimary.stdout.includes("true")) {
      primary = true;
      break;
    }
    await sleep(1000);
  }

  if (!primary) {
    logError("MongoDB primary replica set election timed out.");
    cleanup();
    process.exit(1);
  }

  log("MongoDB replica set rs0 is ready!");
}

/**
 * Cleans up the ephemeral test container unless explicitly instructed to --keep-alive.
 * Ensures no leftover containers, volumes, or open ports remain after test execution.
 */
function cleanup() {
  if (startedContainer && !keepAlive) {
    log(`Stopping and removing ephemeral container "${CONTAINER_NAME}"...`);
    runSilent("docker", ["rm", "-f", CONTAINER_NAME]);
    log("Environment cleaned up successfully.");
  }
}

// Guarantee cleanup when interrupted via Ctrl+C (SIGINT) or kill (SIGTERM)
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

/**
 * Main orchestration function.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  let exitCode = 0;

  try {
    // Step 1: Manage ephemeral container if not using a custom external database
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL === DEFAULT_DATABASE_URL) {
      await startMongoContainer();
    }

    // Step 2: Deploy schema and versioned MongoDB partial unique indexes
    if (!skipDeploy) {
      log("Deploying Prisma schema and versioned indexes to test database...");
      const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
      const deployRes = runCommand(pnpmCmd, ["schema:deploy"], { env });
      if (deployRes.status !== 0) {
        logError("Schema deploy failed.");
        exitCode = deployRes.status ?? 1;
        return;
      }
    }

    // Step 3: Run Vitest integration test suite
    log("Running integration test suite...");
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const testRes = runCommand(
      pnpmCmd,
      ["exec", "vitest", "run", "--config", "vitest.integration.config.mts"],
      { env }
    );

    exitCode = testRes.status ?? 0;
  } catch (error) {
    logError(`Unexpected failure during integration test run: ${error}`);
    exitCode = 1;
  } finally {
    // Step 4: Guarantee environment teardown in all scenarios (pass, fail, or crash)
    cleanup();
    process.exit(exitCode);
  }
}

main();
