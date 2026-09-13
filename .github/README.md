# Repository automation

Common CI and image mechanics are maintained in [abhi1693/actions](https://github.com/abhi1693/actions).
Workflows use the released `@v1` reference for centrally maintained compatible updates.
See the [shared release history](https://github.com/abhi1693/actions/releases) for changes.
Repository-owned scripts, triggers, scanner exceptions and application smoke checks
remain alongside the application. Image manifests declare components rather than
copying workflow steps.

The image manifest runs `scripts/ci/smoke-image.sh` on the native ARM64 runner
after the security scan. It checks native modules, Prisma generation, cache
retention, and the GNU tar flags used by Fleet. Image scans continue to block
high and critical findings, including those without fixes.

GitHub attestation storage is disabled because this is a user-owned private
repository, which GitHub does not support for that feature. BuildKit provenance
and SBOM attestations remain attached to the image; vulnerability/secret scans
and native smoke tests remain blocking publication gates.
