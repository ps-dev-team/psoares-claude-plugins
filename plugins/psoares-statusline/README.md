# psoares-statusline

Gruvbox Material Dark statusline for Claude Code.

Shows: optional account label, working directory, git branch (worktree-aware), model + thinking effort + output style, context window bar, rough cost estimate, active subagent, vim mode.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-statusline@psoares-claude-plugins
```

## Activate

Claude Code does not auto-wire a plugin's statusline, so after installing you need to point `statusLine.command` at the plugin's renderer. The fastest way is the bundled `setup-statusline` skill — ask Claude something like *"activate the statusline"* or *"ativar a statusline"* and it walks you through one Yes/No about the account label, picks up the installed plugin version, writes a small wrapper, and updates `settings.json`.

Re-run the skill after upgrading the plugin so the wrapper picks up the new version path.

## Account label (optional)

The statusline can show a bold account label at the left — useful when you run multiple Claude Code accounts on the same machine (e.g. work vs. personal) and want to tell them apart at a glance.

The `setup-statusline` skill asks *"Do you want an account label?"* as part of its flow — pick **Yes** to configure the text and color interactively.

Under the hood the plugin reads two environment variables:

- `CLAUDE_LABEL` — the label text
- `CLAUDE_LABEL_COLOR` — either a hex (`#84fb7f`) or a raw ANSI escape

## Manual wiring

If you'd rather wire it yourself, create a wrapper (e.g. `~/.claude/statusline.sh`):

```bash
#!/usr/bin/env bash
export CLAUDE_LABEL="PERSONAL"          # optional
export CLAUDE_LABEL_COLOR="#84fb7f"     # optional
exec bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/psoares-claude-plugins/psoares-statusline/<VERSION>/scripts/statusline.sh"
```

Substitute `<VERSION>` with the version directory that currently exists under the cache path (e.g. `0.2.0`). Then point `statusLine.command` in `settings.json` at the wrapper:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline.sh"
  }
}
```

Remember to update the baked version after each plugin upgrade.

## Requirements

`bash`, `jq`, `git`, `awk`.
