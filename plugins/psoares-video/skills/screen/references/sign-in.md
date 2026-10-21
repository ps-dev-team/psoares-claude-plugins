# Sign-in

Recordings run in real Chrome, one **profile per account**, kept outside the project
(`config.profiles`, e.g. `~/.config/psoares-video/<project>/profiles`), so a restart or a
cleaned project signs nobody out.

## Signing an account in, once

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/login.mjs" <project> <account>
```

It opens that account's profile in **plain Chrome**, with no automation, on `config.app.base` +
`config.app.login`, and prints the email and password from `config.accounts.<account>` for the
user to type. The user signs in (and ticks the captcha, if there is one), then closes the window.
Chrome keeps running after its last window on a Mac: stop the process login.mjs started (its
PID, never by name) so the session is written, then probe the account to confirm it opens
signed in.

Why plain Chrome: captchas such as Turnstile refuse a window Playwright drives ("the security
check did not pass"). The profile uses the same keychain flags Playwright does
(`--use-mock-keychain --password-store=basic`), so the recorder can read the cookies it saved.

## Rules

- Never script the login form past the captcha, and never try to get around a captcha. If a site
  offers no way to sign in without one, the user signs in by hand, as above.
- The session stays alive while the account is used; it ends if the account goes unused for long
  or somebody signs it out elsewhere. Then sign in again.
- Accounts in `video.config.json`:

  ```json
  "accounts": { "coach": { "email": "coach@example.com", "password": "…" } }
  ```

  Use test accounts only. A real person's password does not belong in a config file.

## Copied cookies (older projects)

An account can instead name a `cookies` file holding a copied `document.cookie`; the window loads
it and writes the newest session back on close. Profiles replaced this: copying by hand breaks on
every restart.
