# CI / CD

GitHub Actions setup for building mDNS Viewer and publishing it to GitHub Releases, the Mac App Store and the Microsoft Store.

## Overview

| File | Trigger | What it does |
| --- | --- | --- |
| `workflows/ci.yml` | push to `main`, pull requests, manual | Lint, typecheck, and a build on every platform (no publishing) |
| `workflows/release.yml` | push of a `v*` tag | Creates the GitHub release, builds and uploads installers, then calls the store workflows |
| `workflows/mac-app-store.yml` | called by `release.yml`, or manual | Builds a sandboxed universal `.app`, packages it as a signed `.pkg`, uploads it to App Store Connect |
| `workflows/microsoft-store.yml` | called by `release.yml`, or manual | Builds an offline NSIS installer, attaches it to the release, submits it to Partner Center |
| `actions/setup` | composite action | Linux system deps, Bun, Rust (+ targets), Rust cache, `bun install` |
| `actions/determine-build-env` | composite action | Outputs `canary` if the tag contains `-canary`, otherwise `stable` |

Builds use [`tauri-apps/tauri-action@v1`](https://github.com/tauri-apps/tauri-action). It only handles building and GitHub Releases, so the store uploads use Apple's `xcrun` tools and the [Microsoft Store Developer CLI](https://learn.microsoft.com/windows/apps/publish/msstore-dev-cli/overview) (`msstore`).

## CI (`ci.yml`)

Runs on every PR and every push to `main`. Concurrent runs on the same ref cancel each other.

1. **check** (Ubuntu): `bun run lint` and `bun run typecheck`.
2. **build** (after check passes):

   | Runner | Output |
   | --- | --- |
   | `macos-latest` | universal `.app` / `.dmg` (Apple Silicon + Intel) |
   | `windows-latest` | NSIS `.exe` and `.msi` (x64) |
   | `ubuntu-22.04` | `.deb`, `.rpm`, `.AppImage` (x64) |
   | `ubuntu-22.04-arm` | `.deb`, `.rpm`, `.AppImage` (arm64) |

   The bundles are attached to the run as workflow artifacts. CI builds aren't signed.

CI needs no secrets.

## Releasing (`release.yml`)

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
4. **mac-app-store**: calls `mac-app-store.yml`. It runs in parallel with `build`.
5. **microsoft-store**: calls `microsoft-store.yml` after `publish-release`. The Store downloads the installer from its public URL, so the release must be published first.

### Release assets

For a `v2.1.0` tag, the release should contain roughly these files. GitHub replaces the space in `mDNS Viewer` with a dot.

| Platform | Files |
| --- | --- |
| macOS Apple Silicon | `mDNS.Viewer_2.1.0_aarch64.dmg`, `mDNS.Viewer_2.1.0_aarch64.app.tar.gz` |
| macOS Intel | `mDNS.Viewer_2.1.0_x64.dmg`, `mDNS.Viewer_2.1.0_x64.app.tar.gz` |
| Windows x64 | `mDNS.Viewer_2.1.0_x64-setup.exe` (NSIS), `mDNS.Viewer_2.1.0_x64_en-US.msi` |
| Linux x64 | `.deb`, `.rpm` and `.AppImage` (`amd64` / `x86_64`) |
| Linux arm64 | `.deb`, `.rpm` and `.AppImage` (`arm64` / `aarch64`) |
| Microsoft Store job | `mDNS-Viewer_2.1.0_x64_store-setup.exe` (offline WebView2 installer, only when the Store job runs) |

The exact file names come from Tauri's bundler. Check the first real release against this table.

Linux builds run on Ubuntu **22.04** on purpose. A binary only runs on systems whose glibc is at least as new as the one it was built against. Building on 22.04 keeps the `.deb`/`.rpm`/AppImage working on Ubuntu 22.04+, Debian 12 and similar distros. Building on 24.04 would require glibc 2.39.

The store jobs only run when **both** of these are true:

- the tag is stable (no `-canary`). Store version numbers must be plain `X.Y.Z`.
- the matching repository variable is set to `true`: `APP_STORE_ENABLED` or `MS_STORE_ENABLED` (*Settings → Secrets and variables → Actions → Variables*).

If a variable is unset, that store is skipped. You can merge the workflows before the store accounts are ready.

The store workflows get the repository secrets through `secrets: inherit`.

### Secrets for GitHub Release builds (optional)

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

## Mac App Store (`mac-app-store.yml`)

### What it does

1. Creates a temporary keychain and imports the **Apple Distribution** and **Mac Installer Distribution** certificates.
2. Writes the provisioning profile to `src-tauri/embedded.provisionprofile` (gitignored). Replaces `__TEAM_ID__` in `src-tauri/Entitlements.appstore.plist` with your Team ID.
3. Builds a universal `.app` with `tauri.appstore.conf.json` merged on top of the main config. This adds the sandbox entitlements, embeds the profile, and sets the minimum macOS version to 11.0.
4. Wraps the `.app` in a signed installer package with `xcrun productbuild`.
5. Uploads the `.pkg` to App Store Connect with `xcrun altool` and an App Store Connect API key.

After the upload, the build shows up in App Store Connect → TestFlight after processing (usually 5–30 min). From there you pick it for a version and submit for review yourself. The workflow doesn't submit for review.

### One-time setup (Apple side)

Requires a paid [Apple Developer Program](https://developer.apple.com/programs/) membership.

1. **App ID**: in *Certificates, Identifiers & Profiles → Identifiers*, register an explicit App ID for `dev.guillaumechx.mdns-viewer` (platform macOS).
2. **Certificates**: in *Certificates*, create both of these (each needs a CSR from Keychain Access → Certificate Assistant):
   - **Apple Distribution** signs the `.app`.
   - **Mac Installer Distribution** signs the `.pkg`. It shows up in Keychain as `3rd Party Mac Developer Installer: …`.

   Install both, then in Keychain Access select the two certificates with their private keys and export them together as one `.p12`. Alternatively, export them as two separate `.p12` files with the same password.
3. **Provisioning profile**: in *Profiles*, create a **Mac App Store Connect** profile (Distribution → Mac App Store) for the App ID and the Apple Distribution certificate. Download it.
4. **App record**: in [App Store Connect](https://appstoreconnect.apple.com) → *Apps → +*, create a macOS app with that bundle ID. Fill in the listing, screenshots, privacy details, pricing, etc.
5. **API key**: in App Store Connect → *Users and Access → Integrations → App Store Connect API*, create a key with the **App Manager** role. Download the `.p8` (you can only download it once). Note the **Key ID** and the **Issuer ID**.

### Secrets

| Secret | Value |
| --- | --- |
| `APPLE_TEAM_ID` | 10-character Team ID (shared with the release builds) |
| `APPSTORE_APP_CERTIFICATE` | `base64 -i apple-distribution.p12` |
| `APPSTORE_INSTALLER_CERTIFICATE` | `base64 -i mac-installer-distribution.p12` (can be the same combined `.p12`) |
| `APPSTORE_CERTIFICATE_PASSWORD` | password of the `.p12` file(s). Both must use the same one |
| `APPSTORE_APP_SIGNING_IDENTITY` | e.g. `Apple Distribution: Guillaume Chx (TEAMID)` |
| `APPSTORE_INSTALLER_SIGNING_IDENTITY` | e.g. `3rd Party Mac Developer Installer: Guillaume Chx (TEAMID)` |
| `APPSTORE_PROVISIONING_PROFILE` | `base64 -i mDNS_Viewer_App_Store.provisionprofile` |
| `APPLE_API_KEY_ID` | App Store Connect API Key ID |
| `APPLE_API_ISSUER` | App Store Connect Issuer ID (UUID) |
| `APPLE_API_KEY` | full contents of the `AuthKey_XXXX.p8` file, including the `BEGIN`/`END` lines |

Variable: `APP_STORE_ENABLED=true`.

To find the exact identity names, run `security find-identity -v` on your Mac after installing the certificates.

### Related files

| File | Purpose |
| --- | --- |
| `src-tauri/tauri.appstore.conf.json` | Config overlay for App Store builds (entitlements, embedded profile, minimum macOS 11.0) |
| `src-tauri/Entitlements.appstore.plist` | App Sandbox + outgoing and incoming network access (mDNS listens on UDP 5353); the `__TEAM_ID__` placeholder is filled in by CI |
| `src-tauri/Info.plist` | Merged into **every** macOS build: declares no non-exempt encryption (App Store Connect export compliance) and the Local Network permission message |

### Things to know

- **Build numbers must increase.** App Store Connect rejects an upload whose version already exists, so each store upload needs a new `package.json` version. To re-run a tag that has already been uploaded, you have to bump the version.
- **Test the sandboxed build before the first submission.** mDNS discovery uses raw multicast sockets. The network client and server entitlements should allow this, but check it on a real machine (macOS asks for Local Network permission on first launch).
- **`altool`**: the upload uses `xcrun altool --upload-app`, as in Tauri's docs. If Apple removes it from Xcode on the runner, switch this step to Transporter (`xcrun iTMSTransporter`).
- **Local App Store build**, to test signing/sandboxing:

  ```sh
  bun run tauri build --target universal-apple-darwin --bundles app --config src-tauri/tauri.appstore.conf.json
  ```

  This needs `src-tauri/embedded.provisionprofile` and the `__TEAM_ID__` placeholders replaced. Don't commit either.

## Microsoft Store (`microsoft-store.yml`)

### What it does

Tauri doesn't produce MSIX packages, so the app is listed as an **MSI/EXE (Win32) app**. For that kind of app, the Store downloads the installer from a URL you provide, instead of you uploading a file.

1. Builds an NSIS installer with `tauri.microsoftstore.conf.json` merged in. This bundles the **WebView2 offline installer**, as the Store requires, so the installer is roughly 150 MB larger than the regular one.
2. Uploads it to the GitHub release as `mDNS-Viewer_<version>_x64_store-setup.exe`. It sits next to the regular installer, so the GitHub download stays small.
3. Authenticates `msstore` with an Entra ID app registration.
4. Replaces the submission's package with the new installer URL. The installer runs silently with `/S`. The workflow then commits (publishes) the submission, which sends it to certification.

### One-time setup (Microsoft side)

1. **Developer account**: [register](https://learn.microsoft.com/windows/apps/get-started/sign-up) in Partner Center (individual accounts are free).
2. **Reserve the app**: in *Partner Center → Apps and games → New product → **MSI or EXE app***, reserve the name. Copy the **Product ID** (a GUID) from *Product identity*.
3. **First submission by hand**: fill in the listing, pricing, age rating, etc. Add a package with the installer URL of an existing release and installer parameters `/S`, then submit. The workflow only updates the package on later submissions.
4. **API access**:
   - In Partner Center → *Account settings → User management → Microsoft Entra applications*, link or create an Entra ID app and give it the **Manager** role.
   - In Azure Portal → *App registrations → that app → Certificates & secrets*, create a **client secret**.
   - Note the **Tenant ID** and **Client ID** (Overview). Note the **Seller ID** (Partner Center → *Account settings → Legal info → Developer*).

### Secrets

| Secret | Value |
| --- | --- |
| `PARTNER_CENTER_TENANT_ID` | Entra ID tenant ID |
| `PARTNER_CENTER_SELLER_ID` | Partner Center seller ID |
| `PARTNER_CENTER_CLIENT_ID` | Entra app (client) ID |
| `PARTNER_CENTER_CLIENT_SECRET` | Entra app client secret. It expires, so note the date and rotate it |
| `MS_STORE_PRODUCT_ID` | Product ID (GUID) of the MSI/EXE app |

Variable: `MS_STORE_ENABLED=true`.

### Related files

| File | Purpose |
| --- | --- |
| `src-tauri/tauri.microsoftstore.conf.json` | Sets `webviewInstallMode` to `offlineInstaller` |
| `src-tauri/tauri.conf.json` → `bundle.publisher` | Must differ from the product name (Store rule) |

### Things to know

- **Code signing is required, and not set up yet.** Store policy requires the installer and the app executable of Win32 apps to be signed with a certificate from a trusted CA. Unsigned submissions will likely fail certification. Tauri supports signing with a custom `bundle.windows.signCommand`, for example [Azure Trusted Signing](https://v2.tauri.app/distribute/sign/windows/#azure-trusted-signing) (cheap for individuals) or a classic OV/EV certificate. Add that config and its secrets before enabling the Store job.
- **The installer URL must not change.** Partner Center downloads the file during certification and may download it again later. Don't delete or replace release assets that have been submitted. The repo must stay public, because GitHub release URLs redirect to a CDN and must be reachable without auth.
- **One submission at a time.** If a submission is still in certification, `msstore submission update` fails. Wait for it to finish, or cancel it in Partner Center.
- **Package JSON**: the fields sent (`packageUrl`, `languages`, `architectures`, `isSilentInstall`, `installerParameters`, `packageType`) follow Microsoft's MSI/EXE submission API. If the call is rejected, run `msstore submission get <productId>` locally to see the structure your product expects.
- **x64 only.** To add Windows arm64, build with `--target aarch64-pc-windows-msvc`, upload that installer too, and add a second entry to `packages` with `architectures: ['Arm64']`.

## Running the store workflows manually

Both store workflows also have a `workflow_dispatch` trigger with a `tag` input. Use it to retry a failed submission without cutting a new release: *Actions → Mac App Store / Microsoft Store → Run workflow*, then enter an existing tag such as `v2.1.0`.

- The Microsoft Store workflow needs the GitHub release for that tag to already exist.
- The App Store workflow can't re-upload a version that App Store Connect already has.

## Upgrading actions

| Action | Pinned to |
| --- | --- |
| `actions/checkout` | `v7` |
| `tauri-apps/tauri-action` | `v1` (Tauri 2 only) |
| `oven-sh/setup-bun` | `v2` |
| `dtolnay/rust-toolchain` | `stable` |
| `swatinem/rust-cache` | `v2` |
| `microsoft/microsoft-store-apppublisher` | `v1.4` |

To check changes to the workflows locally, run [`actionlint`](https://github.com/rhysd/actionlint) (`brew install actionlint`) from the repository root.
