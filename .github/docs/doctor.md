# Workflow doctor

Checks that the release and store workflows will work, before you push a tag. Every check prints ✓, ⚠ or ✗, and any ✗ makes it fail.

## Locally: `bun run doctor`

Needs `jq`, and `actionlint` (`brew install actionlint jq`).

- **Tooling**: `actionlint` over all workflows and actions.
- **Versions**: `package.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` have the same version. `tauri.conf.json` still reads its version from `package.json`. The version is a plain `X.Y.Z`, and a `v*` tag on `HEAD` matches it.
- **Files**: the `__TEAM_ID__` placeholders are still in `Entitlements.appstore.plist`, `embedded.provisionprofile` isn't committed, `tauri.appstore.conf.json` is valid, `AppxManifest.xml` has its `{{…}}` placeholders, and the MSIX logos exist.
- **Secrets and variables** (when `gh` is logged in with admin access to the repository): the release signing secrets are all set or none are. For each store whose `*_ENABLED` variable is `true`, every secret and variable it needs is set.

`gh` can only see secret names, not their values. Pass `--no-remote` to skip that part, or `--remote` to force it.

## In GitHub Actions: `doctor.yml`

Runs every Monday and from *Actions → Workflow doctor → Run workflow*. Each job writes a table to the run summary. A scheduled run that fails sends GitHub's usual failure email, which is how you hear about something expiring.

| Job | Runs when | Checks |
| --- | --- | --- |
| **repo** | always | `scripts/doctor.sh`, plus whether each store is enabled |
| **release-signing** | always | The `APPLE_*` secrets are all set or none are. If they're set: `APPLE_SIGNING_IDENTITY` is in `APPLE_CERTIFICATE`, the certificate's expiry, that it belongs to `APPLE_TEAM_ID`, and that notarization accepts the Apple ID credentials (`notarytool history`, which submits nothing) |
| **mac-app-store** | `APP_STORE_ENABLED=true` | Both signing identities are in their certificates, and their expiry. For the provisioning profile: its expiry, team and bundle ID, and that it includes the Apple Distribution certificate. Also that the API key can call App Store Connect and an app with the bundle ID exists |
| **microsoft-store** | `MS_STORE_ENABLED=true` | Every secret and `MSIX_*` variable is set, `MSIX_PUBLISHER` starts with `CN=`, `msstore` can sign in to Partner Center, and `MS_STORE_PRODUCT_ID` exists |

Certificates and the provisioning profile get ⚠ within 30 days of expiry, and ✗ within 7 days or once they've expired. The Partner Center client secret's expiry date can't be read through the API, so keep track of it in Azure Portal.
