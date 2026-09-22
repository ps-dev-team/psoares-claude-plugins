# Patterns from five sites that sell software well

Verbatim copy captured from the homepages of Supabase, Resend, Stripe, OpenRouter, and Vercel in September 2026, followed by the formulas each one demonstrates. Quote these when the user asks why a line works. Do not copy them into a client's page.

## Supabase

**Hero**
- Headline: "Build in a weekend. Scale to millions."
- Subheadline: "Supabase is the Postgres development platform: an open source backend for building web and mobile applications, with a suite of integrated tools that work together out of the box."

**Feature blurbs**
- Database: "Every project is a dedicated Postgres database. Fully portable, with auto-generated REST and GraphQL APIs."
- Auth: "Built-in authentication and user management with 20+ social login providers."
- Storage: "S3-compatible object storage with a global CDN (285+ cities)."
- Edge Functions: "Globally distributed TypeScript/Deno serverless functions."
- Vector: "AI toolkit powered by pgvector for storing, indexing, and querying vector embeddings."

**Differentiators**
- "Open source: all core tools are open source and self-hostable"
- "Built on Postgres: industry-standard database, fully portable, no vendor lock-in"

**What to take from it**
- The headline is two sentences, each with a timeframe and a scale. No adjectives.
- The subheadline does all the explaining. It names the category (Postgres development platform), the licence (open source), the use (web and mobile), and the integration story (work together out of the box).
- Feature blurbs are nouns with numbers attached: "20+ providers", "285+ cities", "S3-compatible", "REST and GraphQL".
- Lock-in fear is answered three times with facts: portable, open source, self-hostable.

## Resend

**Hero**
- Headline: "Email for developers"
- Subheadline: "The best way to reach humans instead of spam folders. Deliver transactional and marketing emails at scale."
- CTAs: "Get started" / "Documentation"

**Sections**
- "A simple, elegant interface so you can start sending emails in minutes."
- "First-class developer experience"
- "We are a team of engineers who love building tools for other engineers."
- Test mode: "Simulate events and experiment with our API without the risk of accidentally sending real emails."
- Modular webhooks: "Receive real-time notifications directly to your server."
- Contact management: "Import your list in minutes, regardless the size of your audience."
- Deliverability headings: "Proactive blocklist tracking", "Faster time to inbox", "Managed dedicated IPs"

**Quotes**
- "Email infrastructure is something we don't want to think about, and with Resend we don't have to."
- "The best part about taking Resend into production was that there was no friction at all."

**Closing**
- "Email reimagined. Available today."

**What to take from it**
- Three-word headline: category + audience. The reader self-selects in one second.
- Each feature blurb ends with what the reader gets to skip: "without the risk of accidentally sending real emails", "regardless the size of your audience".
- The best quote is about relief, about not thinking. That is what people buy infrastructure for.
- "We are a team of engineers who love building tools for other engineers" is the whole about page in one line.
- Cautionary: "reach humans instead of spam folders" is a contradiction construction. "Faster time to inbox", further down the same page, says the same thing as a plain benefit. Prefer the second. "Email reimagined" is aspirational fog; skip lines like it.

## Stripe

**Hero**
- Headline: "Financial infrastructure to grow your revenue"
- Subheadline: "Accept payments, offer financial services, and implement custom revenue models"
- CTAs: "Get started" / "Sign up with Google"

**Section headings**
- "Flexible solutions for every business model"
- "The backbone of global commerce"
- "Reliable, extensible infrastructure for every stack"

**Feature blurbs**
- "Enable any billing model"
- "Embed payments in your platform"
- "Create a card issuing program"

**Stats**
- "135+ currencies and payment methods supported"
- "$1.9T in payments volume processed in 2025"
- "99.999% historical uptime"
- "200M+ active subscriptions managed"
- "500M+ API requests per day"
- "50% of Fortune 100 companies have used Stripe"

**Quotes**
- "Stripe makes the subscriptions and payment piece really easy" (Substack)
- "With Stripe, we have a global technology partner" (Mindbody)

**What to take from it**
- Headline: infrastructure noun + the buyer's goal ("grow your revenue"). The word "your" puts the reader in it.
- Feature headings are imperatives: Enable, Embed, Create, Accept. Each is something the reader will do.
- Six stats, each with a unit, and one of them is a year. Stats with dates read as audited.
- Objections are handled by scale numbers rather than adjectives. "Reliable" appears once in a heading and is backed by "99.999%" below it.
- Cautionary: "The backbone of global commerce" only works when you process $1.9T. Do not write it for a product without that number.

## OpenRouter

**Hero**
- Headline: "A unified API for every major LLM"
- Subheadline: "One endpoint, hundreds of models, with routing, fallbacks, and cost tracking"

**Value propositions**
- "Call many models or providers through one API key, one bill, and one SDK"
- "Switch models without changing code, or compare models on the same prompt"
- "Route around provider outages and rate limits with automatic fallbacks"

**Friction removal**
- "API keys are self-serve: sign up and create a key"
- "No sales contact is needed"
- "Free tier: models with the :free variant cost nothing"
- "Pricing is pay-as-you-go per token with no markup on the provider's price"

**What to take from it**
- "One ... hundreds" states the contrast with numbers instead of "not many APIs, one API".
- Every value line is verb + object + the thing you avoid: "Switch models without changing code", "Route around provider outages".
- Four separate lines exist only to kill the sales-call and pricing fears. This is the page telling developers they can start tonight.
- Pricing is stated as a unit (per token) and a rule (no markup). No adjectives near the price.

## Vercel

**Hero**
- Headline: "Agentic Infrastructure"
- Subheadline: "For coding agents to ship apps and agents automated by agents."
- CTAs: "Deploy now" / "Talk to sales"

**Bullets**
- "For coding agents to deploy in their native language, with Vercel's API, CLI, MCP, and Skills."
- "To ship apps and agents in Sandboxed VMs, with durable backends, powered by hundreds of models."

**Section heading**
- "Build agents on infrastructure that thinks like them"

**Proof**
- "Notion powers millions of agent conversations daily on Vercel."
- "Zapier serves over 100 million monthly website visits on Vercel."
- "Mintlify powers documentation for over 20,000 companies on Vercel."

**Recently shipped**
- eve: "A framework for building durable agents."
- Passport: "Secure every internal agent, app, and deployment with your identity provider."

**What to take from it**
- The proof format is the strongest on any of the five sites: named customer + verb + quantity + "on Vercel". Three lines, three numbers, three verbs (powers, serves, powers).
- The primary CTA is "Deploy now", the verb the product is for. The secondary is "Talk to sales" for the buyer who cannot self-serve.
- Product one-liners are a noun phrase with a purpose: "A framework for building durable agents."
- Cautionary: "Agentic Infrastructure" as a two-word headline works because Vercel is already known. A new product needs the outcome in the headline, not the category.

## The formulas, extracted

**Headlines**
1. Small start, big end: "[Do X] in [short time]. [Reach Y] at [scale]."
2. Category for audience: "[Category] for [audience]"
3. Infrastructure + goal: "[Noun] to [buyer's goal]"
4. One of many: "One [thing], [number] [things]"

**Subheadlines**
"[Product] is [category]: [what it is] for [use], with [what's included] that [what that means for you]."

**Feature headings**
- Imperative: "[Verb] [object]" ("Enable any billing model")
- Searchable noun: "[Adjective-as-fact] [noun]" ("Managed dedicated IPs")

**Feature blurbs**
"[Capability with a number] [so you can / without] [the thing you skip]."

**Proof lines**
"[Customer] [verb]s [quantity] [thing] on [Product]."

**Relief quotes**
"[Task] is something we don't want to think about, and with [Product] we don't have to."

**Objection lines**
State the fact. "No sales contact is needed." "Fully portable." "Test mode." "No markup."

**Pricing**
"[Unit] [price], [rule about what you won't be charged]."

**CTAs**
Primary: the verb the product is for + "now" or an object. Secondary: "Documentation", "See pricing", "Talk to sales".
