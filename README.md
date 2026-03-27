# psoares-skills

Reusable AI coding skills by Paulo Soares. Each skill is platform-agnostic at its core, with implementations for OpenClaw and Claude Code.

## Structure

```
skills/
├── skill-name/
│   ├── README.md              # What this skill does (platform-agnostic)
│   ├── openclaw/
│   │   └── SKILL.md           # OpenClaw format
│   └── claude-code/
│       └── skill.md           # Claude Code format
```

## Supported Conventions

| Platform | Entry Point | Notes |
|----------|-------------|-------|
| **OpenClaw** | `SKILL.md` | Supports references/, scripts/, examples/ subfolders. [Docs](https://docs.openclaw.ai/tools/skills) |
| **Claude Code** | `skill.md` | Goes in `.claude/skills/` in the target project. [Docs](https://docs.anthropic.com/en/docs/claude-code/skills) |

## How to Use

### OpenClaw

Symlink or copy the skill folder into your workspace `skills/` directory:

```bash
ln -s /path/to/psoares-skills/skills/skill-name/openclaw /path/to/workspace/skills/skill-name
```

### Claude Code

Copy the skill file into your project:

```bash
mkdir -p .claude/skills
cp /path/to/psoares-skills/skills/skill-name/claude-code/skill.md .claude/skills/skill-name.md
```

## Workflow

1. Create `skills/<name>/spec.md` — plan the skill first
2. Review and refine the spec
3. Build the skill using Claude Code

## Standards

- **Spec first** — Every skill starts with a `spec.md` in its folder
- **Secrets in env or rc** — API keys go in `.env` or shell rc, never hardcoded
- **Self-contained** — No external state beyond documented requirements
- **"When to Use" required** — Every skill must explain when to apply it
- **Imperative style** — Commands, not "you should"
- **Relative paths** — Use `{baseDir}` to reference skill directory
- **Concise** — Say what's needed, nothing more

## Skills

*No skills yet. See [TODO.md](TODO.md) for planned skills.*

## License

MIT
