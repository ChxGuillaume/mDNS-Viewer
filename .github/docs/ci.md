# CI (`ci.yml`)

Runs on every PR and every push to `main`. Concurrent runs on the same ref cancel each other.

1. **check** (Ubuntu): `bun run lint` and `bun run typecheck`.
2. **build** (after check passes):

   | Runner | Output |
   | --- | --- |
   | `macos-latest` | universal `.app` / `.dmg` (Apple Silicon + Intel) |
   | `windows-latest` | NSIS `.exe`, `.msi` and an unsigned `.msix` (x64) |
   | `ubuntu-22.04` | `.deb`, `.rpm`, `.AppImage` (x64) |
   | `ubuntu-22.04-arm` | `.deb`, `.rpm`, `.AppImage` (arm64) |

   The bundles are attached to the run as workflow artifacts. CI builds aren't signed.

   The MSIX uses the `MSIX_*` repository variables if they're set, and placeholder values otherwise. It's there to catch packaging errors on every PR, not to be installed. See [Testing the MSIX locally](microsoft-store.md#testing-the-msix-locally).

CI needs no secrets.
