# Mac App Store (`mac-app-store.yml`)

## What it does

1. Creates a temporary keychain and imports the **Apple Distribution** and **Mac Installer Distribution** certificates.
2. Writes the provisioning profile to `src-tauri/embedded.provisionprofile` (gitignored). Replaces `__TEAM_ID__` in `src-tauri/Entitlements.appstore.plist` with your Team ID.
3. Builds a universal `.app` with `tauri.appstore.conf.json` merged on top of the main config. This adds the sandbox entitlements, embeds the profile, and sets the minimum macOS version to 11.0.
4. Wraps the `.app` in a signed installer package with `xcrun productbuild`.
5. Uploads the `.pkg` to App Store Connect with `xcrun altool` and an App Store Connect API key.

After the upload, the build shows up in App Store Connect → TestFlight after processing (usually 5–30 min). From there you pick it for a version and submit for review yourself. The workflow doesn't submit for review.

## One-time setup (Apple side)

Requires a paid [Apple Developer Program](https://developer.apple.com/programs/) membership.

1. **App ID**: in _Certificates, Identifiers & Profiles → Identifiers_, register an explicit App ID for `dev.guillaumechx.mdns-viewer` (platform macOS).
2. **Certificates**: in _Certificates_, create both of these (each needs a CSR from Keychain Access → Certificate Assistant):
   - **Apple Distribution** signs the `.app`.
   - **Mac Installer Distribution** signs the `.pkg`. It shows up in Keychain as `3rd Party Mac Developer Installer: …`.

   Install both, then in Keychain Access select the two certificates with their private keys and export them together as one `.p12`. Alternatively, export them as two separate `.p12` files with the same password.

3. **Provisioning profile**: in _Profiles_, create a **Mac App Store Connect** profile (Distribution → Mac App Store) for the App ID and the Apple Distribution certificate. Download it.
4. **App record**: in [App Store Connect](https://appstoreconnect.apple.com) → _Apps → +_, create a macOS app with that bundle ID. Fill in the listing, screenshots, privacy details, pricing, etc.
5. **API key**: in App Store Connect → _Users and Access → Integrations → App Store Connect API_, create a key with the **App Manager** role. Download the `.p8` (you can only download it once). Note the **Key ID** and the **Issuer ID**.

## Secrets

| Secret                                | Value                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `APPLE_TEAM_ID`                       | 10-character Team ID (shared with the release builds)                          |
| `APPSTORE_APP_CERTIFICATE`            | `base64 -i apple-distribution.p12`                                             |
| `APPSTORE_INSTALLER_CERTIFICATE`      | `base64 -i mac-installer-distribution.p12` (can be the same combined `.p12`)   |
| `APPSTORE_CERTIFICATE_PASSWORD`       | password of the `.p12` file(s). Both must use the same one                     |
| `APPSTORE_APP_SIGNING_IDENTITY`       | e.g. `Apple Distribution: Guillaume Chx (TEAMID)`                              |
| `APPSTORE_INSTALLER_SIGNING_IDENTITY` | e.g. `3rd Party Mac Developer Installer: Guillaume Chx (TEAMID)`               |
| `APPSTORE_PROVISIONING_PROFILE`       | `base64 -i mDNS_Viewer_App_Store.provisionprofile`                             |
| `APPLE_API_KEY_ID`                    | App Store Connect API Key ID                                                   |
| `APPLE_API_ISSUER`                    | App Store Connect Issuer ID (UUID)                                             |
| `APPLE_API_KEY`                       | full contents of the `AuthKey_XXXX.p8` file, including the `BEGIN`/`END` lines |

Variable: `APP_STORE_ENABLED=true`.

To find the exact identity names, run `security find-identity -v` on your Mac after installing the certificates.

## Related files

| File                                    | Purpose                                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/tauri.appstore.conf.json`    | Config overlay for App Store builds (entitlements, embedded profile, minimum macOS 11.0)                                                            |
| `src-tauri/Entitlements.appstore.plist` | App Sandbox + outgoing and incoming network access (mDNS listens on UDP 5353); the `__TEAM_ID__` placeholder is filled in by CI                     |
| `src-tauri/Info.plist`                  | Merged into **every** macOS build: declares no non-exempt encryption (App Store Connect export compliance) and the Local Network permission message |

## Things to know

- **Build numbers must increase.** App Store Connect rejects an upload whose version already exists, so each store upload needs a new tag. To re-run a tag that has already been uploaded, you have to tag a new version.
- **Test the sandboxed build before the first submission.** mDNS discovery uses raw multicast sockets. The network client and server entitlements should allow this, but check it on a real machine (macOS asks for Local Network permission on first launch).
- **`altool`**: the upload uses `xcrun altool --upload-app`, as in Tauri's docs. If Apple removes it from Xcode on the runner, switch this step to Transporter (`xcrun iTMSTransporter`).
- **Local App Store build**, to test signing/sandboxing:

  ```sh
  bun run tauri build --target universal-apple-darwin --bundles app --config src-tauri/tauri.appstore.conf.json
  ```

  This needs `src-tauri/embedded.provisionprofile` and the `__TEAM_ID__` placeholders replaced. Don't commit either.

## Running it manually

The workflow also has a `workflow_dispatch` trigger with a `tag` input. Use it to retry a failed upload without cutting a new release: _Actions → Mac App Store → Run workflow_, then enter an existing tag such as `v2.1.0`. App Store Connect rejects a version it already has, so this only helps when the earlier upload didn't go through.
