"""Check publication/version boundaries without invoking Docker or a registry."""

import json
import os
import pathlib
import re
import textwrap
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "release-image.sh"


class ReleaseContract(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="shipyard-release-contract-")
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)
        self.calls = self.root / "docker-calls.jsonl"
        docker = self.root / "docker"
        docker.write_text(
            "#!/usr/bin/env python3\nimport json,os,sys\n"
            "with open(os.environ['SMOKE_DOCKER_CALLS'],'a') as f: "
            "f.write(json.dumps(sys.argv[1:])+'\\n')\n"
        )
        docker.chmod(0o755)
        self.environment = {
            **os.environ,
            "DOCKER_BIN": str(docker),
            "SMOKE_DOCKER_CALLS": str(self.calls),
            "PUSH": "true",
            "TAG_LATEST": "false",
            "CHECKOUT_RELEASE": "false",
        }
        (self.root / "release.json").write_text('{"version":"1.5.41"}\n')

    def run_script(self, *args):
        result = subprocess.run(
            ["bash", str(SCRIPT), *args],
            cwd=self.root,
            env=self.environment,
            capture_output=True,
            text=True,
            timeout=10,
        )
        calls = [json.loads(line) for line in self.calls.read_text().splitlines()] if self.calls.exists() else []
        return result, calls

    def test_publication_fails_before_docker(self):
        result, calls = self.run_script("1.5.41")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Container Image", result.stderr)
        self.assertEqual(calls, [])

    def test_local_build_normalizes_version_without_publishing(self):
        result, calls = self.run_script("v1.5.41", "--no-push", "--load")
        self.assertEqual(result.returncode, 0, result.stderr)
        build = next(call for call in calls if call[:2] == ["buildx", "build"])
        self.assertIn("APP_VERSION=1.5.41", build)
        self.assertIn("org.opencontainers.image.version=1.5.41", build)
        self.assertIn("--load", build)
        self.assertNotIn("--push", build)

    def test_source_version_mismatch_never_builds(self):
        result, calls = self.run_script("1.5.42", "--no-push", "--load")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must agree", result.stderr)
        self.assertFalse(any(call[:2] == ["buildx", "build"] for call in calls))

    def test_image_tag_mismatch_never_builds(self):
        result, calls = self.run_script("1.5.41", "--no-push", "--image-tag", "1.5.42")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(call[:2] == ["buildx", "build"] for call in calls))

    def test_historical_source_stays_locally_buildable(self):
        (self.root / "release.json").unlink()
        result, calls = self.run_script("1.5.40", "--no-push", "--load")
        self.assertEqual(result.returncode, 0, result.stderr)
        build = next(call for call in calls if call[:2] == ["buildx", "build"])
        self.assertIn("APP_VERSION=1.5.40", build)
        self.assertNotIn("--push", build)


class WorkflowReleaseIdentity(unittest.TestCase):
    """Execute the actual workflow shell against disposable Git histories."""

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="shipyard-tag-contract-")
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)
        workflow = (SCRIPT.parents[1] / ".github/workflows/container.yml").read_text()
        job = workflow.split("  release-identity:\n", 1)[1].split("  images:\n", 1)[0]
        body = re.search(r"(?m)^        run: \|\n((?:          .*\n)+)", job)
        self.assertIsNotNone(body)
        self.shell = textwrap.dedent(body[1])
        self.git("init", "-q", "-b", "master")
        self.git("config", "user.name", "Synthetic fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        (self.root / "release.json").write_text('{"version":"1.5.41"}\n')
        self.git("add", ".")
        self.git("commit", "-qm", "Synthetic release source")
        self.head = self.git("rev-parse", "HEAD").strip()
        self.git("tag", "1.5.41")
        self.git("tag", "v1.5.41")

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.root, text=True)

    def guard(self, **changes):
        environment = os.environ | {
            "GITHUB_REF_TYPE": "tag", "GITHUB_REF_NAME": "1.5.41",
            "GITHUB_SHA": self.head, "REQUESTED_VERSION": "1.5.41",
        } | changes
        return subprocess.run(["bash", "-euc", self.shell], cwd=self.root,
                              env=environment, capture_output=True,
                              text=True, timeout=10).returncode

    def test_matching_source_tag_and_optional_v_prefix_pass(self):
        self.assertEqual(self.guard(), 0)
        self.assertEqual(self.guard(GITHUB_REF_NAME="v1.5.41", REQUESTED_VERSION=""), 0)

    def test_moving_master_and_main_fail(self):
        for branch in ("master", "main"):
            with self.subTest(branch=branch):
                self.assertNotEqual(self.guard(GITHUB_REF_TYPE="branch", GITHUB_REF_NAME=branch), 0)

    def test_wrong_tag_or_requested_version_fails(self):
        self.assertNotEqual(self.guard(GITHUB_REF_NAME="1.5.42"), 0)
        self.assertNotEqual(self.guard(REQUESTED_VERSION="1.5.42"), 0)

    def test_tag_source_and_head_must_match_workflow_sha(self):
        self.assertNotEqual(self.guard(GITHUB_SHA="0" * 40), 0)
        (self.root / "later.txt").write_text("Synthetic later source with same version\n")
        self.git("add", ".")
        self.git("commit", "-qm", "Synthetic later source")
        later = self.git("rev-parse", "HEAD").strip()
        self.assertNotEqual(self.guard(), 0)
        self.assertNotEqual(self.guard(GITHUB_SHA=later), 0)


if __name__ == "__main__":
    unittest.main()
