# journal-session — design

**Date:** 2026-08-05
**Plugin:** `psoares-dev`
**Status:** approved, ready for implementation planning

## Problem

Work done with Claude across one or many sessions leaves behind commits, but commits only
record *what* changed. What gets lost is everything around the change: why option A was
chosen over B, what was tried and abandoned, and what was left unfinished. That context
lives in the conversation, and the conversation disappears when the session ends.

Two readers need it back:

- **The author, weeks later**, who wants a readable account of what happened in a project.
- **The next Claude session**, which needs to know what is already decided (don't reopen)
  and what already failed (don't retry).

A single narrative entry per session serves both.

## Solution

One skill, `journal-session`, invoked on demand. It reconstructs the session from the live
conversation plus the commits since the last entry, and writes a narrative Markdown entry
into the project's journal, then updates an index.

Writing only. There is no read-back mode — see *Rejected alternatives*.

## Artefacts on disk

The skill writes into the target project (not into the plugin repo):

```
docs/journal/
├── README.md                          # index
├── 2026-08-05-journaling-skill.md
└── 2026-08-04-statusline-wrapper.md
```

Committed to git, alongside the code.

### Index — `docs/journal/README.md`

Reverse-chronological, one line per entry, each with a hook that tells the reader why the
entry might be worth opening. Same shape as a `MEMORY.md` index.

```markdown
# Journal

- [2026-08-05 — Journaling skill](2026-08-05-journaling-skill.md) — settled on index + one
  file per session; SessionEnd hook rejected because it would write noise.
- [2026-08-04 — Statusline wrapper](2026-08-04-statusline-wrapper.md) — version is now baked
  in at setup time instead of resolved at runtime.
```

### Entry — `docs/journal/YYYY-MM-DD-<slug>.md`

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

- `commits` is the bridge: the entry carries the *why*, the SHAs lead to the *what*.
- `Open threads` is the only fixed section, and it is omitted when there is nothing open.
  This is the section the next session reads first.
- Files are named only when the name is part of the story — never as a changelog.

## Language

**Entries are always written in English**, regardless of the project's language or the
language of the conversation. Fixed rule, no runtime discovery.

## How the skill works

1. **Orient** — locate `docs/journal/`, or propose creating it. Read the index and the most
   recent entry to know where the story left off.
2. **Bound the window** — determine what has not been journalled yet.
   `git log <last-entry-sha>..HEAD` gives the commits since the last entry; the live
   conversation gives the rest. Uncommitted work is included but explicitly marked as such.
3. **Reconstruct** — the primary source is the conversation in front of the skill, not the
   git log. The diff says what changed; the conversation says what was discussed, attempted
   and rejected. Dead ends exist nowhere else, and are half the value of the entry.
4. **Write** — narrative first, `Open threads` if applicable. Cutting rule: if a sentence
   could be read straight off `git log`, it does not belong.
5. **Confirm and commit** — the entry goes into a committed repo, so it is shown to the user
   before being written. Write the file, update the index, then propose the commit without
   making it unprompted.

## Rules that keep the journal worth reading

- **A session without substance gets no entry.** If the work was mechanical and the commits
  tell the whole story, the skill says so and writes nothing. Empty entries train the reader
  to stop opening the journal.
- **Never invent the why.** If a decision was made and the reasoning never surfaced in the
  conversation, record the decision and state that the reasoning was not captured. A
  plausible but fabricated rationale is worse than an admitted gap — two months later the
  two are indistinguishable.

## Edge cases

- **Two sessions in one day** — the second entry gets a numeric suffix on the slug
  (`2026-08-05-journaling-skill-2.md`). One file per session, not per day; merging two
  sessions loses the boundary that makes them readable.
- **Index growth** — deliberately unsolved. At ~200 entries grouping or archiving will be
  needed, but designing for it now solves a problem that does not exist yet. The skill
  writes reverse-chronological and nothing more.
- **No prior journal** — the skill offers to create `docs/journal/` with an index, and
  bounds the first entry to the current session only. It does not attempt to backfill
  history from `git log`.

## Triggering

Skill name: `journal-session`.

Fires on: "regista esta sessão", "faz o journal", "documenta o que fizemos", "log this
session", "journal this", "write up what we did".

Deliberately does **not** fire on "resume a sessão" / "summarise the session" — that is a
request for prose in chat, not for a file written into the repo.

## Rejected alternatives

- **`SessionEnd` hook.** Zero friction, but it writes on every session including trivial
  ones, and the pruning burden lands on the user. On-demand invocation is the honest
  trade-off.
- **Read-back mode in the same skill.** The index exists precisely to make this unnecessary:
  Claude reads `README.md`, scans the hooks, opens the two relevant entries. No skill needed.
- **Full session log** (objective / what was done / files touched / next steps). Duplicates
  git and tends toward verbose summaries nobody reads.
- **Reading transcripts from `~/.claude/projects/`.** The skill already runs inside the
  session it is journalling; reading transcript files adds fragility for no gain.
- **Per-project configuration** (location, gitignored vs committed). One default,
  `docs/journal/` committed. Revisit only with real evidence that it is needed.

## Out of scope

No hooks, no scripts, no configuration file, no transcript parsing. If any of these turn out
to be necessary, they are a second iteration backed by actual use.

## Shipping

The skill is not done until the plugin ships it. Two commits:

1. `feat(psoares-dev): add journal-session skill`
   — `plugins/psoares-dev/skills/journal-session/spec.md` (repo standard: spec lives in the
     skill folder; this design doc is the source it is distilled from)
   — `plugins/psoares-dev/skills/journal-session/SKILL.md`
2. `chore(psoares-dev): release 0.2.0`
   — `plugins/psoares-dev/.claude-plugin/plugin.json` → version `0.2.0`, description and
     keywords updated to mention journalling
   — `plugins/psoares-dev/README.md` → new skill section
   — `.claude-plugin/marketplace.json` → `psoares-dev` description and keywords updated
   — `README.md` (top level) → add the missing `psoares-dev` row to the plugins table
   — `TODO.md` → record the skill under Done

### Pre-existing breakage to fix in the same pass

The top-level `README.md` plugins table never got a `psoares-dev` row when the plugin was
added in `ccf2ca2`. `.claude/scripts/validate-release.sh` greps the top-level README for every
plugin directory name and blocks the push when one is missing, so the release validator is
already failing on `main` independently of this work. Adding the row is part of commit 2.

`.claude/scripts/validate-release.sh` runs on `git push` and enforces manifest/README/catalog
coverage; it must pass before pushing.
