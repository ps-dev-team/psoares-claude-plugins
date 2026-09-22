# product-copy

## Purpose

Write the words on websites that sell a product or a piece of software. Landing pages, hero sections, feature sections, pricing pages, CTAs, comparison pages, changelog entries. Copy inside the app (onboarding, empty states, errors, upgrade prompts) belongs to the sibling skill `ui-copy`.

The voice is modelled on five sites that sell developer and business software well: Stripe, Supabase, Vercel, Resend, and OpenRouter. What they have in common: claims made of nouns and numbers, verbs in the imperative, objections answered with a fact instead of an adjective, and social proof that names a customer and what they do at what scale.

## Non-goals

- Not a brand strategy or positioning workshop. If the user has no product facts, the skill asks for them rather than inventing a market.
- Not general prose humanizing. That is `human-prose`, which this skill loads and composes with.
- Not a design system. It suggests page anatomy, it does not lay out the page.

## Inputs

Before writing, the skill needs:

1. What the product does, in one plain sentence (the mechanism, not the mission).
2. Who buys it and what they were doing when they went looking (the job).
3. Facts with numbers: uptime, regions, customers, currencies, models, minutes to first result, price.
4. What is free, open, portable, or self-serve.
5. Named customers or quotes, if any.
6. Which page: landing, pricing, feature, comparison, changelog.

Missing facts are asked for or left as `[FACT NEEDED: ...]` placeholders. Numbers are never invented.

## Process

1. Gather inputs. Ask for what is missing, in one message.
2. Pick the claim: the one outcome the buyer gets, stated in under eight words.
3. Write the hero: headline (claim), subheadline (what it is, for whom, how), two CTAs.
4. Write the rest in the order the reader's doubt arrives: proof, how it works, features by job, objections, pricing, closing CTA.
5. Final pass against the checklist in SKILL.md and the `human-prose` rules.

## Hard rules

- No em-dashes, anywhere. Hero headlines included.
- No staccato stacks: no "Fast. Simple. Yours." triplets, no chopped one-word sentences, no single-sentence paragraphs stacked for drama.
- No "It's not X, it's Y" and no "Not X. Y." constructions. State Y with a number.
- No adjective clusters where a noun or number would do.
- Every feature heading is a verb phrase or a noun phrase the buyer would search for.
- CTAs are two or three words and start with a verb.
- Social proof names who and how much.

## Reference files

- `references/patterns.md`: the verbatim study of the five sites, with the formulas extracted from them.
- `references/page-anatomy.md`: section by section templates for landing, pricing, feature, comparison, and changelog pages.

## Composability

Loads `psoares-writing:human-prose` for the final pass. This skill decides what each section says and in what shape; `human-prose` polices the sound.
