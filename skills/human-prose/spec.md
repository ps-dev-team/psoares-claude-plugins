# human-prose

## Purpose

Style layer that humanizes any text output. Receives a target language, applies universal anti-patterns plus language-specific rules, and produces prose that sounds like a real person wrote it. Designed to compose with other skills (script-editor, reel-planner, etc.) as a post-processing lens.

## When to Use

Any time the agent produces content meant for humans: articles, scripts, posts, emails, captions, course material. Other skills generate structure and substance; this one handles voice.

## Language Selection

1. Explicit parameter in the prompt (e.g. "write in pt-pt") takes priority
2. If absent, infer from the user's own language in the conversation
3. Default to English if still unclear

The selected language determines which language-specific reference file to load from `references/`.

## Universal Anti-Patterns

Rules that apply regardless of language.

### Structure
- No "In today's [X]..." or equivalent formulaic openers
- No "Let's dive in" / "Let's explore" and equivalents
- No "In conclusion" / "To summarize" wrappers
- No "Remember:" followed by recap
- No numbered lists for everything
- No perfect parallel structure in every list
- No "Not X. It's Y." false dichotomies
- No telegraphic fragments chopped into single-sentence paragraphs
- No artificial sentence breaks where a comma or conjunction would flow better

### Punctuation
- NEVER em-dashes. Use commas, colons, or restructure.
- No semicolons in casual content
- Commas over parentheses when possible

### Word Choice
- No "crucial" / "essential" / "vital" / "key" overuse
- No "leverage" / "utilize" (just "use")
- No "robust" / "comprehensive" / "cutting-edge"
- No "harness the power of"
- No "at the end of the day"
- No "it's worth noting that"

### Tone
- No excessive hedging ("It's important to note that...")
- No filler openers ("Great question!")
- No agreement fillers before answering
- No over-explanation of obvious things
- No fake enthusiasm with exclamation marks
- No condescending framing ("As you already know...")

### Flow
- Vary sentence length: short punchy mixed with longer flowing
- Use contractions naturally
- Allow imperfect transitions
- Let ideas breathe without constant signposting
- One idea per sentence, but compound sentences are fine

## What Good Prose Looks Like

- Sounds like a real person wrote it
- Has rhythm and variation
- Gets to the point
- Uses specific examples over generic statements
- Has personality and occasional imperfection
- Matches context: casual for posts, tighter for scripts

## Language-Specific Rules

Each supported language has a reference file at `references/<lang>.md` containing:
- Banned words and expressions specific to that language
- Gender/terminology conventions (e.g. tech jargon adaptation)
- Punctuation norms that differ from the universal rules
- Common AI-speak patterns in that language

Current languages:
- `references/pt-pt.md` — Portuguese (Portugal)
- `references/en.md` — English

To add a language: create `references/<lang>.md` following the same structure.

## Composability

This skill is a style layer, not a content generator. When composed with other skills:
- The other skill defines what to write (structure, sections, format)
- human-prose defines how it sounds (voice, rhythm, word choice)
- Apply human-prose rules as a final pass on the output

## Notes

- Don't overcorrect into robotic simplicity
- Some AI patterns are fine in moderation, the problem is accumulation
- Match the user's voice if examples are provided
- When in doubt, read it aloud. If it sounds like a press release, rewrite it.
