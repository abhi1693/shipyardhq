#!/usr/bin/env bash
set -Eeuo pipefail

KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
NPM_BIN="${NPM_BIN:-npm}"
NODE_BIN="${NODE_BIN:-node}"

KUBE_CONTEXT="${KUBE_CONTEXT:-}"
DB_SERVICE_NAMESPACE="${DB_SERVICE_NAMESPACE:-postgresql}"
DB_SERVICE="${DB_SERVICE:-postgresql-pooler-shipyardhq-rw}"
DB_SERVICE_PORT="${DB_SERVICE_PORT:-5432}"
DB_SECRET_NAMESPACE="${DB_SECRET_NAMESPACE:-shipyardhq}"
DB_SECRET="${DB_SECRET:-shipyardhq-postgresql}"
LOCAL_PORT="${LOCAL_PORT:-}"
PG_APPLICATION_NAME="${PG_APPLICATION_NAME:-shipyardhq-admin-insights-prod}"

print_usage() {
  cat <<EOF
Usage:
  npm run admin:prod -- [admin insights options]

Examples:
  npm run admin:prod
  npm run admin:prod -- --days 30 --limit 12
  npm run admin:prod -- --section traffic,operations
  npm run --silent admin:prod -- --json --days 14

Wrapper options:
  --context <name>       Kubernetes context. Defaults to current context.
  --local-port <port>    Local forwarded port. Defaults to a free local port.
  --help                 Show this help.

Environment overrides:
  KUBECTL_BIN            kubectl binary. Default: kubectl.
  NPM_BIN                npm binary. Default: npm.
  NODE_BIN               node binary. Default: node.
  KUBE_CONTEXT           Kubernetes context. Defaults to current context.
  DB_SERVICE_NAMESPACE   DB service namespace. Default: ${DB_SERVICE_NAMESPACE}.
  DB_SERVICE             DB service name. Default: ${DB_SERVICE}.
  DB_SERVICE_PORT        DB service port. Default: ${DB_SERVICE_PORT}.
  DB_SECRET_NAMESPACE    DB credentials secret namespace. Default: ${DB_SECRET_NAMESPACE}.
  DB_SECRET              DB credentials secret. Default: ${DB_SECRET}.
  LOCAL_PORT             Local forwarded port. Defaults to a free local port.
EOF
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
}

free_port() {
  "$NODE_BIN" <<'NODE'
const net = require("node:net")
const server = net.createServer()

server.listen(0, "127.0.0.1", () => {
  const address = server.address()
  if (!address || typeof address === "string") {
    process.exitCode = 1
    server.close()
    return
  }

  console.log(address.port)
  server.close()
})
NODE
}

secret_value() {
  local key="$1"
  local value

  value="$(
    "${kubectl_cmd[@]}" -n "$DB_SECRET_NAMESPACE" get secret "$DB_SECRET" \
      -o "jsonpath={.data.${key}}" | base64 -d
  )"

  if [[ -z "$value" ]]; then
    echo "Secret ${DB_SECRET_NAMESPACE}/${DB_SECRET} is missing key: ${key}" >&2
    exit 1
  fi

  printf "%s" "$value"
}

database_url() {
  DB_USER="$db_user" \
    DB_PASSWORD="$db_password" \
    DB_NAME="$db_name" \
    LOCAL_PORT="$LOCAL_PORT" \
    "$NODE_BIN" <<'NODE'
const {
  DB_NAME,
  DB_PASSWORD,
  DB_USER,
  LOCAL_PORT,
} = process.env

const url = new URL("postgresql://127.0.0.1")
url.username = DB_USER
url.password = DB_PASSWORD
url.port = LOCAL_PORT
url.pathname = `/${DB_NAME}`
url.searchParams.set("schema", "public")

console.log(url.toString())
NODE
}

wait_for_forward() {
  local attempts=80

  for _ in $(seq 1 "$attempts"); do
    if ! kill -0 "$port_forward_pid" >/dev/null 2>&1; then
      echo "kubectl port-forward exited before it became ready." >&2
      cat "$port_forward_log" >&2
      exit 1
    fi

    if timeout 1 bash -c ":</dev/tcp/127.0.0.1/${LOCAL_PORT}" >/dev/null 2>&1; then
      return 0
    fi

    sleep 0.1
  done

  echo "Timed out waiting for port-forward on 127.0.0.1:${LOCAL_PORT}." >&2
  cat "$port_forward_log" >&2
  exit 1
}

cleanup() {
  if [[ -n "${port_forward_pid:-}" ]]; then
    kill "$port_forward_pid" >/dev/null 2>&1 || true
    wait "$port_forward_pid" >/dev/null 2>&1 || true
  fi

  if [[ -n "${port_forward_log:-}" ]]; then
    rm -f "$port_forward_log"
  fi
}

admin_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --context)
      KUBE_CONTEXT="${2:-}"
      if [[ -z "$KUBE_CONTEXT" ]]; then
        echo "Missing value for --context" >&2
        exit 1
      fi
      shift 2
      ;;
    --local-port|--port)
      LOCAL_PORT="${2:-}"
      if [[ -z "$LOCAL_PORT" ]]; then
        echo "Missing value for --local-port" >&2
        exit 1
      fi
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      admin_args+=("$1")
      shift
      ;;
  esac
done

require_command "$KUBECTL_BIN"
require_command "$NPM_BIN"
require_command "$NODE_BIN"
require_command "base64"
require_command "timeout"

if [[ -z "$LOCAL_PORT" ]]; then
  LOCAL_PORT="$(free_port)"
fi

kubectl_cmd=("$KUBECTL_BIN")
if [[ -n "$KUBE_CONTEXT" ]]; then
  kubectl_cmd+=("--context" "$KUBE_CONTEXT")
fi

db_name="$(secret_value dbname)"
db_user="$(secret_value username)"
db_password="$(secret_value password)"
resolved_database_url="$(database_url)"

port_forward_log="$(mktemp -t shipyardhq-prod-insights-port-forward.XXXXXX.log)"
trap cleanup EXIT INT TERM

"${kubectl_cmd[@]}" -n "$DB_SERVICE_NAMESPACE" port-forward \
  "svc/${DB_SERVICE}" "${LOCAL_PORT}:${DB_SERVICE_PORT}" \
  >"$port_forward_log" 2>&1 &
port_forward_pid="$!"

wait_for_forward

echo "Running admin insights against prod DB via ${DB_SERVICE_NAMESPACE}/${DB_SERVICE}." >&2

DATABASE_URL="$resolved_database_url" \
  DIRECT_DATABASE_URL="$resolved_database_url" \
  PG_APPLICATION_NAME="$PG_APPLICATION_NAME" \
  "$NPM_BIN" run --silent admin:insights -- "${admin_args[@]}"
