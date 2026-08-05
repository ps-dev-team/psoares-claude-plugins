# journal-session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `journal-session` skill in the `psoares-dev` plugin that writes a narrative, on-demand journal entry per Claude session into the target project's `docs/journal/`, and release it as `psoares-dev` 0.2.0.

**Architecture:** Pure-Markdown skill — one `SKILL.md` plus a `spec.md`, no scripts, no hooks, no configuration. The skill instructs Claude to reconstruct the session from the live conversation plus `git log`, write `docs/journal/YYYY-MM-DD-<slug>.md` in the target project, and update `docs/journal/README.md` as an index. Release metadata (manifest version, plugin README, marketplace catalog, top-level README) ships in a second commit.

**Tech Stack:** Markdown with YAML frontmatter; `git` and `jq` for verification; `.claude/scripts/validate-release.sh` as the release gate.

## Global Constraints

- Source of truth for all content decisions: `docs/superpowers/specs/2026-08-05-journal-session-design.md`. Where this plan and the spec disagree, the spec wins.
- Journal entries the skill produces are **always written in English**, regardless of project or conversation language. This is a fixed rule in `SKILL.md`, not a runtime decision.
- The skill writes into the **target project** (`docs/journal/`), never into the plugin repo.
- Skill is **write-only**. No read-back mode, no `SessionEnd` hook, no transcript parsing from `~/.claude/projects/`, no per-project config, no scripts.
- Repo standard (top-level `README.md` → "Standards for skills inside plugins"): `spec.md` lives in the skill folder; `SKILL.md` stays under ~500 lines; `description` frontmatter must carry trigger keywords; imperative voice, not "you should".
- `.claude/scripts/validate-release.sh` runs as a `PreToolUse` hook on `git push` and blocks the push on any violation. It must exit 0 before pushing.
- Two commits, in order: `feat(psoares-dev): add journal-session skill`, then `chore(psoares-dev): release 0.2.0`.

---

### Task 1: The `journal-session` skill

**Files:**
- Create: `plugins/psoares-dev/skills/journal-session/spec.md`
- Create: `plugins/psoares-dev/skills/journal-session/SKILL.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: skill directory name `journal-session` and frontmatter `name: journal-session`. Task 2 references this exact name in `plugins/psoares-dev/README.md`, `.claude-plugin/marketplace.json` keywords, and `TODO.md`.

- [ ] **Step 1: Create the skill folder and write `spec.md`**

This is the repo's required "spec first" artefact — a distilled version of the design doc that lives next to the skill. Write to `plugins/psoares-dev/skills/journal-session/spec.md`:

```markdown
# journal-session

## Purpose

Records what happened in a Claude session as a narrative Markdown entry in the target
project's `docs/journal/`. Commits already record *what* changed; this records the part that
dies with the conversation — why one option won over another, what was tried and abandoned,
and what was left open.

## When to Use

On demand, at the end of a session with real substance. Not for mechanical sessions whose
commits already tell the whole story.

## Consumers

- The author weeks later, wanting a readable account of the project.
- The next Claude session, needing to know what is settled (don't reopen) and what already
  failed (don't retry).

## Output

- `docs/journal/README.md` — reverse-chronological index, one line per entry with a hook.
- `docs/journal/YYYY-MM-DD-<slug>.md` — frontmatter (`date`, `title`, `commits`) plus
  narrative body, and an `Open threads` section when something is unfinished.

Committed to git alongside the code. Always written in English.

## Non-Goals

No read-back mode (the index makes it unnecessary), no `SessionEnd` hook, no transcript
parsing, no per-project configuration, no scripts.
```

- [ ] **Step 2: Write `SKILL.md`**

Write to `plugins/psoares-dev/skills/journal-session/SKILL.md`. Note the `description` carries both Portuguese and English triggers, and explicitly states what it does *not* fire on:

````markdown
---
name: journal-session
description: >-
  Use when the user wants to record what happened in a Claude session into the
  project's journal — "regista esta sessão", "faz o journal", "documenta o que
  fizemos", "log this session", "journal this", "write up what we did", "add this
  to the journal". Writes a narrative Markdown entry to docs/journal/ in the
  current project and updates the journal index, capturing the reasoning that
  commits cannot hold: why one option won, what was tried and abandoned, what was
  left open. Do NOT use for "summarise the session" or "resume a sessão" — that is
  a request for prose in the chat, not a file written into the repo.
---

# Journal a session

Commits record *what* changed. They cannot record why option A beat option B, what was tried
and thrown away, or what was left half-finished. That lives in the conversation, and the
conversation dies with the session.

This skill writes it down. Two readers depend on it: the author weeks later, wanting a
readable account of the project, and the next Claude session, needing to know what is settled
and what already failed.

The entry is narrative. Detail about what changed stays in the commits, reachable through the
SHAs in the frontmatter.

## Fixed rules

- **Entries are always written in English**, whatever language the project or the conversation
  uses. Do not infer a language.
- **Write into the target project**, never into the plugin repo: `docs/journal/` relative to
  the project root.
- **Show the entry before writing it.** The journal is committed, so it passes through the
  user first.

## The loop

1. Orient — read the index and the last entry.
2. Bound — work out what has not been journalled yet.
3. Reconstruct — rebuild the session from the conversation, not the diff.
4. Write — narrative, plus `Open threads` if anything is unfinished.
5. Confirm — show it, write it, update the index, propose the commit.

## 1. Orient

Find `docs/journal/` from the repo root (`git rev-parse --show-toplevel`).

If it does not exist, ask before creating it — it puts a new committed directory in the user's
repo. On approval, create `docs/journal/README.md` with the `# Journal` heading and an empty
list, and bound the first entry to the current session only. Do **not** backfill history from
`git log`.

If it exists, read `docs/journal/README.md` and the most recent entry. This tells you where the
story left off and stops you from re-telling what is already written.

## 2. Bound the window

Take the last SHA from the most recent entry's `commits` frontmatter and run:

```bash
git log <last-sha>..HEAD --oneline
```

That is the committed work since the last entry. The conversation in front of you is the rest.

Check `git status` for uncommitted work. Include it in the narrative, but say plainly that it
is not committed yet — an entry that implies work landed when it did not is worse than one that
omits it.

## 3. Reconstruct the session

**The primary source is the conversation you are in, not the git log.** The diff tells you what
changed; only the conversation tells you what was discussed, attempted and rejected. Dead ends
exist nowhere else, and they are half the value of the entry.

Work out:

- What problem the session started from.
- What path it took, including the turns that went nowhere.
- What was decided, and why.
- What is still open.

## 4. Write the entry

Path: `docs/journal/YYYY-MM-DD-<slug>.md`, where the slug is a short kebab-case topic. If an
entry already exists for that date and topic, add a numeric suffix
(`2026-08-05-journaling-skill-2.md`). One file per session, not per day — merging two sessions
loses the boundary that makes them readable.

```markdown
---
date: 2026-08-05
title: Journaling skill
commits: [ccf2ca2, 973abab]
---

Two or three paragraphs telling the session: the problem it started from, the path taken,
where it landed. Bullets where the content is genuinely a list, prose where it is reasoning.

## Open threads
- The index grows without bound; no decision yet on what happens at 200 entries.
```

- `commits` lists the short SHAs covering the session. It is the bridge: the entry carries the
  *why*, the SHAs lead to the *what*.
- `Open threads` is the only fixed section, and it is omitted entirely when nothing is open.
  It is the section the next session reads first.
- Name a file only when the name is part of the story. This is not a changelog.

**Cutting rule: if a sentence could be read straight off `git log`, it does not belong.**
"Updated the wrapper script and bumped the version" is noise. "The version is now baked in at
setup time because resolving it at runtime broke when the plugin cache moved" is the entry.

Then update `docs/journal/README.md` — newest first, one line, with a hook that tells a future
reader why this entry might be worth opening:

```markdown
- [2026-08-05 — Journaling skill](2026-08-05-journaling-skill.md) — settled on index + one file
  per session; SessionEnd hook rejected because it would write noise.
```

## 5. Confirm and commit

Show the user the full entry and the index line. On approval, write both files, then propose
the commit — do not commit unprompted.

```bash
git add docs/journal/
git commit -m "docs(journal): <title>"
```

## Two rules that keep this worth reading

**A session without substance gets no entry.** If the work was mechanical and the commits tell
the whole story, say so and write nothing. Empty entries train the reader to stop opening the
journal, and then the whole thing is dead weight.

**Never invent the why.** If a decision was made and the reasoning never surfaced in the
conversation, record the decision and state that the reasoning was not captured. A plausible
but fabricated rationale is worse than an admitted gap — two months later you cannot tell them
apart.
````

- [ ] **Step 3: Verify the frontmatter passes the release validator's skill check**

The validator requires `name:` and `description:` in every `SKILL.md` frontmatter. Confirm both parse:

Run:
```bash
awk '/^---$/{n++; if (n==2) exit; next} n==1' plugins/psoares-dev/skills/journal-session/SKILL.md \
  | grep -E '^(name|description):'
```
Expected: two matching lines — `name: journal-session` and `description: >-`.

- [ ] **Step 4: Verify `SKILL.md` is within the repo's size standard**

Run: `wc -l plugins/psoares-dev/skills/journal-session/SKILL.md`
Expected: well under 500 (roughly 140–170 lines).

If it exceeded 500, the fix would be moving detail into `references/` — but at this size it will not.

- [ ] **Step 5: Commit**

```bash
git add plugins/psoares-dev/skills/journal-session/
git commit -m "feat(psoares-dev): add journal-session skill

Records what happened in a Claude session as a narrative entry in the
project's docs/journal/ — the reasoning, dead ends and open threads that
commits cannot hold.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Release `psoares-dev` 0.2.0

**Files:**
- Modify: `plugins/psoares-dev/.claude-plugin/plugin.json` (version, description, keywords)
- Modify: `plugins/psoares-dev/README.md` (new skill section)
- Modify: `.claude-plugin/marketplace.json` (`psoares-dev` description and keywords)
- Modify: `README.md` (add the missing `psoares-dev` row to the plugins table)
- Modify: `TODO.md` (record the skill under Done)

**Interfaces:**
- Consumes: skill name `journal-session` from Task 1.
- Produces: nothing downstream. This is the final task.

**Note on the top-level README:** the `psoares-dev` row was never added when the plugin
shipped in `ccf2ca2`. `validate-release.sh` greps the top-level README for every plugin
directory name, so it is already failing on `main` independently of this work. Step 4 fixes it.

- [ ] **Step 1: Confirm the release validator currently fails, and why**

Run: `bash .claude/scripts/validate-release.sh; echo "exit=$?"`
Expected: `exit=2`, with `psoares-dev: not mentioned in the top-level README.md` among the listed issues.

This is the pre-existing breakage. Seeing it fail first is how you know Step 4's fix is the thing that clears it.

- [ ] **Step 2: Bump the manifest to 0.2.0**

In `plugins/psoares-dev/.claude-plugin/plugin.json`, set `version` to `0.2.0` and widen the description and keywords to cover both skills:

```json
{
  "name": "psoares-dev",
  "version": "0.2.0",
  "description": "Development workflow tooling. Includes create-github-issue for filing grounded, well-scoped GitHub issues from the codebase, and journal-session for recording what happened in a Claude session as a narrative project journal.",
  "author": {
    "name": "Paulo Soares"
  },
  "license": "MIT",
  "keywords": ["github", "issues", "workflow", "dev", "gh", "tickets", "journal", "session", "documentation"]
}
```

- [ ] **Step 3: Add the skill section to the plugin README**

In `plugins/psoares-dev/README.md`, append after the existing `### create-github-issue` section:

```markdown
### `journal-session`

Writes a narrative journal entry for the current Claude session into the project's
`docs/journal/`, and keeps an index at `docs/journal/README.md`. Commits record *what*
changed; this records what dies with the conversation — why one option won over another,
what was tried and abandoned, and what was left open.

Invoked on demand ("regista esta sessão", "journal this", "log this session"), never
automatically. The entry is narrative rather than a changelog: detail about the changes
stays in the commits, reachable through the SHAs in the entry's frontmatter. Entries are
always written in English. A session whose commits already tell the whole story gets no
entry — the skill says so instead of writing filler.
```

- [ ] **Step 4: Add the missing `psoares-dev` row to the top-level README**

In `README.md`, append this row to the plugins table, after the `psoares-content-extract` row:

```markdown
| [`psoares-dev`](plugins/psoares-dev) | Development workflow tooling. Ships `create-github-issue` for grounded GitHub issues and `journal-session` for narrative project journals. |
```

- [ ] **Step 5: Update the marketplace catalog entry**

In `.claude-plugin/marketplace.json`, replace the `psoares-dev` entry's `description` and `keywords` (leave `name`, `source` and `category` untouched):

```json
    {
      "name": "psoares-dev",
      "source": "./plugins/psoares-dev",
      "description": "Development workflow tooling. Skills: create-github-issue for filing grounded, well-scoped GitHub issues from the codebase, and journal-session for recording what happened in a Claude session as a narrative project journal.",
      "category": "dev",
      "keywords": ["github", "issues", "workflow", "dev", "gh", "tickets", "journal", "session", "documentation"]
    }
```

- [ ] **Step 6: Verify the JSON is still valid**

Run: `jq . .claude-plugin/marketplace.json > /dev/null && jq . plugins/psoares-dev/.claude-plugin/plugin.json > /dev/null && echo "json ok"`
Expected: `json ok`

- [ ] **Step 7: Record the skill in TODO.md**

In `TODO.md`, add under `## Done`:

```markdown
- [x] **journal-session** — Narrative per-session journal in `docs/journal/` (in `psoares-dev`)
```

- [ ] **Step 8: Verify the release validator now passes**

Run: `bash .claude/scripts/validate-release.sh; echo "exit=$?"`
Expected: `exit=0` and `✓ validate-release: all plugins are ready for distribution (4 plugin(s))`

If it still fails, read the listed issues — each one names the plugin and the missing artefact.

- [ ] **Step 9: Commit**

```bash
git add plugins/psoares-dev/.claude-plugin/plugin.json plugins/psoares-dev/README.md \
        .claude-plugin/marketplace.json README.md TODO.md
git commit -m "chore(psoares-dev): release 0.2.0

Ships the journal-session skill. Also adds the psoares-dev row that was
missing from the top-level README table since ccf2ca2, which was failing
the release validator.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verification after both tasks

The skill has no test suite — it is Markdown that Claude reads. What can actually be checked:

1. `bash .claude/scripts/validate-release.sh` exits 0.
2. `git log --oneline -3` shows both commits plus the spec commit.
3. Restart Claude Code and confirm `journal-session` appears in the skills list with the
   expected description.

The real test is behavioural and belongs to first use: run the skill on an actual session and
check that the entry reads like something worth re-reading, and that it did not restate the
git log. If it produces filler, the fix is tightening the cutting rule in `SKILL.md`, not
adding structure.
