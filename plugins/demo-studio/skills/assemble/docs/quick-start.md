# Assemble: quick start

```sh
node lib/assemble.mjs <project> <id> --draft   # build/<id>.draft.mp4, fast, a third of the size
node lib/review.mjs <project>                  # optional: watch it, live from the recordings or the draft, and comment
node lib/assemble.mjs <project> <id>           # build/<id>.mp4, the full render
```

The first run installs the camera (Remotion) into `~/.cache/demo-studio/camera`. A render is
heavy: run nothing else heavy at the same time.
