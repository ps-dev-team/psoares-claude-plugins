#!/usr/bin/env bash
# Pre-push validator for the psoares-claude-plugins marketplace repo.
#
# Rules enforced (all blocking):
#   1. Every dir under plugins/ must have .claude-plugin/plugin.json + README.md
#   2. Every plugin must be listed in .claude-plugin/marketplace.json
#   3. The top-level README.md must mention every plugin by name
#   4. Every SKILL.md must have `name:` and `description:` in its frontmatter
#
# Exit codes:
#   0 = all good
#   2 = blocking violations (caller should abort the push)

set -uo pipefail

# Resolve repo root from this script's location
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MARKETPLACE="$ROOT/.claude-plugin/marketplace.json"
ROOT_README="$ROOT/README.md"
PLUGINS_DIR="$ROOT/plugins"

errors=()
add_error() { errors+=("$1"); }

# Dependency check
if ! command -v jq >/dev/null 2>&1; then
  echo "validate-release: jq is required but not found." >&2
  exit 2
fi

# ── Collect plugin directories ───────────────────────────────────────────────
if [ ! -d "$PLUGINS_DIR" ]; then
  add_error "plugins/ directory is missing"
else
  plugin_dirs=()
  while IFS= read -r d; do
    plugin_dirs+=("$d")
  done < <(find "$PLUGINS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

  if [ "${#plugin_dirs[@]}" -eq 0 ]; then
    add_error "plugins/ contains no plugin directories"
  fi
fi

# ── Per-plugin checks ────────────────────────────────────────────────────────
plugin_names=()
for dir in "${plugin_dirs[@]:-}"; do
  [ -n "$dir" ] || continue
  name=$(basename "$dir")
  plugin_names+=("$name")

  manifest="$dir/.claude-plugin/plugin.json"
  readme="$dir/README.md"

  if [ ! -f "$manifest" ]; then
    add_error "$name: missing .claude-plugin/plugin.json"
  else
    if ! jq . "$manifest" >/dev/null 2>&1; then
      add_error "$name: plugin.json is not valid JSON"
    else
      manifest_name=$(jq -r '.name // empty' "$manifest")
      if [ -z "$manifest_name" ]; then
        add_error "$name: plugin.json missing \"name\""
      elif [ "$manifest_name" != "$name" ]; then
        add_error "$name: plugin.json \"name\"=\"$manifest_name\" doesn't match directory"
      fi
      if [ -z "$(jq -r '.version // empty' "$manifest")" ]; then
        add_error "$name: plugin.json missing \"version\""
      fi
      if [ -z "$(jq -r '.description // empty' "$manifest")" ]; then
        add_error "$name: plugin.json missing \"description\""
      fi
    fi
  fi

  if [ ! -f "$readme" ]; then
    add_error "$name: missing README.md"
  fi

  # Every SKILL.md must have name + description in frontmatter
  while IFS= read -r skill_file; do
    # Extract frontmatter block (between first two --- lines)
    frontmatter=$(awk '/^---$/{n++; if (n==2) exit; next} n==1' "$skill_file")
    if [ -z "$frontmatter" ]; then
      add_error "$name: $skill_file has no YAML frontmatter"
      continue
    fi
    if ! printf '%s\n' "$frontmatter" | grep -qE '^name:[[:space:]]*[^[:space:]]'; then
      add_error "$name: $skill_file missing \"name\" in frontmatter"
    fi
    if ! printf '%s\n' "$frontmatter" | grep -qE '^description:'; then
      add_error "$name: $skill_file missing \"description\" in frontmatter"
    fi
  done < <(find "$dir" -type f -name SKILL.md 2>/dev/null)
done

# ── Marketplace catalog coverage ─────────────────────────────────────────────
if [ ! -f "$MARKETPLACE" ]; then
  add_error ".claude-plugin/marketplace.json is missing"
elif ! jq . "$MARKETPLACE" >/dev/null 2>&1; then
  add_error ".claude-plugin/marketplace.json is not valid JSON"
else
  for name in "${plugin_names[@]:-}"; do
    [ -n "$name" ] || continue
    if ! jq -e --arg n "$name" '.plugins[]? | select(.name == $n)' "$MARKETPLACE" >/dev/null; then
      add_error "$name: not listed in .claude-plugin/marketplace.json"
    fi
  done

  # Detect stale catalog entries (listed but directory gone)
  while IFS= read -r catalog_name; do
    [ -n "$catalog_name" ] || continue
    found=0
    for name in "${plugin_names[@]:-}"; do
      [ "$name" = "$catalog_name" ] && found=1 && break
    done
    [ "$found" -eq 0 ] && add_error "marketplace.json lists \"$catalog_name\" but plugins/$catalog_name/ doesn't exist"
  done < <(jq -r '.plugins[]?.name // empty' "$MARKETPLACE")
fi

# ── Top-level README coverage ────────────────────────────────────────────────
if [ ! -f "$ROOT_README" ]; then
  add_error "top-level README.md is missing"
else
  for name in "${plugin_names[@]:-}"; do
    [ -n "$name" ] || continue
    if ! grep -qF "$name" "$ROOT_README"; then
      add_error "$name: not mentioned in the top-level README.md"
    fi
  done
fi

# ── Report ───────────────────────────────────────────────────────────────────
if [ "${#errors[@]}" -eq 0 ]; then
  echo "✓ validate-release: all plugins are ready for distribution (${#plugin_names[@]} plugin(s))"
  exit 0
fi

echo "✗ validate-release: ${#errors[@]} issue(s) — not ready for distribution:" >&2
for e in "${errors[@]}"; do
  printf '  - %s\n' "$e" >&2
done
echo >&2
echo "Fix these before pushing. This is a project-local check only." >&2
exit 2
