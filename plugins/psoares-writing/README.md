# psoares-writing

Writing and prose tooling for Claude Code.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-writing@psoares-claude-plugins
```

## Skills

### `human-prose`

Humanizes written output so it sounds like a real person instead of AI. Applies a style layer — what text sounds like, not what it says — covering word choice, rhythm, punctuation (no em-dashes), and banned AI-isms ("crucial", "leverage", "seamless", "dive in"…).

Works across languages; picks up the target language from an explicit parameter or from the conversation. Triggers on any request that produces prose (emails, blog posts, video scripts, social posts, captions, newsletters, course material) or on explicit complaints like "sounds robotic", "soa a AI", "mais natural".

For PT-PT specifically, defaults to `tu` and PT-PT spelling, with language-specific rules in `references/pt.md` when present.

## License

MIT
