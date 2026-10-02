# Releasing (`release.yml`)

Push a tag that starts with `v`, matching the version in `package.json` (Tauri reads the version from there):

```sh
# bump "version" in package.json (and src-tauri/Cargo.toml), commit, then:
git tag v2.1.0
git push origin v2.1.0
```

Jobs:

1. **create-release**: fails if the tag doesn't match `package.json` (`v` + version), because Tauri names the files after the version in `package.json`. It then creates a **draft** release for the tag with auto-generated notes, or reuses the existing one on a re-run. Tags containing `-canary` (e.g. `v2.1.0-canary.1`) are marked as prereleases.
2. **build**: one job per target. Each uploads its bundles to the release:

   | Runner | Target |
   | --- | --- |
   | `macos-latest` | `aarch64-apple-darwin` (signed + notarized when the Apple secrets are set) |
   | `macos-latest` | `x86_64-apple-darwin` (same) |
   | `windows-latest` | x64 |
   | `ubuntu-22.04` | x64 |
   | `ubuntu-22.04-arm` | arm64 |

3. **publish-release**: once **every** build has succeeded, publishes the draft. If any build fails, the release stays a draft, so nobody sees a half-populated release. Fix the problem, re-run the failed jobs, and it gets published.
4. **mac-app-store**: calls [`mac-app-store.yml`](mac-app-store.md). It runs in parallel with `build`.
5. **microsoft-store**: calls [`microsoft-store.yml`](microsoft-store.md). It runs in parallel with `build`, and it doesn't touch the GitHub release.

## Release assets

For a `v2.1.0` tag, the release should contain roughly these files. GitHub replaces the space in `mDNS Viewer` with a dot.

| Platform | Files |
| --- | --- |
| macOS Apple Silicon | `mDNS.Viewer_2.1.0_aarch64.dmg`, `mDNS.Viewer_2.1.0_aarch64.app.tar.gz` |
| macOS Intel | `mDNS.Viewer_2.1.0_x64.dmg`, `mDNS.Viewer_2.1.0_x64.app.tar.gz` |
| Windows x64 | `mDNS.Viewer_2.1.0_x64-setup.exe` (NSIS), `mDNS.Viewer_2.1.0_x64_en-US.msi` |
| Linux x64 | `.deb`, `.rpm` and `.AppImage` (`amd64` / `x86_64`) |
| Linux arm64 | `.deb`, `.rpm` and `.AppImage` (`arm64` / `aarch64`) |

The exact file names come from Tauri's bundler. Check the first real release against this table.

Linux builds run on Ubuntu **22.04** on purpose. A binary only runs on systems whose glibc is at least as new as the one it was built against. Building on 22.04 keeps the `.deb`/`.rpm`/AppImage working on Ubuntu 22.04+, Debian 12 and similar distros. Building on 24.04 would require glibc 2.39.

The store jobs only run when **both** of these are true:

- the tag is stable (no `-canary`). Store version numbers must be plain `X.Y.Z`.
- the matching repository variable is set to `true`: `APP_STORE_ENABLED` or `MS_STORE_ENABLED` (*Settings → Secrets and variables → Actions → Variables*).

If a variable is unset, that store is skipped. You can merge the workflows before the store accounts are ready.

The store workflows get the repository secrets through `secrets: inherit`.

## Secrets for GitHub Release builds (optional)

Without these, the macOS builds are unsigned and not notarized, and users have to allow the app manually in Gatekeeper. Windows and Linux builds are never signed.

Set them all or none. The "Load Apple signing secrets" step only exports the secrets that have a value, because Tauri treats an empty `APPLE_CERTIFICATE` as set and fails trying to import it. If only some are set, e.g. a certificate without its password, signing is skipped or fails.

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | base64 of the **Developer ID Application** certificate exported as `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | password of that `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Guillaume Chx (TEAMID)` |
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | [app-specific password](https://support.apple.com/102654) for that Apple ID |
| `APPLE_TEAM_ID` | 10-character Team ID (Apple Developer → Membership) |

`GITHUB_TOKEN` is provided automatically. The workflow grants it `contents: write`.
