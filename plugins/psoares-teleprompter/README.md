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
the app parses (`::chapter`, `::cue`, `::alert`, `::speaker`, `::pause`, `::speed`, `::tab`),
with the exact attributes and the closing `::` line that block directives need.

It covers presenter mode in depth: how consecutive `::tab` blocks form a group, `say="a | b"`
voice cues (the tab title by default), `scroll="on"`/`"off"`, heading cues such as
`## Wrap-up {say="let's wrap it up"}` for leaving a group by voice, and when a part should be a
tab rather than read text. Cue advice follows the desktop app's matcher, so cues are natural to
say and distinct from the surrounding text.

It also sets the style for spoken delivery: short sentences, a natural voice, and text that
voice follow can track word for word.

Triggers on "teleprompter script", "write a video script", "add tabs to this script", "guião
para o teleprompter", and when editing a `.md` script that already uses `::` directives.
