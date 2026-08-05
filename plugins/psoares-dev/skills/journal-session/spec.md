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
