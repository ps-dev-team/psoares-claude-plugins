# psoares-dev

Development workflow tooling for Claude Code.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-dev@psoares-claude-plugins
```

## Skills

### `create-github-issue`

Files grounded, well-scoped GitHub issues from the codebase instead of one-line notes.
Before creating anything it investigates: reads the repo's orientation docs, finds the
relevant code and grounds the issue in real `path:line` references, works out which
package/area the change touches (and which it explicitly does **not**), and picks the
correct **existing** labels from `gh label list` — never inventing them.

Repository-agnostic by design: it discovers each project's structure, label vocabulary,
language and conventions at runtime, so the same skill works across any repo (monorepo or
single service, any stack, any language). It matches the language the team writes issues in
and follows `.github/ISSUE_TEMPLATE/` when present.

Triggers on "abrir/criar um ticket/issue", "file a bug", "let's track this", and similar —
bug reports, feature requests, tech-debt, or exploratory/spike tickets. Requires the GitHub
CLI (`gh`) installed and authenticated.
