# <App>: context for screen recordings

What a recorder needs to know about this app or site. Keep it short and current: add to it
whenever a take teaches you something.

## What it is

One paragraph: who uses it and the main things in it (for example: a todo app with boards,
tasks, comments and an admin area).

## Accounts

| Key | Who | What it has | Notes |
|---|---|---|---|
| `admin` | Alex Morgan, admin | full demo data | |
| `user` | Sam Lee, a member of Alex's team | two boards | |
| `empty` | a new account | nothing yet | must stay empty: undo every take |

A public website needs no accounts: use `-` as the account.

## Where things are

- Boards: sidebar > Boards. Ten per page; search before clicking a name.
- …

## Show

What proves a feature on screen. When a script line names one, the take shows it.

| Line mentions | Show |
|---|---|
| printing | open the print preview |
| an invite | the invite email |
| … | |

## Irreversible

What a take cannot undo, and what it does to the next take.

- Archiving a board: it cannot be restored. Create a fresh one in setup.
- …

## Undo

How a take puts things back.

- An added task: delete it (menu > Delete > confirm).
- …

## State resets

How each segment starts from the same state, so a retake is repeatable.

- **Per segment:** what `setup` does before recording (delete what an earlier take added, open
  the right page) and what `cleanup` does after (undo what this take added).
- **Per account:** a reset script for anything the app cannot undo, such as a seed file or an API
  call that puts the account back before an irreversible step (an invite accepted, a role
  activated, an item closed). Write down the command, who runs it, and what it touches.
- Example: `psql -f seeds/reset-demo-user.sql` puts the user back before the invite; run it after
  each take of the invite scene.

## Quirks

- At 1024 px wide, the sidebar folds into one button: do setup at full width.
- …
