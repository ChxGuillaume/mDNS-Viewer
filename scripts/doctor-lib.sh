# shellcheck shell=bash
# Shared by scripts/doctor.sh and the steps of .github/workflows/doctor.yml.
# Callers that use check_all / check_all_or_none must define `present NAME`.

RELEASE_SIGNING_SECRETS=(APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID)
APP_STORE_SECRETS=(APPLE_TEAM_ID APPSTORE_APP_CERTIFICATE APPSTORE_INSTALLER_CERTIFICATE APPSTORE_CERTIFICATE_PASSWORD APPSTORE_APP_SIGNING_IDENTITY APPSTORE_INSTALLER_SIGNING_IDENTITY APPSTORE_PROVISIONING_PROFILE APPLE_API_KEY_ID APPLE_API_ISSUER APPLE_API_KEY)
MS_STORE_SECRETS=(PARTNER_CENTER_TENANT_ID PARTNER_CENTER_SELLER_ID PARTNER_CENTER_CLIENT_ID PARTNER_CENTER_CLIENT_SECRET MS_STORE_PRODUCT_ID)
MSIX_VARIABLES=(MSIX_IDENTITY_NAME MSIX_PUBLISHER MSIX_PUBLISHER_DISPLAY_NAME)

DOCTOR_FAILURES=0
DOCTOR_WARNINGS=0

if [ -t 1 ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  _green=$'\033[32m' _yellow=$'\033[33m' _red=$'\033[31m' _dim=$'\033[2m' _bold=$'\033[1m' _reset=$'\033[0m'
else
  _green='' _yellow='' _red='' _dim='' _bold='' _reset=''
fi

_summary() {
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$1" >> "$GITHUB_STEP_SUMMARY"
  return 0
}

section() {
  printf '\n%s%s%s\n' "$_bold" "$1" "$_reset"
  _summary "" && _summary "### $1" && _summary "" && _summary "| | Check |" && _summary "| --- | --- |"
}

pass() {
  printf '  %s✓%s %s\n' "$_green" "$_reset" "$1"
  _summary "| ✅ | $1 |"
}

info() {
  printf '  %s– %s%s\n' "$_dim" "$1" "$_reset"
  _summary "| ➖ | $1 |"
}

warn() {
  DOCTOR_WARNINGS=$((DOCTOR_WARNINGS + 1))
  printf '  %s⚠%s %s\n' "$_yellow" "$_reset" "$1"
  _summary "| ⚠️ | $1 |"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::warning::$1"
  return 0
}

fail() {
  DOCTOR_FAILURES=$((DOCTOR_FAILURES + 1))
  printf '  %s✗%s %s\n' "$_red" "$_reset" "$1"
  _summary "| ❌ | $1 |"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error::$1"
  return 0
}

_missing() {
  local name missing=''
  for name in "$@"; do
    present "$name" || missing="$missing $name"
  done
  printf '%s' "${missing# }"
}

# check_all LABEL NAME... : every name must be present
check_all() {
  local label=$1 missing
  shift
  missing=$(_missing "$@")
  if [ -z "$missing" ]; then
    pass "$label: all $# set"
  else
    fail "$label: missing $missing"
  fi
  [ -z "$missing" ]
}

# check_all_or_none LABEL NAME... : returns 0 only when all are present
check_all_or_none() {
  local label=$1 missing count
  shift
  missing=$(_missing "$@")
  count=$(printf '%s' "$missing" | wc -w | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    pass "$label: all $# set"
    return 0
  elif [ "$count" -eq "$#" ]; then
    warn "$label: none set, macOS release builds will be unsigned and not notarized"
  else
    fail "$label: partially set, missing $missing (set all of them or none)"
  fi
  return 1
}

# check_days_left LABEL DAYS DATE
check_days_left() {
  if [ "$2" -lt 0 ]; then
    fail "$1 expired on $3"
  elif [ "$2" -lt 7 ]; then
    fail "$1 expires on $3 ($2 days left)"
  elif [ "$2" -lt 30 ]; then
    warn "$1 expires on $3 ($2 days left)"
  else
    pass "$1 valid until $3"
  fi
}

# check_cert_expiry LABEL PEM
check_cert_expiry() {
  local end
  end=$(openssl x509 -noout -enddate <<< "$2" | cut -d= -f2)
  if ! openssl x509 -noout -checkend 0 <<< "$2" > /dev/null; then
    fail "$1 expired on $end"
  elif ! openssl x509 -noout -checkend 604800 <<< "$2" > /dev/null; then
    fail "$1 expires on $end (less than 7 days left)"
  elif ! openssl x509 -noout -checkend 2592000 <<< "$2" > /dev/null; then
    warn "$1 expires on $end (less than 30 days left)"
  else
    pass "$1 valid until $end"
  fi
}

doctor_finish() {
  printf '\n'
  if [ "$DOCTOR_FAILURES" -gt 0 ]; then
    printf '%s%d problem(s)%s, %d warning(s)\n' "$_red" "$DOCTOR_FAILURES" "$_reset" "$DOCTOR_WARNINGS"
    exit 1
  fi
  printf '%sAll good%s, %d warning(s)\n' "$_green" "$_reset" "$DOCTOR_WARNINGS"
}
