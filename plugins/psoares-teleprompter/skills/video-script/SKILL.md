---
name: video-script
description: >-
  Use when writing, rewriting or tightening the words of a video someone will
  record to camera or over a screen recording: course lessons, app and
  software walkthroughs, product demos, tutorials, and (later) social media
  videos. Writes one sentence per line within one breath, so each line is a
  take that can be recorded and re-recorded, and the script doubles as the cut
  list for editing. Uses lists wherever a line names things, so the speaker
  reads them with intention and the edit can show each item on screen.
  Trigger phrases: "write the script for this lesson", "script for this
  video", "rewrite this script", "make the script line by line", "lesson
  script", "demo script", "guião da lição", "escreve o guião", "guião linha a
  linha", "reescreve o guião". Use it with teleprompter-script when the script
  is read from the Markdown Teleprompter app.
---

# Video scripts

A script someone records one sentence at a time. They say a line, stop, start again, say the
next line. In the edit, every take is cut at its edges and the bad ones are thrown away. So
every line has to fit in one take, and the script is also the map the editor (a person or an
AI given the script and the video) uses to match takes to lines.

## Load first

1. **`human-prose`** (from `s2-writing` or `psoares-writing`, whichever is installed). It sets
   the voice and removes what sounds written by AI. If it is not installed, follow the short
   version under "Voice" below.
2. **`teleprompter-script`**, only when the script will be read from the Markdown Teleprompter
   app and needs its directives (`::chapter`, `::cue`, `::note`, tabs).

Then open the reference for the format:

| Format | Reference |
| --- | --- |
| Course lesson, app or software walkthrough, demo, tutorial | [references/lesson.md](references/lesson.md) |
| Social media video | Not written yet. Ask the user for the rules and do not guess. |

## Writing or reviewing

- **Writing** a new script, or turning a transcript into one: apply everything below.
- **Reviewing** a script the user wrote: report what breaks the rules, line by line, and ask
  before changing anything. A script the user is happy with is the reference for their voice,
  not a draft to improve.

## The take rules

These hold for every format.

- **One sentence per line.** One line is one take. A blank line between lines, so each one
  stands alone on the prompter.
- **One breath.** A line is at most about 15 words, or 5 seconds said aloud. Longer than that,
  split it into two sentences, or turn what it names into a list.
- **Lines connect.** A line can lean on the one before it: "It grows with every session",
  "So it can help you", "And sessions are where the coaching happens". That is how people
  talk, and a script is recorded in order. Never repeat a noun just to avoid "it".
- **Each line starts clean.** The first word is easy to say from cold, right after pressing
  record. Avoid opening on a hard cluster or a number the speaker trips on.
- **Words on the page are the words said.** No cues, no stage directions, no `[brackets]`, no
  parentheses in the read text. Directions go in `::cue` when the teleprompter is used, or
  nowhere.
- **Write numbers and symbols as said:** "ten clients", not "10 clients"; "and", not "&".
- **The script is the cut list.** Line N is take N. Keep the order the video will have, so an
  editor can lay the takes down top to bottom. Do not number the lines in the file; the line
  order is the numbering.
- **One direction.** The video moves forward through the product or the idea and never
  jumps back. If something needs to come back, it comes back as a new line that names it, not
  as "like we saw before".

## Lists

A paragraph gets read straight through. A list makes the speaker slow down and name each item
with intention, and in the edit each item is a moment for something to come on screen: the
word, an icon, the part of the app.

- **Use a list whenever a line names things.** Two or more parts, kinds, steps or places: make
  them a list, not a sentence with commas.
- **The list is the spoken sentence, broken at the items.** The lead-in ends with a colon or
  runs straight into the list, and the items carry the sentence's punctuation:

  ```markdown
  It rests on three things:
  - clients,
  - processes,
  - and sessions.
  ```

- **A lead-in and its list are one take.** They count as one line for the breath rule.
- **Items are short.** A word or a name, a few words at most. If an item needs explaining, the
  explanation is its own line after the list.
- **Lists set up what comes next.** A good pattern: list the parts, then give each part its own
  line, with the part's name in **bold** at the start. The bold word is where the graphic
  lands.

## Easy to say

The speaker may be reading a language that is not their first, and a line that reads well on
paper can still trip the tongue. Every line should be easy to say on the first try.

- **The speaker's hard words come first.** Before writing, look for `hard-words.md` in the
  scripts folder (the folder that holds the script, or its nearest parent that has one). Never
  use a word or phrase on that list; use the alternative it gives. If the file does not exist,
  carry on without it.
- **Short, common words.** "Use", not "utilise"; "help", not "facilitate"; "start", not
  "commence".
- **Watch where words meet.** Avoid a word ending in a consonant cluster next to one starting
  with a cluster: "its strengths", "sixth session", "asks students". Rephrase so a vowel sits
  between them.
- **No runs of the same sound.** Three or more s, sh or z sounds close together ("sessions,
  processes and assessments") make a tongue twister. When a core product word is sibilant,
  keep the words around it plain.
- **Few "th" words** when a simple alternative exists: "complete" for "thorough", "all" for
  "the entirety of".
- **No stacked nouns.** "The client session summary document" becomes "the summary of the
  session".
- **In Portuguese:** no chained clitics ("dá-lho", "far-se-á"), no runs of sibilants
  ("sessões dos processos seguintes"), and a shorter word over one of five syllables or more
  when it says the same.
- **Write each language as spoken.** Do not write in one language and translate word for word.
  Translate the line, then say it, then fix what trips.

### The hard-words file

The speaker's own list, kept beside the scripts, not in this plugin, so it grows without a
release. One section per language, one entry per line, the alternative after the arrow:

```markdown
## EN
- thorough → complete
- its strengths → what it does well

## PT
- dá-lho → dá-lhe isso
```

Add to it when the speaker says a word tripped them. When a recording was read from a script,
its transcript can find more: lines recorded several times, or where the transcript differs
from the script, point at the words to add. Propose those to the speaker; do not add them
without asking.

## Voice

The speaker's voice wins over any rule here.

- **Warm, not clipped.** The speaker is a person guiding someone, not a manual. Short is about
  cutting filler, never about cutting the warmth. Say who is doing what: "I'll show you",
  "you'll see", "let's add", "vou-te mostrar", "vamos ver".

  | Clipped | Warm |
  | --- | --- |
  | In this lesson, you add your first client. | In this lesson, I'll show you how to add your first client. |
  | That's your first client. | And that's it, your first client is in. |
  | Now, the client page. | Now let's look at the client's page. |

  A warm line is a few words longer, and that is fine. Filler is still out: no "super easy",
  "amazing", "without further ado".

- Keep the speaker's "I" lines: "I know that's a lot to take in, so I made this short course."
- Keep spoken beats the speaker wrote on purpose, like an ellipsis before a reveal: "Behind
  all of it... there is AI."
- **Bold** a term on the line that defines it, once. It tells the speaker where the stress
  falls and tells the editor where a graphic goes.

The short version of `human-prose`, for when it is not available:

- Write how the speaker talks: "you" and "I", contractions, plain words.
- One idea per line. Cut adjectives that do no work.
- No "Let's dive in", "In today's video", "It's important to note", "seamless", "powerful".
- Read each line aloud in your head. If you would not say it that way, rewrite it.

## Example

The opening of a course welcome, from the speaker's own script. A list names the parts, then each
part gets its own line with its name in bold, one level at a time:

```markdown
Welcome to Insight Lab.

Here is how the app fits together.

It rests on three things:
- clients,
- processes,
- and sessions.

A **client** is a person you coach.

In a client you have
- the Person Map,
- Observations,
- and Processes.

The **Person Map** is a picture of who your client is right now.

It grows with every session, tool and file, and it shows where each point came from.
```

## Languages

Write in the language the user asks for. When the script exists in two languages, the
translation matches **line for line**: the same number of lines, and line N in one language is
line N in the other. A line that will not fit the breath limit in the other language is split
in both, so the two files stay aligned. Lists keep the same items in the same order.

## Checklist

- [ ] Every line is one sentence, within one breath.
- [ ] Every line that names two or more things is a list.
- [ ] No noun is repeated just to avoid "it".
- [ ] No word from `hard-words.md`, no clusters where words meet, no runs of s sounds.
- [ ] No cues, brackets or directions in the read text.
- [ ] The order is the order of the video, and it never jumps back.
- [ ] The speaker's own lines and beats are still there.
- [ ] The format's own checklist in its reference passes.
- [ ] If there are two languages, both files have the same number of lines.
