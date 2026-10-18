# psoares-teleprompter

Script writing for the [Markdown Teleprompter](https://github.com/psoaresbj/markdown-teleprompter) app.

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-teleprompter@psoares-claude-plugins
```

## Skills

### `teleprompter-script`

Writes and edits teleprompter scripts in the app's Markdown syntax. It knows every directive
the app parses (`::chapter`, `::cue`, `::alert`, `::speaker`, `::pause`, `::speed`, `::tab`,
`::note`),
with the exact attributes and the closing `::` line that block directives need.

It covers presenter mode in depth: how consecutive `::tab` blocks form a group, `say="a | b"`
voice cues (the tab title by default), `scroll="on"`/`"off"`, heading cues such as
`## Wrap-up {say="let's wrap it up"}` for leaving a group by voice, and when a part should be a
tab rather than read text. Cue advice follows the desktop app's matcher, so cues are natural to
say and distinct from the surrounding text.

It writes `::note` blocks for screen sharing: notes only the presenter sees in the desktop
app's notes window, where the caster stops until a `say="..."` cue written into the script is
said. It knows how tabs and notes show up in that window and writes them, and the headings
before them, so they read well there.

It also sets the style for spoken delivery: short sentences, a natural voice, and text that
voice follow can track word for word.

Triggers on "teleprompter script", "write a video script", "add tabs to this script", "guião
para o teleprompter", and when editing a `.md` script that already uses `::` directives.

### `video-script`

Writes the words of a video recorded one sentence at a time: course lessons, app
walkthroughs, demos, tutorials. One sentence per line, each within one breath (about 15
words), and each line stands alone, so any take can be cut or re-recorded. The script doubles
as the cut list: line N is take N, which lets an editor, or an AI given the script and the
video, match takes to lines.

It loads `human-prose` for the voice, and `teleprompter-script` when the script is read from
the app. Each format has its own reference: `references/lesson.md` for lessons and demos.
Social media is next.
