---
name: setup-statusline
description: >
  Set up and activate the psoares-statusline plugin — writes the wrapper
  script, points settings.json at it, and optionally configures an account
  label shown at the left of the statusline. Use when the user wants to
  activate/enable the statusline, refresh it after upgrading the plugin,
  add/remove/change an account label, or asks things like "activate the
  statusline", "set up the statusline", "enable statusline", "turn on the
  statusline", "ativar a statusline", "activar statusline", "configurar
  statusline", "add a label to the statusline", "change the statusline
  color", "mudar cor da label", "label da conta", "identificar a conta na
  statusline". Walks through one Yes/No question about the label (plus
  text + color if Yes), picks up the installed plugin version, writes the
  wrapper, and updates settings.json so the statusline renders on the
  next prompt.
license: MIT
metadata:
  author: psoares
  version: "0.2"
---

# Set Up Statusline

This skill activates the `psoares-statusline` plugin and optionally configures an account label. Claude Code does not auto-wire a plugin's statusline, so without running this skill the plugin's renderer is never invoked — `settings.json` has to point at it explicitly.

The optional account label is a bold, colored tag at the left of the statusline (e.g. `UPHOLD`, `PERSONAL`) — useful when you run multiple Claude Code accounts on the same machine and want to tell them apart at a glance.

## How wiring works

Claude Code reads `statusLine.command` from `settings.json`. This skill points it at a tiny wrapper written to `$CONFIG_DIR/statusline.sh` that:

1. (Optional) Exports `CLAUDE_LABEL` and `CLAUDE_LABEL_COLOR` for the label.
2. `exec`s the real plugin script from its versioned cache path.

The wrapper lives inside the Claude config dir so each account can have its own label. The plugin's cache path contains a version segment (`.../psoares-statusline/<VERSION>/scripts/statusline.sh`), so **the wrapper must be regenerated after every plugin upgrade** — re-run this skill to refresh it.

## Step-by-step flow

Follow these steps in order. Do NOT skip the confirmation question — this skill exists precisely because the user wants an interactive setup.

### 1. Detect the active Claude config dir

Use `${CLAUDE_CONFIG_DIR:-$HOME/.claude}`. Remember this path — call it `CONFIG_DIR`. All writes happen there.

### 2. Inspect the current state

Read `$CONFIG_DIR/statusline.sh` if present. Detect which of these cases you're in:

- **Wrapper exists with `CLAUDE_LABEL` exported** → a labelled setup; remember the current label text and color.
- **Wrapper exists without those exports** → a label-less setup.
- **No wrapper** → fresh install.

Also peek at `$CONFIG_DIR/settings.json`'s `statusLine.command` so you can mention, in the question below, whether the statusline is already wired up.

### 3. Ask: does the user want an account label?

Use `AskUserQuestion`: "Do you want an account label on the statusline?" — options: **Yes** / **No**.

Show the current state in the question description so the user has context (e.g. "Currently: label `UPHOLD` in `#84fb7f`", "Currently: no label", or "Currently: statusline not set up yet"). Picking the same answer as the current state is valid — it regenerates the wrapper with the latest plugin version.

### 4. If Yes — ask for the label text

Use `AskUserQuestion`: "What text should the label show?" — suggestions like **PERSONAL**, **WORK**, **UPHOLD**, plus an "Other" option for free-form text. Keep it short (uppercase works best visually). Do not accept empty text. If there's an existing label, show it as the default.

### 5. If Yes — ask for the hex color

Use `AskUserQuestion`: "What hex color should the label use?" — offer defaults from the Gruvbox palette:

- `#84fb7f` — bright green
- `#e9ac67` — orange
- `#5396fd` — blue
- `#b62d65` — purple
- `#70e1e8` — cyan
- plus an "Other" option for a custom hex

If the user picks "Other", ask for the exact hex and validate `^#[0-9A-Fa-f]{6}$`. Reject anything else and re-ask.

### 6. Resolve the installed plugin version

Claude Code's marketplace installer stores the plugin under a versioned directory:

```
$CONFIG_DIR/plugins/cache/psoares-claude-plugins/psoares-statusline/<VERSION>/scripts/statusline.sh
```

List that cache directory and pick the highest version present (there should normally be exactly one) — call it `VERSION`. Verify `$CONFIG_DIR/plugins/cache/psoares-claude-plugins/psoares-statusline/$VERSION/scripts/statusline.sh` exists. If nothing is there, stop and ask the user where the plugin lives — the marketplace install path is what this skill assumes.

### 7. Write the wrapper

Write `$CONFIG_DIR/statusline.sh` with one of the two templates below, depending on step 3's answer. In both templates, substitute `<VERSION>` with the version from step 6.

**With label** (also substitute `<LABEL>` and `<HEX>`):

```bash
#!/usr/bin/env bash
# psoares-statusline account wrapper — exports label, delegates to the plugin.
# Re-run /psoares-statusline:setup-statusline after upgrading the plugin so
# the version baked below gets refreshed.
export CLAUDE_LABEL="<LABEL>"
export CLAUDE_LABEL_COLOR="<HEX>"
exec bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/psoares-claude-plugins/psoares-statusline/<VERSION>/scripts/statusline.sh"
```

**Without label**:

```bash
#!/usr/bin/env bash
# psoares-statusline wrapper — delegates to the plugin.
# Re-run /psoares-statusline:setup-statusline after upgrading the plugin so
# the version baked below gets refreshed.
exec bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/psoares-claude-plugins/psoares-statusline/<VERSION>/scripts/statusline.sh"
```

Make the file executable (`chmod +x`).

### 8. Update settings.json

Read `$CONFIG_DIR/settings.json` (create it as `{}` if missing). Set:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash <CONFIG_DIR>/statusline.sh"
  }
}
```

Substitute `<CONFIG_DIR>` with the absolute path. If `settings.json` is a symlink (the user may keep dotfiles under version control — check with `ls -l` first), edit the symlink target rather than replacing the link. If `statusLine.command` already points somewhere else and it isn't the wrapper we just wrote, ask before overwriting.

### 9. Preview and confirm

Run the wrapper against a sample input so the user can verify it renders:

```bash
echo '{"model":{"display_name":"Sonnet 4.6","id":"claude-sonnet-4-6"},"workspace":{"current_dir":"'"$PWD"'"}}' | bash "$CONFIG_DIR/statusline.sh"
```

Print the rendered output. If the user asked for a label, confirm the colors look right.

## Notes

- The plugin version is baked into the wrapper at the moment this skill runs. After upgrading the plugin the wrapper keeps pointing at the old versioned path and the statusline silently stops rendering — re-run this skill after every plugin upgrade. The wrapper's own comments remind the user of this.
- Multiple accounts with different `$CLAUDE_CONFIG_DIR` values each need their own wrapper — run this skill once per account.
- The wrapper intentionally uses `exec` so the plugin script replaces the wrapper process (no extra shell in the pipeline).
- If the user installed the plugin outside the `psoares-claude-plugins` marketplace, ask where it lives before writing the wrapper and adjust the cache path accordingly.
