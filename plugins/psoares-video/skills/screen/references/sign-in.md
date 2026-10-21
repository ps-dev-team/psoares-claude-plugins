# Sign-in with copied cookies

Scripted logins fail on captchas (Turnstile, reCAPTCHA) and should not try to beat them. The
recorder signs in with the cookies of a session the user opened by hand.

## Per account

1. The user opens the app in a **fresh Incognito window** (one per account, so sessions do not
   mix), signs in, and in the DevTools console runs `copy(document.cookie)`.
2. They save it with `! pbpaste > /path/to/cookies-<account>.txt` (the `!` runs it in the chat,
   so the cookie never passes through the conversation).
3. They close the Incognito window **without signing out.** Signing out ends the session for the
   recorder too, a little later (when its access token expires).
4. `video.config.json` points to the file:

   ```json
   "accounts": {
     "coach": { "cookies": "/path/to/cookies-coach.txt" },
     "client": { "cookies": "/path/to/cookies-client.txt", "domain": "app.example.com" }
   }
   ```

   `domain` defaults to the host of `app.base`.

## Why the file is written back

Apps on Supabase (and others) rotate the refresh token every time the session refreshes, and
treat an old token coming back as theft: the whole session is revoked. So a window writes its
current cookies back to the file when it closes, on Ctrl-C, and on a crash. Never restore an old
copy of a cookie file, and never run two windows on the same account file at once.

When a take lands on the login page, the session is gone: ask the user for a fresh copy.

`document.cookie` cannot see `HttpOnly` cookies. If the app keeps its session in one, the user
copies it from DevTools > Application > Cookies instead, as `name=value; name=value`.
