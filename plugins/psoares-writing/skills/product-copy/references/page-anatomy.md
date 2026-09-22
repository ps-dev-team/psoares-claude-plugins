# Page anatomy

Section by section templates for the website. For screens inside the app (onboarding, empty states, errors, upgrade prompts) use the `ui-copy` skill in this plugin.

Each template gives the job of the section, the shape of the copy, and an example built for an imaginary product so nothing here is a real company's line. The imaginary product is "Relay", a webhook delivery service.

## Landing page

### 1. Hero

Job: the reader decides in five seconds whether this is for them.

Shape:
- Headline: the claim, under eight words.
- Subheadline: what it is, for whom, how. One or two sentences.
- Primary CTA + secondary CTA.
- Optional: one line of proof under the CTAs ("Used by 1,200 teams" or three logos).

Example:
> **Webhooks that arrive.**
> Relay is a delivery layer for outgoing webhooks: retries, signing, replay, and a log of every attempt, from one POST to your endpoint.
> [Start sending] [Read the docs]

### 2. Proof strip

Job: borrow trust from people the reader already trusts.

Shape: logos, or one line per customer with a verb and a quantity. Three is enough.

Example:
> Acme delivers 40M webhooks a month through Relay.
> Northwind cut failed deliveries to 0.02% on Relay.
> [FACT NEEDED: third customer line]

### 3. How it works

Job: show the shape of the integration before the feature list, so the reader can picture tonight's work.

Shape: three to five numbered steps with a verb each, or one short code sample with a one-line caption. Steps are things the reader does, not things the product does.

Example:
> 1. Send one POST to Relay with your payload and the destination URL.
> 2. Relay signs it, delivers it, and retries on failure for up to 72 hours.
> 3. Watch every attempt in the log, and replay any of them with one click.

### 4. Features, grouped by job

Job: answer "does it do the thing I need" for each kind of reader.

Shape: group by the reader's job (send, debug, secure, scale), not by your internal product names. Each feature: heading as verb phrase or searchable noun, blurb of capability + what it lets you skip, one number if you have one.

Example:
> **Retry without writing a retry loop.** Exponential backoff over 72 hours, with jitter, so a customer's outage doesn't become your on-call page.
> **Replay any delivery.** Every attempt is stored for 30 days. Resend one, or every failure from a time range.
> **Signed payloads.** HMAC signatures on every request, with key rotation, so receivers can verify it came from you.

### 5. Objections

Job: say the fact that kills the fear before the reader has to ask.

Shape: a short row of facts, each answering one fear. No heading like "Why Relay?"; the facts are the heading.

Example:
> Self-serve. No sales call to get a key.
> Export everything. Delivery logs are yours, in JSON, any time.
> Test mode. Send to a sandbox endpoint and see exactly what would go out.

### 6. Pricing

Job: let the reader estimate their bill without a spreadsheet.

Shape: the unit, the price, what's free, and the rule about what you don't charge for. If there are tiers, name each after who it's for, not after a metal.

Example:
> Free up to 10,000 deliveries a month. Then $0.10 per 1,000. Retries don't count.

### 7. Closing CTA

Job: catch the reader who scrolled to the end and is now convinced.

Shape: one line of claim, primary CTA, nothing else.

Example:
> Your first webhook can be out in ten minutes.
> [Start sending]

## Pricing page

- Headline: what you pay for, in the unit. "Pay per delivery."
- Tiers named by audience: "Hobby", "Team", "Company" beat "Silver", "Gold", "Platinum".
- Each tier: price, the unit, three or four limits with numbers, one CTA.
- Below the tiers: the questions people email about, answered in one line each. What counts as a delivery. What happens when you exceed the limit. Whether you can cancel.
- Never "Contact us" as a price without at least "from $X" or what the tier includes.

## Feature page

Same shape as the landing page hero + how it works + features, scoped to one job. The headline names the job ("Replay any webhook"), the subheadline names the situation ("When a customer's endpoint was down for an hour, resend the hour.").

## Changelog entry

- Title: what you can do now, as a verb phrase. "Replay deliveries by time range."
- First sentence: the situation it fixes.
- Second: how to use it.
- No "We're excited to announce."

## About page

One paragraph. Who you are, what you build, for whom, and one line about why you started. Resend does this in one sentence: "We are a team of engineers who love building tools for other engineers."

## Comparison page ("Relay vs. X")

- Lead with what's the same, in one line, so the reader trusts the rest.
- Then a table of facts with numbers. No adjectives in cells.
- Then one paragraph on who should pick X anyway. That paragraph is what makes the page believable.
