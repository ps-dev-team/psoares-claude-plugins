# psoares-teleprompter

The script format of the [Markdown Teleprompter](https://github.com/psoaresbj/markdown-teleprompter) app.

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-teleprompter@psoares-claude-plugins
```

The words of a script come from `psoares-writing` (`video-script`, `storytelling`, `hooks`).
This plugin lays them out for the app.

## Skills

### `teleprompter-script`

Lays out a script the way the app reads it. It knows every directive the app parses
(`::chapter`, `::cue`, `::alert`, `::speaker`, `::pause`, `::speed`, `::tab`, `::note`), with
the exact attributes and the closing `::` line that block directives need.

It covers presenter mode in depth: how consecutive `::tab` blocks form a group, `say="a | b"`
voice cues (the tab title by default), `scroll="on"`/`"off"`, heading cues such as
`## Wrap-up {say="let's wrap it up"}` for leaving a group by voice, and when a part should be
talked over from bullet points in a tab rather than read word for word. Cue advice follows the
desktop app's matcher, so cues are natural to say and distinct from the surrounding text.

It writes `::note` blocks for screen sharing: notes only the presenter sees in the desktop
app's notes window, where the caster stops until a `say="..."` cue written into the script is
said. It knows how tabs and notes show up in that window and writes them, and the headings
before them, so they read well there.

It formats the read text it is given and does not rewrite it; the only limits it sets are the
ones voice follow needs (no asides in read text, numbers written as said).

Triggers on "teleprompter script", "format for the teleprompter", "add tabs to this script",
"guião para o teleprompter", and when editing a `.md` script that already uses `::` directives.

## History

Until 0.4.0 this plugin also had `video-script` and `storytelling`. Since 0.5.0 they live in
`psoares-writing`, with the new `hooks` skill.
