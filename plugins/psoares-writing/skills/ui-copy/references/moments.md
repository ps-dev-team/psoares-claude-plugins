# Moments

Every string inside an app belongs to one of these. Each entry: the job, the shape, a before/after pair, and platform notes where they matter. The "before" column is the kind of string a model or a rushed developer produces; the "after" is the conventional shape.

## Buttons

Job: tell the user what happens when they press it.

Shape: verb + object, sentence case, 1 to 3 words. The primary button names the outcome. The secondary names the alternative.

| Before | After |
|---|---|
| Submit | Create account |
| OK | Save changes |
| Go | Search |
| Click here to download | Download report |
| Yes / No | Delete file / Keep file |
| Learn more (as primary) | See pricing |

Platform: iOS alerts put the destructive action in red and on the right; Android on the right too; web varies. Never rely on position for meaning; the label carries it.

## Form labels, placeholders, helper text

Job: label says what the field is; placeholder shows an example; helper text states the rule before it's broken.

| Element | Before | After |
|---|---|---|
| Label | Enter your email: | Email |
| Placeholder | Email | you@company.com |
| Placeholder | Enter project name here | acme-staging |
| Helper | Must be valid | Lowercase letters, numbers, and dashes. 3 to 32 characters. |

Never put the rule only in the placeholder; it disappears when the user types.

## Inline errors

Job: say what is wrong with this field and what fixes it.

| Before | After |
|---|---|
| Invalid email | Enter an email address, like you@company.com. |
| Password too weak | Use at least 8 characters, with one number. |
| Required | Enter a team name. |
| Error | This name is taken. Try another. |

## Blocking errors

Job: what happened, why if it helps, what to do now.

| Before | After |
|---|---|
| Something went wrong. | Couldn't load deployments. Try again, or check status.acme.dev. |
| Error 500 | Couldn't save the draft. We've been notified. Copy your text before leaving this page. |
| Payment failed | Payment declined. Your bank refused the charge. Try another card or contact your bank. |
| Oops! Network error. | You're offline. Changes will sync when you reconnect. |
| Invalid token | Your session expired. Sign in again to continue. |

## Empty states

Job: say what this area is for and offer the one action that fills it.

| Before | After |
|---|---|
| No data. | Deployments appear here after your first push. [Connect a repo] |
| Nothing here yet! | No invoices yet. Your first one is created when a customer pays. |
| Your list is empty. Start adding items. | No team members yet. [Invite someone] |
| Empty. Quiet. Waiting for you. | No projects yet. [Create a project] |

## Confirmations

Job: name the action, state the consequence, label both buttons with what they do.

| Before | After |
|---|---|
| Are you sure? [OK] [Cancel] | Delete 3 files? This can't be undone. [Delete files] [Keep files] |
| Confirm removal [Yes] [No] | Remove Ana from Acme? They'll lose access immediately. [Remove Ana] [Keep Ana] |
| Cancel? [Cancel] [Cancel] | Cancel your subscription? You keep Pro until 30 October. [Cancel subscription] [Keep Pro] |

If the action is reversible, skip the dialog and offer undo in a toast.

## Success

Job: confirm what happened and point to the next step if there is one.

| Before | After |
|---|---|
| Success! | Invite sent to ana@acme.com. |
| Done. | Changes saved. |
| Yay, you're all set! | Your first deployment is live at acme.vercel.app. |

One exclamation mark is allowed for a first-time milestone. None otherwise.

## Loading

Job: say what is happening, and how long if it's more than a few seconds.

| Before | After |
|---|---|
| Loading... | Loading deployments |
| Please wait | Building. This usually takes under a minute. |
| Hang tight! | Importing 4,200 contacts. You can leave this page. |

## Toasts

Job: one line, what happened, optional undo.

| Before | After |
|---|---|
| Action completed successfully | Project archived. [Undo] |
| Copied! | Link copied. |
| Item removed from your list | Removed from watchlist. [Undo] |

## Notifications

Job: who did what to which object. The user should know whether to open it from the first line.

| Before | After |
|---|---|
| You have a new notification | Ana commented on Q3 report. |
| Activity on your project | Deploy failed on main: build error in app/page.tsx. |
| Someone mentioned you | Rui mentioned you in Pricing discussion. |

## Tooltips

Job: say what the icon doesn't, in under eight words. Never restate the visible label.

| Before | After |
|---|---|
| Click to copy the link to your clipboard | Copy link |
| Settings | Notification settings |
| (tooltip on a button labelled "Save") | (none) |

## Transactional emails

Job: subject says what it is, body says what to do and what happens if they don't. These have a shape every user has read. Use it.

**Magic link**

| Before | After |
|---|---|
| Subject: Your link | Subject: Sign in to Valora |
| One click in the mail signs you in here. | Click the link below to sign in to Valora. [Sign in] |
| Not there? Check spam, and that the address is right. The link is good for an hour and works once. | This link expires in 1 hour and can only be used once. If you didn't request it, you can ignore this email. |

**Waitlist confirmation**

| Before | After |
|---|---|
| Subject: You're in. | Subject: You're on the Valora waiting list |
| One email when we open. Nothing else. | We'll send you one email when Valora launches. We won't send anything else. |

**Verification**

| Before | After |
|---|---|
| Verify your thing | Subject: Verify your email for Acme |
| Tap to confirm it's you. | Click the link below to verify ana@acme.com. [Verify email] |

**Receipt**

| Before | After |
|---|---|
| Thanks! | Subject: Your Acme receipt for September |
| You paid. Here's the proof. | You paid $20.00 for Acme Pro on 21 September 2026. [Download invoice] |

## Onboarding

Job: one concept per screen, the action at the bottom, always a way to skip.

| Before | After |
|---|---|
| Welcome! Let's get you set up. We'll walk you through everything. | Connect a repo to deploy on every push. [Connect GitHub] [Skip for now] |
| Step 1 of 7 | (same, but 3 steps) |
| Almost there! Just a few more things... | Invite your team. They'll see every deployment. [Invite] [Do this later] |

## Settings descriptions

Job: say what changes when you flip it.

| Before | After |
|---|---|
| Enable notifications | Email me when a deploy fails. |
| Dark mode | Use dark colours. Follows your system setting when off. |
| Advanced: Enable experimental features | Turn on features still in testing. They may change or break. |

## Permission prompts (pre-OS)

Job: say why you need it, before the OS dialog the user can't edit.

| Before | After |
|---|---|
| We need access to your notifications | Allow notifications to know when a deploy finishes. [Allow] [Not now] |
| Camera permission required | Valora needs the camera to scan documents. [Continue] [Not now] |

## Upgrade prompts

Job: the limit they hit, what the next tier gives, the price, a way out.

| Before | After |
|---|---|
| Upgrade to unlock more! | You've used 3 of 3 projects on Free. Pro has unlimited projects for $20/month. [Upgrade to Pro] [Not now] |
| This feature is Pro only. | Replay is included in Team, $49/month. [Start 14-day trial] [Not now] |

## Paywalls

Job: the feature, what it does, the price, one CTA, one way out.

| Before | After |
|---|---|
| Go Premium for the full experience | Replay deliveries from the last 30 days. Included in Team, $49/month. [Start free trial] [Maybe later] |

## Trial banners

Job: days left, what happens after, one CTA.

| Before | After |
|---|---|
| Your trial is ending soon! | 12 days left on your trial. After that, projects go read-only. [Add a card] |
| Trial expired. | Your trial ended on 18 September. Projects are read-only until you add a card. [Add a card] |

## Feature announcements (in-app)

Job: verb phrase title, the situation it fixes, one CTA. No "We're excited".

| Before | After |
|---|---|
| We're excited to announce Replay! | Replay by time range. When an endpoint was down for an hour, resend the hour. [Try it] [Dismiss] |

## Store listings

Job: first line is the claim (it's the only one shown before "more"), then what it does in plain sentences, then proof.

Shape:
1. One line: the claim, under 80 characters.
2. Two or three sentences: what it does, for whom.
3. Three to five bullet features, each verb + object with a number if there is one.
4. Proof: ratings, press, or a number.
5. Price and what's free.

| Before | After |
|---|---|
| The ultimate productivity companion for your busy life! | Track expenses in ten seconds, split them with anyone. |
| Packed with powerful features | Splits by percentage, shares, or exact amounts. Works offline. Exports to CSV. |

Platform: App Store subtitle is 30 characters. Play Store short description is 80. Write those first, then the long description.
