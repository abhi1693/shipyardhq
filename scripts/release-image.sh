#!/usr/bin/env bash
set -Eeuo pipefail

DOCKER_BIN="${DOCKER_BIN:-docker}"
GIT_BIN="${GIT_BIN:-git}"
IMAGE="${IMAGE:-ghcr.io/abhi1693/shipyardhq}"
PLATFORM="${PLATFORM:-linux/arm64}"
PUSH="${PUSH:-true}"
TAG_LATEST="${TAG_LATEST:-true}"
LATEST_TAG="${LATEST_TAG:-latest}"
CHECKOUT_RELEASE="${CHECKOUT_RELEASE:-true}"
BUILDER="${BUILDER:-}"

release_tag=""
image_tag=""
release_worktree=""
tag_commit=""

print_usage() {
  cat <<EOF
Usage:
  scripts/release-image.sh <release-tag> [options]

Examples:
  scripts/release-image.sh v1.4.69
  scripts/release-image.sh v1.4.69 --image ghcr.io/abhi1693/shipyardhq
  scripts/release-image.sh v1.4.69 --no-push --load

Options:
  --image <name>       Registry image. Default: ${IMAGE}
  --platform <value>   Build platform. Default: ${PLATFORM}
  --image-tag <tag>    Image version tag. Defaults to release tag without leading "v".
  --no-latest          Do not tag/push the image as "${LATEST_TAG}".
  --latest-tag <tag>   Latest tag name. Default: ${LATEST_TAG}
  --no-push            Build without pushing.
  --load               Load the image into the local Docker daemon. Only valid with --no-push.
  --no-checkout        Build the current working tree instead of the release tag.
  --builder <name>     buildx builder name to use.
  --help               Show this help.

Environment overrides:
  DOCKER_BIN           Docker binary. Default: docker.
  GIT_BIN              Git binary. Default: git.
  IMAGE                Registry image. Default: ${IMAGE}.
  PLATFORM             Build platform. Default: ${PLATFORM}.
  PUSH                 Push after build. Default: ${PUSH}.
  TAG_LATEST           Also tag latest. Default: ${TAG_LATEST}.
  LATEST_TAG           Latest tag name. Default: ${LATEST_TAG}.
  CHECKOUT_RELEASE     Build from the release git tag. Default: ${CHECKOUT_RELEASE}.
  BUILDER              buildx builder name.

Before pushing to GHCR:
  gh auth token | docker login ghcr.io -u "\$(gh api user --jq .login)" --password-stdin
EOF
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
}

cleanup() {
  if [[ -n "$release_worktree" && -d "$release_worktree" ]]; then
    "$GIT_BIN" worktree remove --force "$release_worktree" >/dev/null 2>&1 ||
      rm -rf "$release_worktree"
  fi
}

trap cleanup EXIT

option_value() {
  local option_name="$1"
  local option_value="${2:-}"

  if [[ -z "$option_value" || "$option_value" == --* ]]; then
    echo "${option_name} requires a value." >&2
    exit 1
  fi

  printf "%s" "$option_value"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="$(option_value "$1" "${2:-}")"
      shift 2
      ;;
    --platform)
      PLATFORM="$(option_value "$1" "${2:-}")"
      shift 2
      ;;
    --image-tag)
      image_tag="$(option_value "$1" "${2:-}")"
      shift 2
      ;;
    --no-latest)
      TAG_LATEST="false"
      shift
      ;;
    --latest-tag)
      LATEST_TAG="$(option_value "$1" "${2:-}")"
      shift 2
      ;;
    --no-push)
      PUSH="false"
      shift
      ;;
    --load)
      LOAD_IMAGE="true"
      shift
      ;;
    --no-checkout)
      CHECKOUT_RELEASE="false"
      shift
      ;;
    --builder)
      BUILDER="$(option_value "$1" "${2:-}")"
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      print_usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$release_tag" ]]; then
        echo "Unexpected argument: $1" >&2
        print_usage >&2
        exit 1
      fi
      release_tag="$1"
      shift
      ;;
  esac
done

LOAD_IMAGE="${LOAD_IMAGE:-false}"

if [[ -z "$release_tag" ]]; then
  echo "Missing release tag." >&2
  print_usage >&2
  exit 1
fi

if [[ -z "$IMAGE" || -z "$PLATFORM" || -z "$LATEST_TAG" ]]; then
  echo "IMAGE, PLATFORM, and LATEST_TAG must be non-empty." >&2
  exit 1
fi

if [[ "$PUSH" != "true" && "$PUSH" != "false" ]]; then
  echo "PUSH must be true or false." >&2
  exit 1
fi

if [[ "$TAG_LATEST" != "true" && "$TAG_LATEST" != "false" ]]; then
  echo "TAG_LATEST must be true or false." >&2
  exit 1
fi

if [[ "$LOAD_IMAGE" != "true" && "$LOAD_IMAGE" != "false" ]]; then
  echo "LOAD_IMAGE must be true or false." >&2
  exit 1
fi

if [[ "$CHECKOUT_RELEASE" != "true" && "$CHECKOUT_RELEASE" != "false" ]]; then
  echo "CHECKOUT_RELEASE must be true or false." >&2
  exit 1
fi

if [[ "$LOAD_IMAGE" == "true" && "$PUSH" == "true" ]]; then
  echo "--load is only valid with --no-push." >&2
  exit 1
fi

if [[ -z "$image_tag" ]]; then
  image_tag="${release_tag#v}"
fi

require_command "$DOCKER_BIN"

context_dir="."

if [[ "$CHECKOUT_RELEASE" == "true" ]]; then
  require_command "$GIT_BIN"

  tag_commit="$(
    "$GIT_BIN" rev-parse --verify --quiet "refs/tags/${release_tag}^{commit}" ||
      true
  )"

  if [[ -z "$tag_commit" ]]; then
    if "$GIT_BIN" remote get-url origin >/dev/null 2>&1; then
      "$GIT_BIN" fetch --tags origin
    fi

    tag_commit="$(
      "$GIT_BIN" rev-parse --verify --quiet "refs/tags/${release_tag}^{commit}" ||
        true
    )"
  fi

  if [[ -z "$tag_commit" ]]; then
    echo "Release tag not found: ${release_tag}" >&2
    exit 1
  fi

  safe_release_tag="${release_tag//[^A-Za-z0-9_.-]/-}"
  release_worktree="$(
    mktemp -d "${TMPDIR:-/tmp}/shipyardhq-release-${safe_release_tag}.XXXXXX"
  )"
  rmdir "$release_worktree"
  "$GIT_BIN" worktree add --detach "$release_worktree" "$tag_commit"
  context_dir="$release_worktree"
elif command -v "$GIT_BIN" >/dev/null 2>&1; then
  tag_commit="$("$GIT_BIN" rev-parse --verify --quiet HEAD || true)"
fi

if ! "$DOCKER_BIN" buildx version >/dev/null 2>&1; then
  echo "Docker buildx is required." >&2
  exit 1
fi

build_args=(
  buildx
  build
  --platform "$PLATFORM"
  --build-arg "APP_VERSION=$release_tag"
  --label "org.opencontainers.image.source=https://github.com/abhi1693/shipyardhq"
  --label "org.opencontainers.image.title=shipyardhq"
  --label "org.opencontainers.image.version=$release_tag"
  --tag "$IMAGE:$image_tag"
)

if [[ -n "$tag_commit" ]]; then
  build_args+=(--label "org.opencontainers.image.revision=$tag_commit")
fi

if [[ "$TAG_LATEST" == "true" ]]; then
  build_args+=(--tag "$IMAGE:$LATEST_TAG")
fi

if [[ -n "$BUILDER" ]]; then
  build_args+=(--builder "$BUILDER")
fi

if [[ "$PUSH" == "true" ]]; then
  build_args+=(--push)
elif [[ "$LOAD_IMAGE" == "true" ]]; then
  build_args+=(--load)
fi

build_args+=("$context_dir")

echo "Building ${IMAGE}:${image_tag} for ${PLATFORM}"
if [[ "$CHECKOUT_RELEASE" == "true" ]]; then
  echo "Using release tag ${release_tag} at ${tag_commit}"
fi
if [[ "$TAG_LATEST" == "true" ]]; then
  echo "Also tagging ${IMAGE}:${LATEST_TAG}"
fi
if [[ "$PUSH" == "true" ]]; then
  echo "Pushing image tags to registry"
else
  echo "Push disabled"
fi

"$DOCKER_BIN" "${build_args[@]}"
