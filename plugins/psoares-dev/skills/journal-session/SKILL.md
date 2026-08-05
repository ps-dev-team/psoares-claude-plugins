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
