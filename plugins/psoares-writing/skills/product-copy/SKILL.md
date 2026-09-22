---
name: product-copy
description: >
  Writes the words that sell a product or software on a website: landing pages,
  hero headlines and subheadlines, feature sections, pricing pages, comparison
  pages, changelog entries, website CTAs. Modelled on how Stripe, Supabase, Vercel,
  Resend, and OpenRouter write. Use whenever the user asks for copy, a landing page,
  a hero, a headline, a tagline, a value proposition, a pricing page, a feature
  description, or to "sell" something. Trigger phrases: "landing page", "hero
  section", "headline", "tagline", "copy for the site", "sell this", "pitch this",
  "product description", "pricing page", "homepage", "copy para o site", "landing",
  "vende isto", "texto para a homepage", "descrição do produto". Also use when the
  user shares a product and asks how to present it, or pastes existing site copy and
  asks to improve it. Use it even for a single headline, because the rules on
  numbers, verbs, and banned constructions are easy to miss. Copy inside the app
  (buttons, errors, empty states, onboarding, upgrade prompts) is the `ui-copy` skill.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Product Copy

Words that sell software. The model is the copy on Stripe, Supabase, Vercel, Resend, and OpenRouter: short claims made of nouns and numbers, verbs in the imperative, fears answered with a fact, and proof that names a customer and a quantity.

Load `psoares-writing:human-prose` as well. It runs as the final pass on everything this skill produces.

## Before writing

Get these six things. Ask for whatever is missing in one message, then write. Never invent a number, a customer, or a quote. Where a fact is missing and the user wants a draft anyway, leave `[FACT NEEDED: uptime %]` in place.

1. **Mechanism.** What the product does, in one plain sentence. "A Postgres database with auto-generated APIs." Not the mission.
2. **Job.** Who buys it and what they were in the middle of doing when they went looking. "A developer who needs to send a password reset email tonight."
3. **Numbers.** Uptime, regions, customers, currencies, models, minutes to first result, price. Numbers do the work adjectives cannot.
4. **What is free, open, portable, or self-serve.** These answer the lock-in and sales-call objections.
5. **Named customers and quotes**, if any exist.
6. **Which page.** Landing, pricing, feature, comparison, or changelog.

## The claim

Every page has one claim: the outcome the buyer gets, under eight words. Everything else on the page supports it. Four shapes that work:

| Shape | Example | Why it works |
|---|---|---|
| Small start, big end | "Build in a weekend. Scale to millions." (Supabase) | Two timeframes, one product, zero adjectives. |
| Category for an audience | "Email for developers" (Resend) | Three words. The reader knows if it's for them. |
| Infrastructure noun + purpose | "Financial infrastructure to grow your revenue" (Stripe) | Names the thing, then the buyer's goal. |
| One of many | "A unified API for every major LLM" (OpenRouter) | "One" against "hundreds" without saying "not". |

Pick one. If the user's product has a number in it that beats the competition, the number goes in the claim.

## Hero

Three parts, in this order:

1. **Headline**: the claim.
2. **Subheadline**: one or two sentences that say what it is, for whom, and how. Plain nouns. "Supabase is the Postgres development platform: an open source backend for building web and mobile applications, with a suite of integrated tools that work together out of the box."
3. **Two CTAs**: a primary that starts doing ("Get started", "Deploy now", "Start your project") and a secondary for reading ("Documentation", "Talk to sales", "See pricing").

The subheadline carries the explanation so the headline doesn't have to.

## Section order

Write sections in the order the reader's doubt arrives:

1. **Proof strip.** Logos or one line per customer: who, what they do, at what scale. "Notion powers millions of agent conversations daily on Vercel."
2. **How it works.** Three to five steps or one code sample. The reader wants to see the shape of the integration before the feature list.
3. **Features, grouped by job.** Each heading is a verb phrase ("Enable any billing model", "Switch models without changing code") or a noun the buyer would search for ("Managed dedicated IPs"). Each blurb: capability, then what it lets the reader skip. "Simulate events and experiment with our API without the risk of accidentally sending real emails."
4. **Objections, answered with facts.** See the table below.
5. **Pricing or "what's free".** State the unit and the price. "Pay-as-you-go per token with no markup on the provider's price."
6. **Closing CTA.** Repeat the primary CTA with one line of claim above it.

Templates for each section, plus pricing, feature, comparison, and changelog pages, are in `references/page-anatomy.md`. Screens inside the app are the `ui-copy` skill.

## Objections are answered with a fact

Every buyer of software has the same five fears. Each one has a factual answer. An adjective ("secure", "reliable", "flexible") is not an answer.

| Fear | Factual answer (from the sites) |
|---|---|
| Lock-in | "Fully portable", "open source and self-hostable", "no vendor lock-in" |
| It won't work at my scale | "99.999% historical uptime", "500M+ API requests per day", "285+ cities" |
| It'll take weeks to integrate | "Start sending emails in minutes", "10 minutes to get started", one code sample |
| I'll have to talk to sales | "Self-serve", "No sales contact is needed", "Free tier" |
| I'll break something in production | "Test mode", "Preview URLs", "Route around provider outages with automatic fallbacks" |
| Hidden costs | "No markup on the provider's price", "pay-as-you-go", "one bill" |

Pick the fears that apply and put the fact on the page.

## Social proof

Two formats, both concrete:

- **Scale line**: named customer + what they do + quantity + on the product. "Zapier serves over 100 million monthly website visits on Vercel."
- **Relief quote**: the customer talking about what they stopped thinking about. "Email infrastructure is something we don't want to think about, and with Resend we don't have to."

A logo wall with no numbers is weaker than one line with a number. A quote that says "amazing" is weaker than a quote that names a task.

## Verbs and nouns

Verbs the sites use, in the imperative or infinitive: build, ship, deploy, scale, send, deliver, accept, route, switch, embed, call, track, secure, reach. Use these. Retire "empower", "unlock", "transform", "supercharge", "revolutionize", "elevate".

Nouns beat adjectives. "20+ social login providers" beats "comprehensive auth". "S3-compatible" beats "flexible storage". If a sentence has two adjectives and no number, find the number.

## Banned constructions

These are the tells. Check for them before delivering.

- **Em-dashes.** None, including in headlines. Use a colon, a comma, a period, or two sentences.
- **Staccato stacks.** No "Fast. Simple. Yours." No one-word sentences in a row. No stack of single-sentence paragraphs for drama. A headline can be two short sentences ("Build in a weekend. Scale to millions.") because each sentence carries a fact. Three or more in a row is a stack.
- **The contradiction.** No "It's not X, it's Y." No "Not X. Y." No "Not just X." No "X, not Y" as a headline. Say Y and give the number. "Reach humans, not spam folders" is the one on Resend's page; write it as "Faster time to inbox" instead, which is also on Resend's page.
- **Mannered brevity.** Copy that performs plainness: fragments as sentences ("Nothing else."), dropped articles ("One click in the mail signs you in"), rhetorical questions the page answers itself ("Not there? Check spam."), folksy verbs where the standard one exists ("good for an hour" for "expires in an hour"). It reads clean at a glance and reads like a model on the second look. Full sentences, subject and verb, articles in place. Worked examples in `references/bad-examples.md`.
- **Clever headings.** "The people a valuation has." "Four stages. Four letters." A buyer skimming headings must learn what the section says. Headings are verb phrases or searchable nouns.
- **Adjective clusters.** "Powerful, flexible, seamless" says nothing. One adjective per sentence, and only if there is no number to replace it.
- **Aspirational fog.** "Reimagine", "the future of", "next generation", "built for the modern". Say what it does.
- **Questions as headlines.** "Tired of slow deploys?" Write the answer as the headline.
- **Exclamation marks.** None in product copy.

## CTAs

Two or three words, verb first, lowercase after the first word: "Get started", "Deploy now", "Start sending", "Create a key", "See pricing", "Read the docs". Never "Learn more" as the primary. Never "Submit".

## Output format

Deliver copy as it would sit on the page, section by section, with a bold section label above each block. Put CTAs in brackets: `[Get started]`. Put missing facts in brackets: `[FACT NEEDED: number of regions]`. No commentary between sections unless the user asked for reasoning. If they did, put it after the copy, not inside it.

## Final checklist

Run this before delivering, then run `human-prose`.

- [ ] One claim, under eight words, in the headline.
- [ ] Subheadline says what it is, for whom, and how.
- [ ] Every feature heading is a verb phrase or a searchable noun.
- [ ] Every fear on the page is answered with a fact, not an adjective.
- [ ] Every proof line names who and how much.
- [ ] Every number is from the user's inputs or marked `[FACT NEEDED]`.
- [ ] Zero em-dashes.
- [ ] Zero staccato stacks.
- [ ] Zero "not X, but Y" constructions.
- [ ] Zero mannered brevity: every sentence has a subject, a verb, and its articles.
- [ ] Every heading tells a skimmer what the section says.
- [ ] CTAs are two or three words, verb first.
- [ ] Read aloud: sounds like an engineer describing their product to another engineer, not a press release.

## References

- `references/patterns.md`: verbatim copy from the five sites and the formulas extracted from it. Read it when writing a hero or when the user wants to know why a line works.
- `references/page-anatomy.md`: templates for each landing page section, plus pricing, feature, comparison, and changelog pages.
