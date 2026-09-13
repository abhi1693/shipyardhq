#!/usr/bin/env bash
set -euo pipefail

image=${1:?image reference required}
platform=${2:?platform required}
version=${3:?application version required}

docker run --rm --platform "$platform" --entrypoint /bin/sh \
  -e EXPECTED_APP_VERSION="$version" \
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
        const png = await sharp({create: {width: 1, height: 1, channels: 3, background: "white"}}).png().toBuffer();
        assert.equal((await sharp(png).metadata()).width, 1);
        assert.equal(typeof require("react-is").isFragment, "function");
        require("@datadog/pprof");
        require("@tailwindcss/oxide");
        await require("next/dist/build/swc").loadBindings();
        console.log("Native image, profiler, CSS, and SWC modules loaded");
      })().catch(error => { console.error(error); process.exitCode = 1; });
    '\''
    npm run prisma:generate
    NODE_ENV=test npm run test:ci -- tests/unit/historical-leaderboard-cache.test.ts
    scratch=$(mktemp -d)
    trap '\''rm -rf "$scratch"'\'' EXIT
    mkdir -p "$scratch/source/nested" "$scratch/restored"
    printf "artifact smoke test\n" > "$scratch/source/nested/file with spaces"
    (cd "$scratch/source" && find . -mindepth 1 -maxdepth 1 -print0 | tar --null --create --gzip --file "$scratch/artifact.tar.gz" --files-from -)
    tar --extract --gzip --file "$scratch/artifact.tar.gz" --directory "$scratch/restored" --no-same-owner --no-same-permissions --delay-directory-restore --touch
    cmp "$scratch/source/nested/file with spaces" "$scratch/restored/nested/file with spaces"
    find "$scratch/restored" -type f -print0 | sort -z | xargs -0 sha256sum
  '
