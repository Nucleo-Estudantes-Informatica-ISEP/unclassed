#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const DEFAULT_PORT = process.env.MONGO_PORT || "27017";
const DEFAULT_DATABASE_URL = `mongodb://127.0.0.1:${DEFAULT_PORT}/unclassed_integration?replicaSet=rs0&directConnection=true`;
const CONTAINER_NAME = "mongo-integration";
const IMAGE = process.env.MONGO_IMAGE || "mongo:7";

const args = process.argv.slice(2);
const keepAlive = args.includes("--keep-alive") || args.includes("-k");
const skipDeploy = args.includes("--skip-deploy");

let startedContainer = false;

function log(message) {
  console.log(`\x1b[36m[integration-test]\x1b[0m ${message}`);
}

function logError(message) {
  console.error(`\x1b[31m[integration-test error]\x1b[0m ${message}`);
}

function runCommand(command, cmdArgs, options = {}) {
  return spawnSync(command, cmdArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
}

function runSilent(command, cmdArgs) {
  return spawnSync(command, cmdArgs, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function checkDockerAvailable() {
  const result = runSilent("docker", ["info"]);
  if (result.status !== 0) {
    logError("Docker daemon is not running or accessible.");
    if (process.platform === "win32") {
      logError("Please start Docker Desktop on Windows before running integration tests.");
    } else if (process.platform === "darwin") {
      logError("Please start Docker Desktop on macOS before running integration tests.");
    } else {
      logError("Please start the Docker service (e.g. 'sudo systemctl start docker') and ensure your user has docker permissions.");
    }
    process.exit(1);
  }
}

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startMongoContainer() {
  checkDockerAvailable();

  if (isContainerRunning()) {
    log(`Container "${CONTAINER_NAME}" is already running. Reusing existing instance.`);
    return;
  }

  if (isContainerExisting()) {
    log(`Removing stopped container "${CONTAINER_NAME}"...`);
    runSilent("docker", ["rm", "-f", CONTAINER_NAME]);
  }

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

  // Poll until MongoDB accepts connections
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
    logError("MongoDB failed to respond in time.");
    cleanup();
    process.exit(1);
  }

  // Initiate replica set
  log("Initiating replica set rs0...");
  runSilent("docker", [
    "exec",
    CONTAINER_NAME,
    "mongosh",
    "--quiet",
    "--eval",
    `try { rs.status(); } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:${DEFAULT_PORT}' }] }); }`,
  ]);

  // Wait for primary
  log("Waiting for replica set primary...");
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

function cleanup() {
  if (startedContainer && !keepAlive) {
    log(`Stopping and removing ephemeral container "${CONTAINER_NAME}"...`);
    runSilent("docker", ["rm", "-f", CONTAINER_NAME]);
  }
}

// Ensure cleanup on signals
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  try {
    // If DATABASE_URL is not set externally, handle the container automatically
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL === DEFAULT_DATABASE_URL) {
      await startMongoContainer();
    }

    if (!skipDeploy) {
      log("Deploying Prisma schema and versioned indexes to test database...");
      const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
      const deployRes = runCommand(pnpmCmd, ["schema:deploy"], { env });
      if (deployRes.status !== 0) {
        logError("Schema deploy failed.");
        process.exit(deployRes.status ?? 1);
      }
    }

    log("Running integration test suite...");
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const testRes = runCommand(
      pnpmCmd,
      ["exec", "vitest", "run", "--config", "vitest.integration.config.mts"],
      { env }
    );

    cleanup();
    process.exit(testRes.status ?? 0);
  } catch (error) {
    logError(`Unexpected failure: ${error}`);
    cleanup();
    process.exit(1);
  }
}

main();
