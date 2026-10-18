---
name: teleprompter-script
description: >-
  Use when writing, drafting, formatting, rewriting or fixing a script for the
  Markdown Teleprompter app: YouTube or course videos, talks, demos, screen
  recordings, presentations read from a prompter. Covers the app's Markdown
  directives (::chapter, ::cue, ::alert, ::speaker, ::pause, ::speed, ::tab,
  ::note), presenter notes for screen sharing,
  presenter tabs with say="..." voice cues, heading cues like
  ## Wrap-up {say="..."}, scroll="on"/"off", and how to write text that sounds
  natural when read aloud and works with voice follow. Trigger phrases:
  "teleprompter script", "write a video script", "script for the prompter",
  "add tabs to this script", "presenter tabs", "voice cues", "guião para o
  teleprompter", "escreve o guião do vídeo", "formata para o teleprompter".
  Also use when editing any .md script that already contains :: directives.
---

# Teleprompter scripts

Scripts for Markdown Teleprompter are plain Markdown files with a small set of `::` directives.
The caster scrolls the text past a reading line. The desktop app can listen on the Mac: it
follows the reading by matching spoken words to the script, and inside presenter tabs it
switches when a cue written in the script is said.

Write only the syntax below. It is taken from the app's parser. Anything else shows up on the
prompter as literal text or is ignored.

## Workflow

1. Find out what the script is for: video, talk, demo, course lesson. Ask about length,
   audience, language and which parts are read word for word versus presented freely.
2. Outline the sections. Mark which parts are read and which are improvised demos (tabs).
3. Write the read text for the ear (see "Writing for spoken delivery").
4. Add directives only where they help the person at the camera.
5. Run the checklist at the end before handing the script over.
6. Save to the path the user names. Scripts usually live in a folder of `.md` files. Without a
   path, return the script in one fenced `markdown` code block.

Write in the language the user asks for. Directive names and attribute names stay in English.

## File shape

Optional YAML frontmatter, then Markdown:

```markdown
---
title: "Episode 12 - Smart Folders"
tags: [youtube, demo]
---

# Episode 12

Hi, and welcome back.
```

`title` is the script's name in the app. `tags` is a list in brackets.

Standard Markdown works: `#` to `######` headings, `**bold**` for a stressed word, `*italic*`
for lighter emphasis, `-` and `1.` lists, `> quote`, `---` divider, tables, inline code and
code blocks. Headings `#`, `##` and `###` are section stops for Enter / Shift+Enter navigation.

## Directive rules that apply to all of them

- Every directive starts at the beginning of its own line.
- Attributes go in braces right after the name: `{key="value" other="value"}`. Values in double
  quotes may contain spaces and apostrophes, but not `"` or `}`.
- Number-only directives take a bare value: `::pause{5}`, `::speed{0.8}`.
- **Block** directives (`::cue`, `::alert`, `::tab`, `::note`) have content on the lines after the opening
  line and end with a line that is only `::`. Never forget the closing `::`.
- **Line** directives (`::chapter`, `::speaker`, `::pause`, `::speed`) are a single line with no
  closing `::`.
- Put a blank line before and after every directive.
- In normal flow, a block cannot contain another directive: no line inside a `::cue`,
  `::alert` or `::note` may start with `::`. Only a `::tab` can hold nested `::cue`, `::alert`
  and `::note` blocks.

## Directive reference

### Chapter

```markdown
::chapter{title="Introduction"}
```

A named part you can jump to (Left/Right outside tabs). Shown as a small divider with the
title. `::chapter` with no title is an invisible break. Content before the first chapter is its
own chapter. Keep the line exactly as shown, with nothing after the closing brace. A chapter
can carry a voice cue for leaving a tab group: `::chapter{title="Pricing" say="let's talk money"}`.

Use chapters for big parts of a long script, roughly every 2 to 5 minutes.

### Cue (stage direction)

```markdown
::cue
Switch to the screen recording.
::
```

A direction for the presenter, shown as a muted pill with a clapper icon. Not meant to be read
aloud. Use it for actions, camera changes, B-roll, slides, demos. Keep it to one short line.

### Alert

```markdown
::alert{type="tip"}
Smile here. This is the hook.
::
```

A reminder in a colored box. `type` is `info` (default), `warning`, `tip` or `danger`. Use it
sparingly for something that must not be missed: a fact to double-check, a legal line, an
energy reminder.

### Speaker

```markdown
::speaker{name="Ana"}
```

Shows who speaks next. Use it in interviews, dialogues and scripts with more than one host.
Without `name` it shows "Speaker".

### Pause

```markdown
::pause

::pause{3}
```

Stops scrolling when it reaches the reading line. `::pause` waits for a manual resume.
`::pause{3}` resumes after 3 seconds. Use 2 seconds after a rhetorical question, 3 to 5 after
a dense idea, 5 or more before a demo or an interaction.

### Speed

```markdown
::speed{0.8}

::speed{1}
```

Changes the scroll speed from this point on, as a multiplier of the base speed: `0.5` is half,
`2` is double. It stays in effect until the next `::speed`, so reset with `::speed{1}`. Place it
before the passage it affects. Slow down (0.7 to 0.9) for technical terms or numbers, speed up
(1.1 to 1.3) for a recap.

### Tab

```markdown
::tab{title="Smart Folders" say="let's talk about folders" scroll="off"}
- Create a folder
- Drag a script in
::
```

A mini script for a part you present instead of read. See the next section.

### Note

```markdown
::note{title="Demo setup" say="okay, back to the script"}
- Close Slack
- Log in to the demo account
::
```

Notes for the presenter while they share their screen. See "Presenter notes" below.

## Presenter tabs

### What they are

A video often mixes reading to camera with presenting freely: a software demo, a walkthrough,
a part you know well. Tabs are for the second kind. When the prompter reaches a group of tabs,
the group becomes active and the presenter switches between its tabs in any order, by voice,
keyboard (Left/Right, 1-9), or Stream Deck. Enter moves on to the next section, Shift+Enter goes
back. A fixed tab pauses playback when it reaches the reading line so it stays put while you
talk.

### Writing a group

- Each `::tab{...}` block ends with its own `::` line.
- Tabs that follow each other form one group. Blank lines between them are fine. There is no
  wrapper to declare.
- The first thing that is not a tab ends the group: a heading, a paragraph, a `::cue`, anything.
- Two groups with nothing between them merge into one. Put a heading or text between them to
  keep them apart.
- A tab without `title` is named "Tab 1", "Tab 2" and so on. Always give a title.
- A tab body can hold any Markdown: lists, paragraphs, bold, and nested `::cue` and `::alert`
  blocks, each closed by its own `::`. The tab closes on the `::` after them. Do not nest a
  `::tab` inside a tab.

### Attributes

| Attribute | Values | Default |
| --- | --- | --- |
| `title` | Name shown in the tab strip | `Tab N` |
| `say` | Phrase that opens this tab by voice. Several separated with `\|` | The title |
| `scroll` | `off`: fixed card. `on`: scrolls like the main script | Fixed if it fits on one screen, otherwise scrolls |

`scroll="off"` is for a short list to glance at while talking. `scroll="on"` is for a long tab
that is a real mini script, read word by word: it scrolls at the set speed, or follows the
voice when listening. Leave `scroll` out when unsure; the app picks based on length.

### Voice cues on tabs

`say` is the phrase that opens the tab when said aloud while the group is active. Without
`say`, the title is the cue. Give several ways to say it with `|`:

```markdown
::tab{title="Live Caster" scroll="on" say="the caster window|let's look at the caster"}
```

Voice switching only happens inside an active tab group. While the presenter reads normal flow,
speech never moves the prompter anywhere except by following the reading.

### Leaving a group by voice: heading cues

Inside a group, the presenter can also say the cue of the section right after the group (to
move on) or right before it (to go back). A section's cue is written at the end of its heading:

```markdown
## Wrap-up {say="let's wrap it up"}
```

The `{say="..."}` part is removed before the heading is shown. Without it, the heading text is
the cue. `|` gives several options: `## Thank you {say="thanks for watching|that's all for today"}`.
`::chapter{title="..." say="..."}` works the same way.

The "next section" is the first heading or chapter in the flow after the group. If the text
after a group has no heading, the next section is its first line and has no cue at all. So
**always start the part after a tab group with a heading**, and give it a `say` cue when the
heading text is not something you would say naturally ("Wrap-up", "Part 3").

### How cues are matched

From the desktop app's matcher, so write cues that it can hear:

- Small words are ignored: a, about, an, and, it, its, let's, now, of, ok, okay, our, so, that,
  the, this, to, us, we. "let's wrap this up" matches "let's wrap it up".
- The remaining key words must be said in order, close together (up to 3 words apart).
- Cues with 1 to 3 key words need every one of them. Longer cues allow one to be missed.
- The transcript while presenting a tab is checked against the other tabs' cues and the
  previous and next section cues. Anything you say in a tab can trigger a switch.

What this means for writing:

- Make every cue distinct from the others in the group and from the words the presenter will
  say inside the tabs. If the Smart Folders tab talks about "the caster", a cue "the caster"
  for another tab will fire in the middle of the demo.
- Prefer 2 to 4 key words. One key word ("folders", "voice") fires too easily; a long sentence
  is hard to say the same way twice.
- Write cues the presenter would say anyway as a transition: "let's look at the caster",
  "let's wrap it up", "is it private". The cue doubles as the spoken segue.
- Avoid cues made only of small words ("let's do this"): they are matched as written and are
  common in normal speech.
- Use `|` for the two or three natural ways to say the same transition.

### When to use tabs and when to use read text

Use tabs for:

- Live demos where the order may change, with a few bullet reminders per feature.
- Topics the presenter knows and talks over from bullet points.
- FAQ-style parts where any question can come next.
- A long passage tied to one topic that should stay out of the main flow (`scroll="on"`).

Use normal read text for:

- The hook, intro, transitions and outro, where exact wording matters.
- Anything with precise facts, numbers, names or legal lines.
- Linear explanations that only make sense in one order.

Tab bullets are prompts, not sentences to read: 3 to 6 short items, a few words each. Put the
lead-in to a group in the read text just before it ("Let me show you three features.") and a
heading with a cue right after it.

## Presenter notes

### What they are

A `::note` is for the presenter's eyes only, for the moments they leave the script to show
their screen: the steps of a demo, what to have open, a demo password, a number to quote. It is
never shown on the caster. The desktop app shows it in the notes window, a small panel kept on
the screen being shared or recorded and hidden from the recording.

On the caster, the note's place shows as a marker with its title and the sentence to say. When
the marker reaches the reading line the caster stops: playback pauses and voice follow waits. The
presenter does the demo with the note in front of them, then says the note's cue to go on with
the script. Space, Enter or the Stream Deck play key also continue.

### Attributes

| Attribute | Values | Default |
| --- | --- | --- |
| `title` | Name shown on the caster marker and in the notes window | `Note` |
| `say` | Phrase that continues the script after the note. Several separated with `\|` | The next heading's cue |

### Writing the continue cue

The `say` phrase is what the presenter says coming back from the screen to the script, so write
it into the script as part of the talk: the first words of the read text right after the note
are a good place, or a segue the presenter will naturally say. It follows the same matching
rules as tab cues (see "How cues are matched"): 2 to 4 key words, distinct from what the
presenter will say during the demo.

```markdown
Let me show you how it looks on a real project.

::note{title="Project demo" say="okay, back to the script|that's the project"}
1. Open the sample project
2. Run the build
3. Show the output folder
::

Okay, back to the script. What you just saw takes five minutes to set up.
```

Without `say`, the next heading's cue continues, so a note right before a heading with a good
`{say="..."}` cue needs no `say` of its own. A note followed only by text and no `say` can be
continued with the keyboard only; always give it a `say`.

### Notes in a row and notes in tabs

- Notes with only blank lines between them are shown together in the notes window, like tabs,
  and each one stops the caster in turn, each with its own cue. Prefer one note with a list over
  several notes in a row, unless the presenter really stops between them.
- A `::note` inside a `::tab` shows in the notes window only, as a highlighted block in that tab.
  The caster leaves it out of the tab and does not stop for it. Use it for details the
  presenter needs during the demo but should not see on the prompter: a password, an exact menu
  path, a file name.
- A note's content is any Markdown without directives: lists, short paragraphs, bold.

### When to use a note, a tab or a cue

- **`::cue`**: a one-line direction the presenter sees on the caster as they read ("Switch to
  the screen recording."). The script keeps scrolling.
- **`::tab`**: a part presented freely from the prompter, with reminders on the caster itself,
  in any order.
- **`::note`**: the presenter leaves the prompter to share their screen and needs the reminders
  next to what they are showing. The caster waits until they come back.

## The notes window

The desktop app also shows the tabs in a notes window (Caster > Open Notes, Cmd+Option+Enter): a
small see-through panel the presenter keeps on the screen they are presenting or recording, so
the demo reminders sit next to the app being shown. It is hidden from screen recordings unless
the presenter turns that off.

What it shows comes from the script, so the way tabs are written decides how useful it is:

- It shows the tab groups and the notes, one tab or note at a time, with the same tab strip.
  Read text, cues and alerts outside tabs and notes are not shown.
- It follows the caster: it opens the tab group the caster enters and the note the caster stops
  at.
- Each tab group or run of notes is named after the heading or chapter just before it, in the
  selector at the top of the window. Put a short, distinct heading before each one ("Three
  features", "Demo setup"), not a long sentence.
- Short tab titles fit the strip. Two or three words each.
- The window is small and glanced at sideways: lists of a few words read better than
  paragraphs. A `scroll="on"` tab still works there, but the presenter has to scroll it by
  hand, so keep demo tabs as short lists and use `scroll="on"` only for real mini scripts.
- Lists in tabs keep their order and numbering. A numbered list (`1.`) is right for steps that
  must happen in order, a `-` list for points in any order.
- A `::cue` or `::alert` inside a tab shows in the notes too, which makes it a good place for a
  reminder like "use the demo account" that should be in front of the presenter during the
  demo.

## Writing for spoken delivery

The text is read aloud from a moving screen, and voice follow matches the spoken words against
the written ones. Text that reads well on paper often fails both tests.

- **Short sentences.** One idea per sentence. One or two sentences per paragraph, blank line
  between paragraphs.
- **A natural voice.** Write how the presenter talks: contractions, "I" and "you", plain words.
  Read each line aloud in your head; if you would not say it that way, rewrite it.
- **Write numbers and symbols as spoken** when the exact reading matters: "twenty percent", not
  "20%"; "and", not "&". Spell out abbreviations the presenter would expand.
- **Words on the page should be the words said.** Voice follow tracks spoken words in order.
  Keep asides, parentheses and stage directions out of read paragraphs; put directions in
  `::cue`.
- **Emphasis sparingly.** `**bold**` one word per paragraph at most, where the stress falls.
- **Lists in read text** read as a sentence: "It rests on three things:" then `- clients,`
  `- processes,` `- and sessions.` with the punctuation of the spoken sentence.
- **Signal transitions out loud.** "Let me show you", "So here is the thing", "Before we
  finish". These are also good places for cues before and after tab groups.
- **Cue phrases must sound natural said aloud** and must be distinct from the surrounding text.
  A cue is spoken as part of the talk, so it should read like a real segue, and the same words
  should not appear in the tabs' bullets or in what the presenter will improvise there.

## Complete example

```markdown
---
title: "Demo - Plain Text Notes App"
tags: [youtube, demo, presenter]
---

::chapter{title="Intro"}

## Intro

::alert{type="tip"}
Big energy on the first line. This is the hook.
::

Most note apps lock your notes inside them.

This one doesn't. Every note is a plain text file, in a folder you choose.

Today I'll show you how it works, and why that matters more than you'd think.

::pause{2}

## Three features {say="let me show you three features"}

Let me show you three features. I'll go through them in whatever order makes sense on screen.

::cue
Switch to the screen recording.
::

::tab{title="Folders" scroll="off" say="start with folders|how folders work"}
- Open the notes folder in Finder
- Create a subfolder
- Drag a note into it
- The app picks it up right away
::

::tab{title="Search" scroll="off" say="finding things fast|let's try search"}
- Cmd+K opens search
- Type part of a word
- Results show the matching line
::alert{type="warning"}
Search the word "invoice", the demo notes have it.
::
::

::tab{title="Sync" scroll="on" say="what about sync"}
Sync is the question everyone asks, so let me be clear.

The app doesn't sync anything by itself. Your notes are files, so any folder sync works.

I keep mine in iCloud Drive. A friend of mine uses Dropbox. Both work the same way.

::cue
Open the same note on the phone.
::

And because it's just files, you're never stuck if you stop using the app.
::

## Wrap-up {say="let's wrap it up|time to wrap up"}

::cue
Back to camera.
::

::speed{0.9}

So that's the idea. Plain files, your own folder, and no lock-in.

::speed{1}

If you want to try it, the link is in the description.

::pause{2}

Thanks for watching, and I'll see you in the next one.
```

Why it is built this way: the read parts (hook, wrap-up) carry exact wording. The demo is a
tab group because the order on screen may change. Each tab cue is a natural segue with 2 to 3
key words that do not appear in any other tab. The group is followed by a heading with its own
cue, so "let's wrap it up" leaves the demo. The heading before the group also has a cue, so the
presenter can go back by voice.

## Checklist

- Every `::cue`, `::alert`, `::tab` and `::note` has its closing `::` line, including nested blocks
  inside tabs (a tab with a nested alert ends with two `::` lines).
- Every directive is on its own line, with blank lines around it.
- No line starting with `::` inside a `::cue` or `::alert` in normal flow.
- Only these directives: `chapter`, `cue`, `alert`, `speaker`, `pause`, `speed`, `tab`,
  `note`. No invented attributes.
- Every `::note` in the flow has a `say` cue, or is followed by a heading whose cue continues
  it. The cue appears in the read text right after the note or is a natural segue.
- `alert` types are `info`, `warning`, `tip` or `danger`. `scroll` is `on` or `off`.
- Every `::speed` that slows down or speeds up is followed later by `::speed{1}`.
- Every tab has a `title`. Cues in a group are distinct from each other and from the tab text.
- The flow after every tab group starts with a heading; headings that are not natural to say
  have a `{say="..."}` cue.
- Two tab groups never touch without a heading or text between them.
- Read text: short sentences, one idea each, written the way it will be said.
