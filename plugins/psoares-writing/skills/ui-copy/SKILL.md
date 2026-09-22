---
name: ui-copy
description: >
  Writes or reviews the words inside an app: button labels, form labels and
  placeholders, error messages, empty states, confirmation dialogs, onboarding
  screens, magic-link and verification emails, notifications, toasts, loading
  states, tooltips, settings descriptions, upgrade prompts, paywalls, trial
  banners, feature announcements, App Store and Play Store listings. Use whenever
  the user asks what a button, dialog, toast, error, email, or screen should say,
  pastes UI strings to review, or is building a screen and needs the text in it.
  Trigger phrases: "what should this button say", "error message", "empty state",
  "confirmation dialog", "onboarding copy", "microcopy", "UX copy", "UI copy",
  "tooltip", "toast", "placeholder", "upgrade prompt", "paywall", "trial banner",
  "magic link email", "app store description", "texto do botão", "mensagem de
  erro", "ecrã vazio", "copy da app", "o que dizer aqui". Also use during frontend
  work when a component contains user-facing strings, even if the user did not ask
  about the words, because default strings ("Submit", "Something went wrong",
  "Are you sure?") are the ones this skill replaces.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# UI Copy

The words inside the app. A string in an interface takes screen space like a button or an icon, so it has to earn the space: inform, enable an action, or move the user one step. When it cannot do one of those, delete it.

In UI, boring is correct. The user has read a thousand sign-in screens, error messages, and confirmation dialogs. Use the shape they already know. Voice belongs on the marketing page; inside the app it costs attention and buys nothing.

Load `psoares-writing:human-prose` as well. It runs as the final pass. When the flow starts on the website (signup, trial, pricing), load `product-copy` too, so the promise and the nouns match on both sides.

## Before writing

Get these, or ask in one message:

1. **The screen and the flow.** Where is the user, where did they come from, where do they go next.
2. **The state.** First run, mid-task, something broke, about to pay, about to delete something.
3. **The product's nouns.** What it calls its objects: project, workspace, deployment, key. Use those. Do not introduce a synonym.
4. **Limits.** Character counts, platform (web, iOS, Android, desktop), translation. A button that fits in English at 12 characters is 18 in German.
5. **Tone**, if the product has one. Default is a competent colleague: plain, calm, specific, in full sentences.

If the user is building a component and hasn't asked about the strings, write them anyway and say so. Defaults like "Submit" and "Something went wrong" are what this skill exists to replace.

## The moment decides the shape

Every string belongs to one moment. Name it first. Full catalogue with before and after pairs in `references/moments.md`; the shapes are here.

| Moment | Shape | Example |
|---|---|---|
| Button | Verb + object, 1 to 3 words, names the outcome | "Create project", "Send invite", "Delete 3 files" |
| Form label | The noun, no colon, no question | "Email", "Team name", "Card number" |
| Placeholder | An example value, never the label repeated | "you@company.com", "acme-staging" |
| Helper text | The rule the user would otherwise break | "Lowercase letters, numbers, and dashes." |
| Inline error | What is wrong with this field, and what fixes it | "Use at least 8 characters." |
| Error (blocking) | What happened, why if known, what to do now | "Payment declined. Your bank refused the charge. Try another card or contact your bank." |
| Empty state | What this area is for, one action that fills it | "Deployments appear here after your first push. [Connect a repo]" |
| Confirmation | The action as a question with the count, the consequence, buttons that name the action | "Delete 3 files? This can't be undone. [Delete files] [Keep files]" |
| Success | What just happened, and the next step if there is one | "Invite sent to ana@acme.com." |
| Loading | What is happening, and how long if over 3 seconds | "Building. This usually takes under a minute." |
| Toast | One line, what happened, optional undo | "Project archived. [Undo]" |
| Notification | Who did what to which object | "Ana commented on Q3 report." |
| Tooltip | The thing the icon doesn't say, in under 8 words | "Copy link" |
| Transactional email | Subject says what it is; body says what to do and what happens if you don't | See `references/moments.md` |
| Onboarding | One concept per screen, the action at the bottom | "Connect a repo to deploy on every push. [Connect GitHub] [Skip for now]" |
| Settings description | What changes when you flip it, in one sentence | "Send a daily digest of activity at 9:00 in your timezone." |
| Permission prompt | Why you need it, before the OS asks | "Allow notifications to know when a deploy finishes." |
| Upgrade prompt | What they hit, what the next tier gives, the price | "You've used 3 of 3 projects on Free. Pro has unlimited projects for $20/month. [Upgrade to Pro]" |
| Paywall | The feature, what it does, the price, one CTA | "Replay deliveries from the last 30 days. Included in Team, $49/month. [Start free trial]" |
| Trial banner | Days left, what happens after, one CTA | "12 days left on your trial. After that, projects go read-only. [Add a card]" |
| Feature announcement | Verb phrase title, the situation it fixes, one CTA | "Replay by time range. When an endpoint was down for an hour, resend the hour. [Try it]" |
| Store listing | First line is the claim, then what it does, then proof | See `references/moments.md` |

## Mannered brevity, the LLM tell

This is the pattern to hunt for hardest, because it reads as "clean" at first glance and it is what a model produces when asked for "minimal" copy.

> One email when we open. Nothing else.
> One click in the mail signs you in here.
> Not there? Check spam, and that the address is right. The link is good for an hour and works once.

The tells:

- **Fragments as reassurance.** "Nothing else." A full stop doing the work of a sentence.
- **Dropped articles and floating deixis.** "in the mail", "here", "there". The subject of the sentence is a click.
- **Rhetorical question, then answer.** "Not there? Check spam." The app interviewing itself.
- **Two rules spliced into one clipped line.** "good for an hour and works once". Two facts, one breath, a folksy verb ("good for") where the standard one ("expires") exists.
- **Cleverness where a convention exists.** A magic-link email has a shape every user has read. Deviating from it costs attention.

The fix is the conventional phrase, in a full sentence, with the subject and the articles in place:

| Before | After |
|---|---|
| One email when we open. Nothing else. | We'll send you one email when Valora launches. |
| One click in the mail signs you in here. | We sent a sign-in link to ana@acme.com. Click it to continue. |
| Not there? Check spam, and that the address is right. The link is good for an hour and works once. | Didn't get the email? Check your spam folder or [resend the link]. The link expires in 1 hour. |

Test: would a support agent at Stripe say this sentence to a customer, out loud, without sounding odd? If not, rewrite.

## Selling inside the app

Some moments sell: upgrade prompts, paywalls, trial banners, announcements. Same rules as the website, tighter:

- Name the limit they hit, with the number. "3 of 3 projects" does the persuading.
- Name what the next tier gives, with the number. "Unlimited projects", "30 days of logs".
- Name the price. Hiding it costs more trust than the price does.
- One CTA that says what happens: "Upgrade to Pro", "Start free trial", "Add a card". Not "Learn more".
- Give the way out: "Skip for now", "Maybe later", "Not now". A prompt without one reads as a trap.
- No urgency you can't back with a date. "Ends Friday" is fine if it ends Friday.

Every other moment does not sell. An error message that pitches Pro is an error message the user will remember for the wrong reason.

## Errors, in detail

The shape is what happened, why if you know, what to do now. Three sentences at most.

- Say what the system did or couldn't do: "Couldn't save the draft."
- Say why only if it helps the user act: "Your connection dropped." Skip internal reasons: "Error 500" tells them nothing.
- Say what to do, as a verb: "Try again", "Check the URL", "Contact your bank". If there is nothing they can do, say you are on it and give them a way to leave.
- Never blame: "Invalid input" becomes "Use a URL that starts with https://".
- Never apologise twice. One "Sorry" in a blocking error is enough; none in an inline one.
- Never "Something went wrong" alone. If you don't know what went wrong, say what they can do: "Couldn't load deployments. Try again, or check status.acme.dev."

## Confirmations, in detail

- The title is the action with the object and the count: "Delete 3 files?", "Remove Ana from Acme?", "Cancel subscription?"
- The body is the consequence, one sentence: "This can't be undone." "They'll lose access immediately." "You keep Pro until 30 October."
- The buttons name the action and the alternative: "[Delete files] [Keep files]", "[Remove] [Keep Ana]", "[Cancel subscription] [Keep Pro]". Never "OK / Cancel" on a destructive dialog, because "Cancel" becomes ambiguous.
- If the action is reversible, don't confirm. Do it and offer undo in a toast.

## Buttons and labels

- Verb + object. "Save changes", "Create key", "Invite teammate". A bare verb ("Save") is fine when the object is the whole screen.
- Primary button says what happens next. Secondary says the alternative, not "Cancel" unless cancelling is the alternative.
- Match the button to the promise that got them here. If the website said "Deploy now", the button in the app is "Deploy", not "Publish".
- Sentence case. "Create project", not "Create Project".
- No "Click here", no "Submit", no "Go", no "Yes"/"No" as a pair.

## Banned in UI

- Em-dashes.
- Mannered brevity (the section above). Fragments as sentences, dropped articles, rhetorical questions, folksy verbs where a standard one exists.
- Staccato stacks. Short strings are fine; three one-word sentences in a row in a body text are not.
- "It's not X, it's Y." Say Y.
- "Oops", "Uh oh", "Whoops", "Yay", "Hooray", "Awesome".
- Exclamation marks, except one in a success state when the user did something big (first deploy, first payment).
- "Are you sure?" as a title. Name the action.
- "Something went wrong" as the whole message.
- "Please" at the start of every instruction. Once per screen at most.
- Questions the app should answer itself: "Do you want to save?" becomes "[Save] [Discard]".
- Jargon from the codebase leaking out: "null", "undefined", "entity", "payload", "invalid token" (say "sign in again").
- Synonyms for the product's own nouns. Pick one, use it everywhere.

## Output format

For a single string: the string, then one line on why, then up to two alternatives if the tone could go two ways.

For a screen or flow: a table with columns Element, Copy, Notes (limits, translation, which moment). Then the strings again as a block ready to paste into a strings file or component, in the format the codebase uses if it is visible (JSON, `.strings`, `t()` keys).

For a review of existing strings: a table with Before, After, and the reason in five words or fewer.

## Final checklist

- [ ] Every string is assigned to a moment and uses that moment's shape.
- [ ] Every sentence has a subject, a verb, and its articles. No fragments outside buttons and labels.
- [ ] Buttons are verb + object and name the outcome.
- [ ] Errors say what happened and what to do now.
- [ ] Empty states name the one action that fills them.
- [ ] Destructive confirmations name the action on both buttons.
- [ ] Selling moments state the limit, the gain, and the price, and give a way out.
- [ ] Same noun for the same thing everywhere.
- [ ] Zero em-dashes, zero staccato stacks, zero "not X, but Y", zero mannered brevity.
- [ ] Fits the character limits given, with room for translation.
- [ ] A support agent could say every sentence out loud without sounding odd.

## References

- `references/moments.md`: every moment with the shape, before/after pairs, and platform notes (iOS, Android, web, email).
