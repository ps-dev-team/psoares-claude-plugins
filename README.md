# psoares-skills

Reusable AI coding skills by Paulo Soares, following the [Agent Skills](https://agentskills.io/specification) open format. Compatible with Claude Code, VS Code, and any agent that supports the spec.

## Structure

```
skills/
├── skill-name/
│   ├── SKILL.md              # Required: metadata + instructions
│   ├── spec.md               # Skill spec (planning artifact)
│   ├── scripts/              # Optional: executable code
│   ├── references/           # Optional: documentation
│   └── assets/               # Optional: templates, resources
```

Each `SKILL.md` uses YAML frontmatter per the [Agent Skills spec](https://agentskills.io/specification):

```yaml
---
name: skill-name
description: What this skill does and when to use it.
license: MIT
metadata:
  author: psoares
---
```

## How to Use

Symlink or copy the skill folder into your project's skills directory:

```bash
ln -s /path/to/psoares-skills/skills/skill-name /path/to/project/skills/skill-name
```

For Claude Code specifically, skills go in `.claude/skills/`:

```bash
ln -s /path/to/psoares-skills/skills/skill-name .claude/skills/skill-name
```

## Workflow

1. Create `skills/<name>/spec.md` — plan the skill first
2. Review and refine the spec
3. Build `SKILL.md` with frontmatter and instructions

## Standards

- **Spec first** — Every skill starts with a `spec.md` in its folder
- **Secrets in env or rc** — API keys go in `.env` or shell rc, never hardcoded
- **Self-contained** — No external state beyond documented requirements
- **Description triggers** — The `description` field must include keywords that help agents identify when to activate the skill
- **Imperative style** — Commands, not "you should"
- **Relative paths** — Reference files relative to skill root
- **Concise** — Keep `SKILL.md` under 500 lines; move detail to `references/`

## Skills

*No skills yet. See [TODO.md](TODO.md) for planned skills.*

## License

MIT
