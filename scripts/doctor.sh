#!/usr/bin/env bash
# Checks that the GitHub Actions workflows have what they need. See .github/docs/doctor.md.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2
# shellcheck source=scripts/doctor-lib.sh
. scripts/doctor-lib.sh

usage() {
  cat <<'EOF'
Usage: bun run doctor [--remote | --no-remote]

  --remote     check repository secrets and variables with gh (default when gh is logged in, outside CI)
  --no-remote  only check the files in the repository
EOF
}

remote=auto
for arg in "$@"; do
  case $arg in
    --remote) remote=yes ;;
    --no-remote) remote=no ;;
    -h | --help) usage && exit 0 ;;
    *) usage >&2 && exit 2 ;;
  esac
done

if ! command -v jq > /dev/null; then
  echo "jq is required (brew install jq)" >&2
  exit 2
fi

section "Tooling"
if command -v actionlint > /dev/null; then
  if output=$(actionlint 2>&1); then
    pass "actionlint found no problems"
  else
    printf '%s\n' "$output" | sed 's/^/      /'
    fail "actionlint reported problems"
  fi
elif [ -n "${CI:-}" ]; then
  fail "actionlint is not installed"
else
  warn "actionlint is not installed (brew install actionlint)"
fi

section "Versions"
version=$(jq -r .version package.json)
crate=$(sed -n 's/^name = "\(.*\)"$/\1/p' src-tauri/Cargo.toml | head -n1)
cargo_version=$(sed -n 's/^version = "\(.*\)"$/\1/p' src-tauri/Cargo.toml | head -n1)
lock_version=$(awk -v name="name = \"$crate\"" '$0 == name { getline; gsub(/^version = "|"$/, ""); print; exit }' src-tauri/Cargo.lock)

if [ "$cargo_version" = "$version" ]; then
  pass "src-tauri/Cargo.toml version matches package.json ($version)"
else
  fail "src-tauri/Cargo.toml version is $cargo_version, package.json is $version"
fi
if [ "$lock_version" = "$version" ]; then
  pass "src-tauri/Cargo.lock is up to date ($crate $version)"
else
  fail "src-tauri/Cargo.lock has $crate ${lock_version:-<missing>}, expected $version (run cargo update -p $crate)"
fi
if [ "$(jq -r .version src-tauri/tauri.conf.json)" = "../package.json" ]; then
  pass "tauri.conf.json reads its version from package.json"
else
  fail "tauri.conf.json version should be \"../package.json\", the release workflow relies on it"
fi
if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  pass "version $version is a plain X.Y.Z, as the stores require"
else
  warn "version $version isn't a plain X.Y.Z, the store workflows will skip or reject it"
fi
for tag in $(git tag --points-at HEAD --list 'v*'); do
  if [ "$tag" = "v$version" ]; then
    pass "tag $tag on HEAD matches package.json"
  else
    fail "tag $tag on HEAD doesn't match package.json version $version, release.yml will refuse it"
  fi
done

section "Files"
identifier=$(jq -r .identifier src-tauri/tauri.conf.json)
entitlements=src-tauri/Entitlements.appstore.plist
if grep -qF "<string>__TEAM_ID__.$identifier</string>" "$entitlements" && grep -qF "<string>__TEAM_ID__</string>" "$entitlements"; then
  pass "$entitlements has the __TEAM_ID__ placeholders for $identifier"
else
  fail "$entitlements must contain __TEAM_ID__.$identifier and __TEAM_ID__ (CI fills them in, don't commit a real Team ID)"
fi
if git ls-files --error-unmatch src-tauri/embedded.provisionprofile > /dev/null 2>&1; then
  fail "src-tauri/embedded.provisionprofile is committed, remove it from git"
else
  pass "src-tauri/embedded.provisionprofile isn't committed"
fi
if jq empty src-tauri/tauri.appstore.conf.json 2> /dev/null; then
  pass "src-tauri/tauri.appstore.conf.json is valid"
else
  fail "src-tauri/tauri.appstore.conf.json is missing or not valid JSON"
fi
manifest=src-tauri/msix/AppxManifest.xml
missing=''
for key in VERSION IDENTITY_NAME PUBLISHER PUBLISHER_DISPLAY_NAME; do
  grep -qF "{{$key}}" "$manifest" 2> /dev/null || missing="$missing {{$key}}"
done
if [ -z "$missing" ]; then
  pass "$manifest has all its placeholders"
else
  fail "$manifest is missing$missing"
fi
missing=''
for icon in StoreLogo Square44x44Logo Square71x71Logo Square150x150Logo; do
  [ -f "src-tauri/icons/$icon.png" ] || missing="$missing $icon.png"
done
if [ -z "$missing" ]; then
  pass "MSIX logos are in src-tauri/icons"
else
  fail "src-tauri/icons is missing$missing (regenerate with bun run tauri icon)"
fi

if [ "$remote" = auto ]; then
  remote=no
  if [ -z "${CI:-}" ] && command -v gh > /dev/null && gh auth status > /dev/null 2>&1; then
    remote=yes
  fi
fi

if [ "$remote" = yes ]; then
  section "Repository secrets and variables"
  if ! secrets=$(gh secret list --json name --jq '.[].name' 2>&1) || ! variables=$(gh variable list --json name,value 2>&1); then
    fail "couldn't list secrets and variables with gh (needs admin access to the repository)"
  else
    present() { grep -qxF "$1" <<< "$secrets"; }
    variable() { jq -r --arg name "$1" '.[] | select(.name == $name) | .value' <<< "$variables"; }

    check_all_or_none "Release signing secrets" "${RELEASE_SIGNING_SECRETS[@]}" || true

    app_store=$(variable APP_STORE_ENABLED)
    case $app_store in
      true) check_all "Mac App Store secrets" "${APP_STORE_SECRETS[@]}" || true ;;
      '' | false) info "Mac App Store: skipped (APP_STORE_ENABLED isn't true)" ;;
      *) warn "APP_STORE_ENABLED is \"$app_store\", only \"true\" enables the Mac App Store" ;;
    esac

    ms_store=$(variable MS_STORE_ENABLED)
    case $ms_store in
      true)
        check_all "Microsoft Store secrets" "${MS_STORE_SECRETS[@]}" || true
        missing=''
        for name in "${MSIX_VARIABLES[@]}"; do
          [ -n "$(variable "$name")" ] || missing="$missing $name"
        done
        if [ -n "$missing" ]; then
          fail "Microsoft Store variables: missing$missing"
        elif [[ $(variable MSIX_PUBLISHER) != CN=* ]]; then
          fail "MSIX_PUBLISHER must start with CN= (copy it from Partner Center → Product identity)"
        else
          pass "Microsoft Store variables: all 3 set"
        fi
        ;;
      '' | false) info "Microsoft Store: skipped (MS_STORE_ENABLED isn't true)" ;;
      *) warn "MS_STORE_ENABLED is \"$ms_store\", only \"true\" enables the Microsoft Store" ;;
    esac
  fi
fi

doctor_finish
