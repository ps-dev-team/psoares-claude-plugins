# psoares-claude-plugins

A marketplace of Claude Code plugins by Paulo Soares.

## Install

```bash
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-writing@psoares-claude-plugins
```

Replace the GitHub slug with wherever this repo lives.

## Plugins

| Plugin | What it does |
| --- | --- |
| [`psoares-writing`](plugins/psoares-writing) | Writing tooling. Ships the `psoares-writing:human-prose` skill for humanizing AI output across languages. |
| [`psoares-statusline`](plugins/psoares-statusline) | Gruvbox Material Dark statusline: cwd, git branch, model, context bar, cost, agent, vim mode. |

See [TODO.md](TODO.md) for what's planned.

## Layout

```
.
├── .claude-plugin/
│   └── marketplace.json          # Catalog manifest
├── plugins/
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest
│       ├── skills/               # Optional
│       ├── commands/             # Optional
│       ├── agents/               # Optional
│       └── hooks/                # Optional
└── README.md
```

Each plugin is self-contained under `plugins/<plugin-name>/`. The root `.claude-plugin/marketplace.json` lists them so users can install the whole catalog with one `marketplace add` command.

## Adding a new plugin

1. Create `plugins/<plugin-name>/.claude-plugin/plugin.json`
2. Add components (skills, commands, agents, hooks) under the plugin directory
3. Register the plugin in `.claude-plugin/marketplace.json`

## Standards for skills inside plugins

- Spec first. Drop a `spec.md` in the skill folder before writing `SKILL.md`.
- Secrets in env or shell rc, never hardcoded.
- Self-contained. No external state beyond what the skill documents.
- The `description` field in `SKILL.md` frontmatter must include trigger keywords so the agent activates the skill reliably.
- Imperative voice. Commands, not "you should".
- Keep `SKILL.md` under ~500 lines. Push detail into `references/`.

## License

MIT
