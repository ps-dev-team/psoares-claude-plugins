# psoares-statusline

Gruvbox Material Dark statusline for Claude Code.

Shows: working directory, git branch (worktree-aware), model + thinking effort + output style, context window bar, rough cost estimate, active subagent, vim mode.

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

## Requirements

`bash`, `jq`, `git`, `awk`.
