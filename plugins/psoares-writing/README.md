# psoares-writing

Writing for videos and content: the opening, the structure, and the lines.

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-writing@psoares-claude-plugins
```

The voice comes from `human-prose` in `s2-writing`
([s2-ai-labs/s2-ai-skills](https://github.com/s2-ai-labs/s2-ai-skills)). To read a script from
the Markdown Teleprompter app, add `psoares-teleprompter`.

## Skills

### `hooks`

Writes, fixes and reviews the opening of a video or post. It gives several hook options, each
in a different format (fortune teller, experimenter, teacher, magician, investigator,
contrarian), built with one formula: lean in, stop, snap back. Each option comes with the
spoken lines, the text on screen and the visual lined up, plus the lock-in zone: the one to
four lines after the hook that confirm it and earn trust (proof, transformation, contrast, a
named method, the objection answered, the claim said twice).

Fixing and reviewing check four mistakes in order: delay, confusion, irrelevance and
disinterest. For long-form YouTube, the hook and the lock-in zone are the intro, and they
confirm the title and the thumbnail.

References: `formats.md` (the six formats and sentence templates), `layers.md` (spoken, text,
visual and audio hooks, and the text hook rules), `lock-in.md` (the six methods), `review.md`
(the four mistakes and a checklist) and `examples.md` (worked examples, with PT-PT).

Built from five videos by Kallaway on hooks; the links are in the skill.

### `storytelling`

Shapes the story inside a video, a reel, an email or a sales call so people keep watching. It
picks the angle, writes the last line first, sets the stakes (a character, a risk, a deadline)
and runs the loop through the middle: a big question the viewer can guess at, a head fake that
breaks the guess, and a re-hook that opens the next question as the last one closes. Beats join
with "but" or "therefore", never "and then".

Three modes: write a story from notes, rewrite a flat story into a looped one, and review a
script against seven common mistakes. References: `frameworks.md` (the loop, the viewer's
ladder, the modern arc, the hook order), `review.md` (the mistakes and a checklist) and
`examples.md` (a flat and looped story, hooks, lenses).

Built from Kane Kallaway's
[How to Master Storytelling](https://www.youtube.com/watch?v=WluuZB_ck9Q).

### `video-script`

Writes the words of a video recorded one sentence at a time: course lessons, app
walkthroughs, demos, tutorials. One sentence per line, each within one breath (about 15
words), with lists wherever a line names things, so they are read with intention and can show
on screen. The script doubles as the cut list: line N is take N, which lets an editor, or an
AI given the script and the video, match takes to lines.

It keeps the speaker's hard words in a `hard-words.md` beside the scripts. Each format has its
own reference: `references/lesson.md` for lessons and demos. Social media is next.

## History

`storytelling` and `video-script` were in `psoares-teleprompter` until 0.4.0. An earlier
`psoares-writing` (human-prose, product-copy, ui-copy, prd-prose) moved to `s2-writing`; this
one starts at 0.4.0 so it installs over any cached copy of the old one.
