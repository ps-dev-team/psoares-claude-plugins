# teleprompter-script

## Purpose

Writes and edits scripts for the Markdown Teleprompter app (web caster and desktop app with
presenter mode). The scripts are Markdown files with the app's `::` directives. The skill
carries the exact syntax, taken from the app's source, plus the rules for writing text that
is read aloud and followed by voice.

## When to Use

The user asks to write, draft, format, rewrite or fix a teleprompter script, a video script or
a talk script for this app, or edits a `.md` script that already uses `::` directives.

## Source of Truth

The syntax comes from the app repo (`markdown-teleprompter`), not from memory:

- `apps/web/src/lib/snippets.ts`: every directive the editor offers
- `apps/web/src/lib/mdc/remarkMdc.ts`, `parser.ts`: how block and inline directives are parsed
- `apps/web/src/components/cast/markdownComponents.tsx`: which directives render
- `apps/web/src/lib/presenter/segments.ts`: tab groups, `say` cues, heading attributes
- `apps/desktop/src/main/navigator.ts`: how spoken cues are matched
- `PLAN_PRESENTER.md`: presenter mode behaviour

When the app changes its syntax, update `SKILL.md` from these files.

## Output

A complete script as Markdown, either written to the file the user names or returned in a
code block. Optional YAML frontmatter with `title` and `tags`.

## Non-Goals

No rendering, no preview, no recording workflow, no editing of the app itself. No syntax that
the parser does not support.
