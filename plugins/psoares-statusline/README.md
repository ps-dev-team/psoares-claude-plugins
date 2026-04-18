# psoares-statusline

Gruvbox Material Dark statusline for Claude Code.

Shows: optional account label, working directory, git branch (worktree-aware), model + thinking effort + output style, context window bar, rough cost estimate, active subagent, vim mode.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-statusline@psoares-claude-plugins
```

## Wire it up

Claude Code does not expand `${CLAUDE_PLUGIN_ROOT}` inside `settings.json`, so point `statusLine.command` at the installed script using its absolute path:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/plugins/cache/psoares-claude-plugins/psoares-statusline/scripts/statusline.sh"
  }
}
```

Replace `~/.claude` with the config dir Claude Code is actually using on this machine.

## Account label (optional)

The statusline can show a bold account label at the left — useful when you run multiple Claude Code accounts on the same machine (e.g. work vs. personal) and want to tell them apart at a glance.

The fastest way to set it up is the bundled `configure-label` skill — just ask Claude something like *"add a label to my statusline"* or *"configurar statusline label"* and it walks you through the text + hex color prompts, writes a small wrapper, and updates `settings.json`.

Under the hood the plugin reads two environment variables:

- `CLAUDE_LABEL` — the label text
- `CLAUDE_LABEL_COLOR` — either a hex (`#84fb7f`) or a raw ANSI escape

So you can also wire it manually by creating a tiny wrapper (e.g. `~/.claude/statusline.sh`):

```bash
#!/usr/bin/env bash
export CLAUDE_LABEL="PERSONAL"
export CLAUDE_LABEL_COLOR="#84fb7f"
exec bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/psoares-claude-plugins/psoares-statusline/scripts/statusline.sh"
```

…and pointing `statusLine.command` at the wrapper instead of the plugin script directly.

## Requirements

`bash`, `jq`, `git`, `awk`.
