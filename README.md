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

## Skills

*No skills yet. Check back soon.*

## License

MIT
