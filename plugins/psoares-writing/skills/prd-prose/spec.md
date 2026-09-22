# prd-prose

## Purpose

A style layer for requirements writing. Sets the tone, sentence shape, and vocabulary of anything that tells engineering, design, or QA what to build: PRDs, feature specs, acceptance criteria, user stories, RFC requirement sections, ticket descriptions. It does not decide what the requirements are or which sections a document has. It decides how each sentence sounds so that nobody has to ask what was meant.

Sibling of `human-prose`. A PRD has two kinds of sections: the ones a person reads to understand (problem, context, goals, risks) and the ones a person reads to build (requirements, acceptance criteria, permissions, errors). The first kind takes the `human-prose` register. The second takes the decision register defined here. This skill decides which register each section gets and applies it.

## When to use

Any time the output is a requirement, a spec, acceptance criteria, or a document engineers will build from. Also when the user pastes such a document and says it is vague, wordy, or "reads like a wish list".

## The decision register (for the sections that get built from)

Authoritative, objective, testable.

- Decisions, not opinions. "The page must load in under 2.0 seconds", not "we think the page should be fast".
- Evidence, not feelings. "15% drop-off at checkout", not "users get annoyed".
- Imperative verbs at the start of every requirement.
- MUST, SHOULD, MAY, used as defined in RFC 2119, and nothing softer.
- One requirement per sentence. Testable from the sentence alone.
- Every quantity has a number and a unit.
- One noun per concept, fixed on first use.
- No marketing, no hedging, no filler.

## Universal bans (shared with human-prose)

- No em-dashes.
- No staccato stacks.
- No "not X, but Y".
- No inflated vocabulary (robust, seamless, leverage, cutting-edge).

## Composability

- Another skill or the user provides the structure and the facts.
- `prd-prose` assigns a register per section and rewrites the sentences into it.
- `human-prose` is loaded for the human-register sections. The bans are shared.

## Reference files

- `references/examples.md`: bad/good pairs by requirement type (functional, performance, data, permissions, error handling, acceptance criteria, user stories).
