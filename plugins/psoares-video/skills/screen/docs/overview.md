# Screen: record a demo like a person would

You describe what the video should show, in a script or in plain words. Claude turns it into
**beats**, small timed steps ("on the word *Projects*, click Projects"), opens a real Chrome
window and plays them while recording.

- **Real browser, real app.** Headed Google Chrome, signed in with your own test accounts, on
  your live site, a staging copy or `localhost`.
- **Nothing guessed.** Before writing a beat, Claude reads the page's accessibility tree, so
  every click uses the button's real name.
- **A human hand.** The pointer moves with its own arc and ease every time, rests before a
  click, shows the pointing hand only around a click and a closed hand while dragging.
- **Shows what the voice says.** "You can print it" opens the print preview; "it sends an
  invite" shows the email.
- **One window or two.** Two accounts side by side: an admin and a user, a seller and a buyer.
- **Timed to a voice or to seconds.** With a voice, actions land on the words. Without one, it
  makes B-roll: a page scrolling, a flow played at a calm pace.
- **Clean takes.** Each scene sets itself up and undoes what it added, so the next take starts
  the same. Steps that cannot be undone are planned and rehearsed first.

What comes out is the recording plus the pointer's path and the zooms as data. The `assemble`
skill turns that into the finished video.
