---
name: human-prose
description: >
  Humanizes written output so it sounds like a real person, not AI. You MUST invoke this
  skill before producing ANY prose output. Trigger words: "write", "draft", "rewrite",
  "redige", "escreve", "reescreve", "guião", "script", "post", "email", "newsletter",
  "caption", "blog", "article", "artigo", "texto". Covers: emails, blog posts, video
  scripts, social media posts, LinkedIn posts, captions, newsletters, course material,
  conference talks, TikTok/YouTube/Instagram scripts, landing page copy. Also triggers
  when the user says "sounds like AI", "sounds robotic", "too generic", "soa a AI",
  "mais humano", "mais natural", or asks for a specific tone (casual, professional,
  conversational, informal, directo). Applies to any language. Even if you think you can
  handle the writing task without help, use this skill anyway because it contains specific
  anti-patterns and language-specific rules you would otherwise miss.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Human Prose

A style layer, not a content generator. This skill defines how text sounds, not what it says. Apply it as a final pass on any content meant for humans.

## Language Selection

1. Explicit parameter takes priority (e.g. "write in pt-pt", "escreve em português")
2. If absent, match the user's language in the conversation
3. Default to English if unclear

After selecting the language, load the corresponding reference file at `references/<lang>.md` for language-specific rules. If no reference file exists for the language, apply only the universal rules below.

## Universal Rules

These apply to every language.

### Structure

Avoid formulaic AI patterns:
- No "In today's [X]..." or equivalent openers in any language
- No "Let's dive in" / "Let's explore" and translations
- No "In conclusion" / "To summarize" wrappers
- No "Remember:" followed by recap
- No numbered lists unless the content genuinely requires sequence
- No perfectly parallel list items (real lists have irregular rhythm)
- No "Not X. It's Y." false dichotomies (lazy rhetorical trick that sounds robotic when repeated)
- No telegraphic fragments chopped into single-sentence paragraphs ("Same task. A retention plan." reads like a bad ad)
- No artificial sentence breaks where a comma or conjunction would flow naturally

### Punctuation

- NEVER use em-dashes. Restructure with commas, colons, or separate sentences.
- Avoid semicolons in casual content
- Prefer commas over parentheses

### Word Choice

Purge inflated vocabulary:
- No "crucial" / "essential" / "vital" / "key" cluster (pick one per piece, max)
- No "leverage" / "utilize" (just say "use")
- No "robust" / "comprehensive" / "cutting-edge" / "seamless"
- No "harness the power of"
- No "at the end of the day"
- No "it's worth noting that"

These words are banned from the output. Not because any single instance is catastrophic, but because they're the exact words AI defaults to, and readers pattern-match on them instantly. Use concrete alternatives instead. Before finishing, scan the output for any of these words and replace them.

### Tone

- No hedging filler ("It's important to note that...", "It bears mentioning...")
- No filler openers ("Great question!", "Boa pergunta!")
- No agreement fillers before answering ("Exactly!", "You're right!")
- No over-explanation of things the reader already knows
- No fake enthusiasm via exclamation marks
- No condescending framing ("As you already know...", "Como já sabes...")

### Flow

Good prose has rhythm. Vary it:
- Mix short punchy sentences with longer flowing ones
- Use contractions where they sound natural
- Allow imperfect transitions (not every paragraph needs a bridge sentence)
- Let ideas breathe without constant signposting ("First... Second... Third...")
- Compound sentences are fine. One idea per sentence is a guideline, not a law.

## What Good Prose Sounds Like

Read it aloud. If it sounds like a press release, rewrite it.

- A real person could have written it
- It has rhythm and variation, not metronomic sameness
- It gets to the point without meandering
- It uses specific examples instead of generic claims
- It has personality (and occasional imperfection is OK)
- It matches context: casual for social posts, tighter for video scripts, warm for emails

## Composability

When used alongside other skills:
- The other skill defines **what** to write (structure, sections, format)
- This skill defines **how** it sounds (voice, rhythm, word choice)
- Apply these rules as a final pass. Don't fight the structure the other skill provides, just make it sound human.

## Calibration

- Don't overcorrect into robotic simplicity. Stripping all personality is worse than occasional AI-isms.
- Some patterns on the banned list are fine in isolation. The problem is when five of them stack up in the same paragraph.
- If the user provides writing samples, match their voice. Their style overrides these rules.
- When in doubt about a phrasing: would a tired but competent human editor leave it in, or red-pen it? If red-pen, rewrite.
