# Assemble: quick start

```sh
node lib/assemble.mjs <project> <id> --draft   # build/<id>.draft.mp4, fast, a third of the size
node lib/review.mjs <project>                  # optional: watch the draft and leave comments
node lib/assemble.mjs <project> <id>           # build/<id>.mp4, the full render
```

The first run installs the camera (Remotion) into `~/.cache/psoares-video/camera`. A render is
heavy: run nothing else heavy at the same time.
