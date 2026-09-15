#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="mongo-integration"
PORT="${MONGO_PORT:-27017}"
IMAGE="${MONGO_IMAGE:-mongo:7}"

usage() {
  echo "Usage: $0 {start|stop|status}"
  exit 1
}

check_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running or accessible."
    echo "Please ensure the Docker service is started (e.g. 'sudo systemctl start docker') and that your user has permissions to run docker."
    exit 1
  fi
}

start_mongo() {
  check_docker
  if docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} is already running."
    exit 0
  fi

  # Remove existing stopped container if present
  if docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing stopped container ${CONTAINER_NAME}..."
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  echo "Starting ephemeral MongoDB replica set container (${IMAGE}) on port ${PORT}..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${PORT}:27017" \
    "${IMAGE}" \
    --replSet rs0 \
    --bind_ip_all

  echo "Waiting for MongoDB to accept connections..."
  until docker exec "${CONTAINER_NAME}" mongosh --quiet --eval "db.runCommand({ ping: 1 }).ok" 2>/dev/null | grep -q "1"; do
    sleep 1
  done

  echo "Initiating replica set rs0..."
  docker exec "${CONTAINER_NAME}" mongosh --quiet --eval "
    try {
      rs.status();
    } catch (e) {
      rs.initiate({
        _id: 'rs0',
        members: [{ _id: 0, host: '127.0.0.1:${PORT}' }]
      });
    }
  " >/dev/null 2>&1 || true

  echo "Waiting for replica set primary..."
  until docker exec "${CONTAINER_NAME}" mongosh --quiet --eval "db.hello().isWritablePrimary" 2>/dev/null | grep -q "true"; do
    sleep 1
  done

  echo "MongoDB replica set rs0 is ready on port ${PORT}!"
  echo "Connection string: mongodb://127.0.0.1:${PORT}/unclassed_integration?replicaSet=rs0&directConnection=true"
}

stop_mongo() {
  check_docker
  echo "Stopping and removing ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  echo "Container removed."
}

status_mongo() {
  check_docker
  if docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} is running."
    docker exec "${CONTAINER_NAME}" mongosh --quiet --eval "rs.status().ok" 2>/dev/null || echo "Replica set not initiated"
  else
    echo "Container ${CONTAINER_NAME} is not running."
  fi
}

case "${1:-}" in
  start)
    start_mongo
    ;;
  stop)
    stop_mongo
    ;;
  status)
    status_mongo
    ;;
  *)
    usage
    ;;
esac
