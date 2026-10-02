# CI / CD

GitHub Actions setup for building mDNS Viewer and publishing it to GitHub Releases, the Mac App Store and the Microsoft Store.

## Overview

| File                                                       | Trigger                               | What it does                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`workflows/ci.yml`](docs/ci.md)                           | push to `main`, pull requests, manual | Lint, typecheck, and a build on every platform (no publishing)                                                  |
| [`workflows/release.yml`](docs/releasing.md)               | push of a `v*` tag                    | Creates the GitHub release, builds and uploads installers, then calls the store workflows                       |
| [`workflows/mac-app-store.yml`](docs/mac-app-store.md)     | called by `release.yml`, or manual    | Builds a sandboxed universal `.app`, packages it as a signed `.pkg`, uploads it to App Store Connect            |
| [`workflows/microsoft-store.yml`](docs/microsoft-store.md) | called by `release.yml`, or manual    | Builds an MSIX package and uploads it to Partner Center                                                         |
| [`workflows/doctor.yml`](docs/doctor.md)                   | weekly (Monday 06:00 UTC), manual     | Checks that the secrets, certificates and credentials the workflows use are valid                               |
| [`scripts/doctor.sh`](docs/doctor.md)                      | `bun run doctor`                      | Checks the repository files and versions the workflows rely on, and which secrets and variables are set         |
| [`scripts/bump-version.ts`](docs/releasing.md)             | `bun run bump`, CI                    | Prints the next release tag. In CI it also checks the tag and writes its version into the files before building |
| `actions/setup`                                            | composite action                      | Linux system deps, Bun, Rust (+ targets), Rust cache, `bun install`, and the app version when one is given      |
| `actions/determine-build-env`                              | composite action                      | Outputs `canary` if the tag contains `-canary`, otherwise `stable`                                              |
| `actions/package-msix`                                     | composite action                      | Wraps the compiled Windows `.exe` into an `.msix` with the Windows SDK's `MakeAppx`                             |
| `actions/import-apple-certs`                               | composite action                      | Creates a temporary keychain and imports base64 `.p12` certificates into it                                     |

Builds use [`tauri-apps/tauri-action@v1`](https://github.com/tauri-apps/tauri-action). It only handles building and GitHub Releases, so the store uploads use Apple's `xcrun` tools and the [Microsoft Store Developer CLI](https://learn.microsoft.com/windows/apps/publish/msstore-dev-cli/overview) (`msstore`).

## Guides

- [CI](docs/ci.md): what runs on every pull request
- [Releasing](docs/releasing.md): cutting a release, the expected assets, and the optional macOS signing secrets
- [Mac App Store](docs/mac-app-store.md): Apple setup, secrets, and things to know before submitting
- [Microsoft Store](docs/microsoft-store.md): Partner Center setup, secrets and variables, and testing the MSIX locally
- [Workflow doctor](docs/doctor.md): checking that everything above is set up correctly

## Upgrading actions

| Action                                   | Pinned to           |
| ---------------------------------------- | ------------------- |
| `actions/checkout`                       | `v7`                |
| `tauri-apps/tauri-action`                | `v1` (Tauri 2 only) |
| `oven-sh/setup-bun`                      | `v2`                |
| `dtolnay/rust-toolchain`                 | `stable`            |
| `swatinem/rust-cache`                    | `v2`                |
| `actions/upload-artifact`                | `v7`                |
| `microsoft/microsoft-store-apppublisher` | `v1.4`              |

To check changes to the workflows locally, run `bun run doctor`. Among other checks, it runs [`actionlint`](https://github.com/rhysd/actionlint) (`brew install actionlint`).
