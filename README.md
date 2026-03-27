# psoares-skills

Reusable AI coding skills by Paulo Soares. Each skill is platform-agnostic at its core, with implementations for multiple AI tool conventions.

## Structure

```
skills/
├── skill-name/
│   ├── README.md              # What this skill does (platform-agnostic)
│   ├── openclaw/
│   │   └── SKILL.md           # OpenClaw format
│   ├── claude-code/
│   │   └── skill.md           # Claude Code format
│   └── cursor/
│       └── skill-name.mdc     # Cursor rules format
```

## Supported Conventions

| Platform | Entry Point | Notes |
|----------|-------------|-------|
| **OpenClaw** | `SKILL.md` | Supports references/, scripts/, examples/ subfolders |
| **Claude Code** | `skill.md` | Goes in `.claude/skills/` in the target project |
| **Cursor** | `*.mdc` | Frontmatter with `globs` for path-scoped rules |

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

### Cursor

Copy the rule file into your project:

```bash
mkdir -p .cursor/rules
cp /path/to/psoares-skills/skills/skill-name/cursor/skill-name.mdc .cursor/rules/
```

## Skills

*No skills yet. Check back soon.*

## License

MIT
