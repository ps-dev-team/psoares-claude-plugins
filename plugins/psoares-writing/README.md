# psoares-writing

Writing and prose tooling for Claude Code.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-writing@psoares-claude-plugins
```

## Skills

### `human-prose`

Humanizes written output so it sounds like a real person instead of AI. A style layer, what text sounds like rather than what it says, covering word choice, rhythm, punctuation (no em-dashes), and banned AI-isms ("crucial", "leverage", "seamless", "dive in").

Works across languages; picks up the target language from an explicit parameter or from the conversation. Triggers on any request that produces prose (emails, blog posts, video scripts, social posts, captions, newsletters, course material) or on complaints like "sounds robotic", "soa a AI", "mais natural".

For PT-PT, defaults to `tu` and PT-PT spelling, with rules in `references/pt-pt.md`.

### `product-copy`

The words on a website that sells software: landing pages, hero headlines and subheadlines, feature sections, pricing pages, comparison pages, changelog entries, CTAs. Modelled on how Stripe, Supabase, Vercel, Resend, and OpenRouter write: one claim under eight words, nouns and numbers instead of adjectives, imperative verbs, fears answered with a fact, proof that names a customer and a quantity.

Ships a verbatim study of the five sites (`references/patterns.md`), section templates (`references/page-anatomy.md`), and an anonymised worked bad example (`references/bad-examples.md`).

### `ui-copy`

The words inside the app: buttons, labels, placeholders, errors, empty states, confirmations, onboarding, transactional emails, notifications, loading states, tooltips, settings, upgrade prompts, paywalls, trial banners, store listings. Every string is assigned to a moment and the moment decides the shape. Selling moments (upgrade, paywall, trial) state the limit hit, the gain, and the price, and always give a way out.

Ships a catalogue of moments with before/after pairs (`references/moments.md`).

## Rules all three enforce

- No em-dashes.
- No staccato stacks ("Fast. Simple. Yours.").
- No "It's not X, it's Y" constructions. Say Y, with the number.
- No mannered brevity in UI: fragments as sentences, dropped articles, rhetorical questions the app answers itself.
- Numbers are never invented. Missing facts are left as `[FACT NEEDED: ...]`.

`product-copy` and `ui-copy` load `human-prose` for the final pass.

## License

MIT
