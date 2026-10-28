#!/usr/bin/env bash
set -Eeuo pipefail

image=${1:?image reference required}
platform=${2:?platform required}
version=${3:?application version required}
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source_version=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$repo/release.json")
next_version=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["packages"]["node_modules/next"]["version"])' "$repo/package-lock.json")
[[ "$version" == "$source_version" ]] || { echo 'Release/source version mismatch' >&2; exit 1; }
case "$(uname -m)" in
  x86_64) native=linux/amd64 ;;
  aarch64|arm64) native=linux/arm64 ;;
  *) echo 'Unsupported native architecture' >&2; exit 1 ;;
esac
[[ "$platform" == "$native" ]] || { echo 'Smoke requires a native image' >&2; exit 1; }
[[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$image")" == "$version" ]]

docker run --rm --platform "$platform" --network none --entrypoint /bin/sh \
  -e EXPECTED_APP_VERSION="$version" \
  -e EXPECTED_NEXT_VERSION="$next_version" \
  -e DATABASE_URL=postgresql://smoke:smoke@127.0.0.1:1/smoke \
  "$image" -ec '
    test "$(id -u)" = 1001
    test "$APP_VERSION" = "$EXPECTED_APP_VERSION"
    node --version
    npm --version
    openssl version
    tar --version
    node -e '\''
      const assert = require("node:assert/strict");
      (async () => {
        const sharp = require("sharp");
        assert.equal(process.versions.node, "26.12.1");
        assert.equal(require("next/package.json").version, process.env.EXPECTED_NEXT_VERSION);
        assert.equal(require("/usr/local/lib/node_modules/npm/node_modules/brace-expansion/package.json").version, "5.0.12");
        assert.equal(require("/usr/local/lib/node_modules/npm/node_modules/undici/package.json").version, "6.29.1");
        assert.equal(require("/usr/local/lib/node_modules/npm/node_modules/http-cache-semantics/package.json").version, "4.3.0");
        for (const packageName of ["eslint-config-next", "@next/eslint-plugin-next", "fast-glob", "micromatch", "braces"]) {
          assert.throws(() => require.resolve(`${packageName}/package.json`), { code: "MODULE_NOT_FOUND" });
        }
        const png = await sharp({create: {width: 1, height: 1, channels: 3, background: "white"}}).png().toBuffer();
        assert.equal((await sharp(png).metadata()).width, 1);
        const webp = await sharp(png).webp().toBuffer();
        assert.equal((await sharp(webp).metadata()).format, "webp");
        assert.equal(webp.subarray(0, 4).toString(), "RIFF");
        assert.equal(webp.subarray(8, 12).toString(), "WEBP");
        assert.equal(typeof require("react-is").isFragment, "function");
        require("@datadog/pprof");
        require("@tailwindcss/oxide");
        await require("next/dist/build/swc").loadBindings();
        console.log("Native image, profiler, CSS, and SWC modules loaded");
      })().catch(error => { console.error(error); process.exitCode = 1; });
    '\''
    npm run prisma:generate
    NODE_ENV=test node node_modules/vitest/vitest.mjs run tests/unit/historical-leaderboard-cache.test.ts tests/unit/products-api-route.test.ts
    scratch=$(mktemp -d)
    trap '\''rm -rf "$scratch"'\'' EXIT
    mkdir -p "$scratch/source/nested" "$scratch/restored"
    printf "artifact smoke test\n" > "$scratch/source/nested/file with spaces"
    (cd "$scratch/source" && find . -mindepth 1 -maxdepth 1 -print0 | tar --null --create --gzip --file "$scratch/artifact.tar.gz" --files-from -)
    tar --extract --gzip --file "$scratch/artifact.tar.gz" --directory "$scratch/restored" --no-same-owner --no-same-permissions --delay-directory-restore --touch
    cmp "$scratch/source/nested/file with spaces" "$scratch/restored/nested/file with spaces"
    find "$scratch/restored" -type f -print0 | sort -z | xargs -0 sha256sum
  '

# All writes and credentials below belong only to disposable Docker fixtures.
# The internal network has no external egress and no database port is published.
network=''
database=''
application=''
fixtures=$(mktemp -d)
cleanup() {
  status=$?
  if [[ -n "$application" ]]; then
    if [[ "$status" != 0 ]]; then docker logs --tail 100 "$application" >&2 || true; fi
    docker rm -f "$application" >/dev/null || true
  fi
  [[ -z "$database" ]] || docker rm -f "$database" >/dev/null || true
  [[ -z "$network" ]] || docker network rm "$network" >/dev/null || true
  rm -rf -- "$fixtures"
  exit "$status"
}
trap cleanup EXIT
network=$(docker network create --internal "shipyard-smoke-$$-$RANDOM")
database=$(docker run -d --rm --network "$network" --network-alias fixture-db \
  -e POSTGRES_USER=smoke -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=shipyard_smoke \
  postgres:17-alpine)
ready=false
for _ in {1..60}; do
  if docker exec "$database" pg_isready -U smoke -d shipyard_smoke >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo 'Disposable database did not become ready' >&2; exit 1; }

# Clerk publishable keys encode a public hostname, never a credential. Build
# this disposable example-host fixture from its documented public components.
fixture_clerk_public="pk_test_$(printf '%s' 'example.com$' | base64 | tr -d '\n')"
fixture_env=(
  -e DATABASE_URL=postgresql://smoke:smoke@fixture-db:5432/shipyard_smoke
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$fixture_clerk_public"
  -e CLERK_SECRET_KEY=sk_test_ci_fixture_only
  -e DODO_ENV=test_mode
  -e DODO_API_KEY=ci_fixture_only
  -e PRODUCTS_API_TOKEN=ci-runtime-only
  -e PRODUCTS_API_PLAN_ID=smoke-plan
  -e PRODUCT_PRERENDER_LIMIT=2
  -e USE_CASE_PRERENDER_LIMIT=1
  -e NEXT_STATIC_GENERATION_MAX_CONCURRENCY=2
  -e HOSTNAME=0.0.0.0 -e PORT=3000
)
docker run --rm --network "$network" --entrypoint /bin/sh "${fixture_env[@]}" "$image" \
  -ec 'npm run prisma:generate && npm run prisma:deploy'
docker exec -i "$database" psql -v ON_ERROR_STOP=1 -U smoke -d shipyard_smoke \
  < "$repo/scripts/ci/runtime-smoke.sql"
docker run --rm --network none --entrypoint node "$image" -e \
  'require("sharp")({create:{width:32,height:32,channels:3,background:"#12734a"}}).png().toBuffer().then(b=>process.stdout.write(b)).catch(e=>{console.error(e);process.exit(1)})' \
  > "$fixtures/runtime-smoke.png"
chmod 644 "$fixtures/runtime-smoke.png"
application=$(docker run -d --network "$network" \
  --mount "type=bind,src=$fixtures/runtime-smoke.png,dst=/app/public/runtime-smoke.png,readonly" \
  --entrypoint /bin/sh "${fixture_env[@]}" "$image" \
  -ec 'npm run prisma:generate && npm run build && exec node .next/standalone/server.js')
# Docker's internal networks deliberately omit port publication. The native Linux
# runner reaches its own private bridge address; no host/external port is opened.
address=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$application")
[[ "$address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Missing private smoke network address' >&2; exit 1; }
python3 "$repo/scripts/ci/assert-runtime-http.py" "http://$address:3000" "$application"
echo "Native Shipyard runtime smoke passed: app=$version Node=26.12.1 Next=$next_version platform=$platform uid=1001"
