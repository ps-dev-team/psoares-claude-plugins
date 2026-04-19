#!/usr/bin/env bash
# Dependency check helper. Source this file and call:
#   require_bin <command> "<install hint>"  → exits 2 if missing
#   require_env <VAR>       "<why you need it>"  → exits 2 if unset

require_bin() {
  local bin="$1"
  local hint="$2"
  if command -v "$bin" >/dev/null 2>&1; then return 0; fi
  if [ -x "$HOME/.local/bin/$bin" ]; then return 0; fi
  echo "Error: missing dependency '$bin'." >&2
  echo "  Install: $hint" >&2
  exit 2
}

require_env() {
  local var="$1"
  local reason="$2"
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set ($reason)." >&2
    echo "  Set it in ~/.claude/settings.json under the \"env\" block, e.g.:" >&2
    echo "    { \"env\": { \"$var\": \"<value>\" } }" >&2
    echo "  Or export it in your shell profile." >&2
    exit 2
  fi
}
