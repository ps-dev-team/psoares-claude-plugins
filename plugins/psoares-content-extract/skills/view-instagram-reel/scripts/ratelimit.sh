#!/usr/bin/env bash
# Instagram rate-limit helper — 60s cooldown between requests.
# Source this file and call `ig_wait`, or run directly with --check/--wait/--status.

STATE_FILE="${HOME}/.cache/psoares-content-extract/instagram/last_request"
COOLDOWN_SECONDS=60

ig_init() {
  mkdir -p "$(dirname "$STATE_FILE")"
  touch "$STATE_FILE" 2>/dev/null || true
}

ig_last_request() {
  ig_init
  cat "$STATE_FILE" 2>/dev/null || echo "0"
}

ig_update() {
  ig_init
  date +%s > "$STATE_FILE"
}

ig_seconds_until_ready() {
  local last=$(ig_last_request)
  local now=$(date +%s)
  local elapsed=$((now - last))
  local remaining=$((COOLDOWN_SECONDS - elapsed))
  if [ $remaining -lt 0 ]; then echo "0"; else echo "$remaining"; fi
}

ig_check() {
  local wait=$(ig_seconds_until_ready)
  if [ "$wait" -gt 0 ]; then echo "WAIT:$wait"; return 1; else echo "READY"; return 0; fi
}

ig_wait() {
  local wait=$(ig_seconds_until_ready)
  if [ "$wait" -gt 0 ]; then
    echo "⏳ Rate-limit: waiting ${wait}s..." >&2
    sleep "$wait"
  fi
  ig_update
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    --check)  ig_check ;;
    --wait)   ig_wait; echo "Ready!" ;;
    --update) ig_update; echo "Updated timestamp" ;;
    --status)
      wait=$(ig_seconds_until_ready)
      if [ "$wait" -gt 0 ]; then echo "Cooldown: ${wait}s remaining"; else echo "Ready (no cooldown)"; fi
      ;;
    *) echo "Usage: $0 [--check|--wait|--update|--status]" ;;
  esac
fi
