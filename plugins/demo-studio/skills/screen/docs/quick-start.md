# Screen: quick start

1. **Make a project folder** with `video.config.json` (copy `config.example.json` from the
   plugin) and set `app.base` to your site.
2. **Sign in once per account:** `node lib/login.mjs <project> admin` opens plain Chrome on your
   sign-in page. Sign in, then tell Claude. A public site needs no account: use `-`.
3. **Ask Claude for the video:** "Record a 40-second demo of creating a task in my todo app, then
   marking it done." Claude probes the pages, writes `videos/demo.mjs` and shows you the plan.
4. **Record:** `node lib/run.mjs <project> demo`. The machine stays awake on its own.
5. **Build it** with the `assemble` skill, and watch the draft before the full render.

For a voice-over, run the `voice` skill first (generate a voice, or bring your own recording):
the beats then follow its words.
