---
name: configure-label
description: >
  Configure the account label shown at the left of the psoares-statusline plugin.
  Use when the user wants to add, change, or remove a statusline label, or asks
  things like "add a label to the statusline", "change the statusline color",
  "configure statusline label", "adicionar label à statusline", "mudar cor da
  label", "configurar statusline", "label da conta", "identificar a conta na
  statusline". Walks through questions (label text, hex color) and writes the
  wrapper script + updates settings.json so the label renders on next prompt.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Configure Statusline Label

This skill configures the optional account label for the `psoares-statusline` plugin. The label renders at the very left of the statusline in bold, using a user-chosen hex color. It's useful for distinguishing multiple Claude Code accounts (e.g. work vs. personal) when both run on the same machine.

## How the label works

The plugin's `scripts/statusline.sh` already supports two environment variables:

- `CLAUDE_LABEL` — the text shown at the left (e.g. `UPHOLD`, `PERSONAL`)
- `CLAUDE_LABEL_COLOR` — either a hex like `#84fb7f` or a raw ANSI escape. Empty = no label.

The plugin script itself is not executed directly by Claude Code. Instead, a tiny wrapper exports the two env vars and then `exec`s the plugin script. That wrapper lives inside the Claude config dir so each account can have its own label.

## Step-by-step flow

Follow these steps in order. Do NOT skip the confirmation questions — this skill exists precisely because the user wants an interactive setup.

### 1. Detect the active Claude config dir

Use `${CLAUDE_CONFIG_DIR:-$HOME/.claude}`. Remember this path for later — call it `CONFIG_DIR`. All writes happen there.

### 2. Check if a wrapper already exists

Read `$CONFIG_DIR/statusline.sh` if it exists. If it already exports `CLAUDE_LABEL`, show the current label to the user and ask whether they want to update, remove, or keep it. If it doesn't exist, proceed to step 3 as a fresh setup.

### 3. Ask: does the user want a label?

Use `AskUserQuestion` with a single question: "Do you want an account label on the statusline?" — options: **Yes** / **No**.

- If **No** and there's no existing wrapper: stop and tell the user nothing was changed.
- If **No** and there IS an existing wrapper with a label: ask a confirmation before removing it, then delete the `CLAUDE_LABEL`/`CLAUDE_LABEL_COLOR` exports (or the whole wrapper, depending on what else is in it). Revert `statusLine.command` in settings.json to point directly at the plugin script.
- If **Yes**: continue.

### 4. Ask for the label text

Use `AskUserQuestion`: "What text should the label show?" — provide suggestions like **PERSONAL**, **WORK**, **UPHOLD**, and an "Other" option for free-form text. Keep the text short (uppercase works best visually). Do not accept empty text.

### 5. Ask for the hex color

Use `AskUserQuestion`: "What hex color should the label use?" — offer a handful of sensible defaults from the Gruvbox palette the plugin already uses:

- `#84fb7f` — bright green
- `#e9ac67` — orange
- `#5396fd` — blue
- `#b62d65` — purple
- `#70e1e8` — cyan
- plus an "Other" option for a custom hex

If the user picks "Other", ask for the exact hex value and validate it matches `^#[0-9A-Fa-f]{6}$`. Reject anything else and re-ask.

### 6. Write the wrapper

Write `$CONFIG_DIR/statusline.sh` with this content (substitute `<LABEL>` and `<HEX>`):

```bash
#!/usr/bin/env bash
# psoares-statusline account wrapper — exports label, delegates to the plugin.
export CLAUDE_LABEL="<LABEL>"
export CLAUDE_LABEL_COLOR="<HEX>"
exec bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/psoares-claude-plugins/psoares-statusline/scripts/statusline.sh"
```

Make the file executable (`chmod +x`).

### 7. Update settings.json

Read `$CONFIG_DIR/settings.json` (create it as `{}` if missing). Set `statusLine` to:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash <CONFIG_DIR>/statusline.sh"
  }
}
```

Substitute `<CONFIG_DIR>` with the absolute path. If `settings.json` is a symlink (the user may keep dotfiles under version control — check with `ls -l` first), edit the symlink target rather than replacing the link. If `statusLine` already points somewhere else, ask the user before overwriting.

### 8. Preview and confirm

Run the wrapper against a sample input to show the user what it looks like:

```bash
echo '{"model":{"display_name":"Sonnet 4.6","id":"claude-sonnet-4-6"},"workspace":{"current_dir":"'"$PWD"'"}}' | bash "$CONFIG_DIR/statusline.sh"
```

Print the rendered output so the user can verify the colors before the next prompt picks it up.

## Notes

- The plugin path `plugins/cache/psoares-claude-plugins/psoares-statusline/scripts/statusline.sh` assumes the plugin was installed from the `psoares-claude-plugins` marketplace. If the user installed it differently, ask where the plugin lives before writing the wrapper.
- Multiple accounts with different `$CLAUDE_CONFIG_DIR` values each need their own wrapper — run this skill once per account.
- The wrapper intentionally uses `exec` so the plugin script replaces the wrapper process (no extra shell in the pipeline).
