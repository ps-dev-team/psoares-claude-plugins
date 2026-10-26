# Sign-in

Recordings run in real Chrome, one **profile per account**, kept outside the project
(`config.profiles`, e.g. `~/.config/demo-studio/<project>/profiles`), so a restart or a
cleaned project signs nobody out.

## Signing an account in, once

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/login.mjs" <project> <account>
```

It opens that account's profile in **plain Chrome**, with no automation, on `config.app.base` +
`config.app.login`, and prints the email and password from `config.accounts.<account>` for the
user to type. The user signs in (and ticks the captcha, if there is one), waits for the app's first page,
and tells you, **leaving the window open**. Then stop the Chrome login.mjs started (the main
process of that profile, by its PID, never by name), wait until it has exited, so the session
is written to the profile, and probe the account on the app's home page to confirm it opens signed in (the sign-in page
itself can look signed out even when the session is there). A window closed
by hand, or a Chrome stopped before it exits, can lose the session: then sign in again.

Why plain Chrome: captchas such as Turnstile refuse a window Playwright drives ("the security
check did not pass"). The profile uses the same keychain flags Playwright does
(`--use-mock-keychain --password-store=basic`), so the recorder can read the cookies it saved.

A public website, or a page with no account, needs none of this: use `-` as the account.

## Rules

- Never script the login form past the captcha, and never try to get around a captcha. If a site
  offers no way to sign in without one, the user signs in by hand, as above.
- The session stays alive while the account is used; it ends if the account goes unused for long
  or somebody signs it out elsewhere. Then sign in again.
- Accounts in `video.config.json`:

  ```json
  "accounts": { "admin": { "email": "admin@example.com", "password": "…" } }
  ```

  Use test accounts only. A real person's password does not belong in a config file.

## Copied cookies (older projects)

An account can instead name a `cookies` file holding a copied `document.cookie`; the window loads
it and writes the newest session back on close. Profiles replaced this: copying by hand breaks on
every restart.
