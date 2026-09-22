# psoares-product-prose

Prose for websites and apps that sell software.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-product-prose@psoares-claude-plugins
```

## Skills

### `product-copy`

The words on the website: landing pages, hero headlines and subheadlines, feature sections, pricing pages, comparison pages, changelog entries, CTAs. Modelled on how Stripe, Supabase, Vercel, Resend, and OpenRouter write: one claim under eight words, nouns and numbers instead of adjectives, imperative verbs, fears answered with a fact, proof that names a customer and a quantity.

Ships a verbatim study of the five sites (`references/patterns.md`) and section templates (`references/page-anatomy.md`).

### `ui-copy`

The words inside the app: buttons, labels, placeholders, errors, empty states, confirmations, onboarding, notifications, loading states, tooltips, settings, upgrade prompts, paywalls, trial banners, store listings. Every string is assigned to a moment and the moment decides the shape. Selling moments (upgrade, paywall, trial) state the limit hit, the gain, and the price, and always give a way out.

Ships a catalogue of moments with before/after pairs (`references/moments.md`).

## Rules both skills enforce

- No em-dashes.
- No staccato stacks ("Fast. Simple. Yours.").
- No "It's not X, it's Y" constructions. Say Y, with the number.
- Numbers are never invented. Missing facts are left as `[FACT NEEDED: ...]`.

Both skills load `psoares-writing:human-prose` for the final pass.

## License

MIT
