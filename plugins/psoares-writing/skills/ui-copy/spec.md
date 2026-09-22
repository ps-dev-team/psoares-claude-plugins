# ui-copy

## Purpose

Write and review the words inside an app: buttons, labels, placeholders, errors, empty states, confirmations, onboarding, notifications, loading states, tooltips, settings, upgrade prompts, paywalls, feature announcements, store listings.

Two jobs at once. The copy has to work as an interface element (Tubik: "copy is one more visual element of design", it takes screen space like a button and must be functional), and where the moment allows, it has to sell (an upgrade prompt, a trial banner, a first-run screen). Most in-app copy is the first job. The skill knows when the second one applies and keeps it out of the rest.

## Non-goals

- Not marketing pages. That is `product-copy`.
- Not general prose. `human-prose` handles voice and runs last.
- Not layout. It respects character limits it is given and asks for them when they matter.

## Inputs

1. The screen or flow, and where it sits in the product.
2. What the user was trying to do when they hit this screen, and what state they are in (first run, mid-task, something broke, about to pay, about to delete).
3. Existing terms: what the product calls its objects (project, workspace, deployment) so the copy uses the same nouns.
4. Character limits, platform (web, iOS, Android, desktop), and whether the string will be translated.
5. Tone, if the product has one. Default: a competent colleague, plain and calm.

## Process

1. Name the moment. Every string belongs to one of the moments in SKILL.md. The moment decides the shape.
2. Write the string using that moment's shape.
3. If the moment is a selling moment (trial, upgrade, paywall, announcement), state the concrete thing the user gets and the price or limit. No hype.
4. Check the string against the banned list and the platform limits.
5. Run `human-prose`.

## Hard rules

- No em-dashes.
- No staccato stacks. A button is short by nature; a paragraph of one-word sentences is not.
- No "It's not X, it's Y" constructions.
- Buttons name the outcome. Never "OK", "Submit", "Yes", "Cancel" as the pair on a destructive dialog.
- Errors: what happened, why if known, what to do now. Never blame the user, never "Something went wrong" alone.
- Empty states: what this area is for, and the one action that fills it.
- Same noun for the same thing everywhere.
- No exclamation marks except in a success state, and at most one.
- No "Oops", "Uh oh", "Whoops", "Yay".

## Reference files

- `references/moments.md`: a catalogue of every in-app moment with the shape, before/after examples, and platform notes.

## Composability

Runs after the product's own terminology is known and before `human-prose`. Pairs with `product-copy` when a flow starts on the website and continues in the app (signup, trial, pricing), so the noun and the promise match on both sides.
