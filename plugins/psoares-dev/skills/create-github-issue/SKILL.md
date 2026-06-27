---
name: create-github-issue
description: >-
  Use whenever the user wants to open, file, create, or "abrir/criar um ticket/issue"
  on GitHub for the current project — bug reports, feature requests, tech-debt,
  exploratory/spike tickets, or "let's track this". Investigates the codebase FIRST
  to ground the issue in real file references, works out which package/area it touches
  (and which it does NOT), picks the correct existing labels, and writes a structured,
  well-scoped issue before creating it with `gh`. Repository-agnostic — it discovers
  each project's structure, labels, language and conventions at runtime, so it is
  reusable across any repo. Prefer this over a bare `gh issue create` whenever an
  issue should be grounded in the code rather than a one-line note.
---

# Create a GitHub issue (grounded & well-scoped)

The value of this skill is **not** typing `gh issue create` — it's producing an issue
that a future reader (or you, weeks later) can act on without re-discovering everything.
That means: grounded in the actual code, scoped to the right part of the repo, and
labelled the way *this* repo labels things. You earn that by doing a little investigation
first and by discovering the repo's conventions instead of assuming them.

This skill is deliberately **repository-agnostic**. Do not assume any particular folders,
package names, label names, or language. Discover them each time from the repo in front of
you. The same skill should work in a Go monorepo, a single Python service, or a JS app.

## The loop

1. Orient — learn the repo's structure and conventions (cheap, once).
2. Investigate — find the relevant code and ground the issue in it (bounded).
3. Place — decide what it touches, what it doesn't, and which labels apply.
4. Draft — write a structured body in the repo's language.
5. Confirm & create — show the user, then `gh issue create`.

Don't skip 1–3. A bare title with no code references is exactly what this skill exists to
avoid.

## 1. Orient

Read the repo's own orientation docs before anything else — they tell you the package
boundaries and conventions so your scoping matches how the team actually thinks. Look for
whichever exist: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, and a top-level
listing of the workspace (e.g. `packages/`, `apps/`, `services/`, `crates/`, `cmd/` — but
discover, don't assume). A monorepo's root README often maps each package to its purpose;
that map is your scoping vocabulary.

Also discover, with `gh`:

- **The target repo** — `gh repo view --json nameWithOwner -q .nameWithOwner`. Default to
  the repo of the current working directory unless the user names another.
- **The label vocabulary** — `gh label list`. This is the source of truth for labels. You
  do not invent labels; you map the issue onto what exists (see §3).
- **Issue conventions** — skim a few recent issues (`gh issue list --limit 10`, then
  `gh issue view <n>`). Pick up the *language* the team writes in (these may be Portuguese,
  English, etc. — match it), the tone, and any house structure. Match what you find.
- **Issue templates** — check `.github/ISSUE_TEMPLATE/`. If a template fits the issue type,
  follow its structure instead of the generic one below.

Keep this step light — it's a few reads and two `gh` calls, not a full audit.

## 2. Investigate (bounded)

Before writing, find the code the issue is about and **ground every claim in it**. The goal
is concrete `path:line` references, not prose. Typically: grep for the feature/symbol, read
the handful of files that matter, and confirm the behaviour you're describing actually
exists where you say it does.

Why this matters: an issue that says "the email sometimes fails" is noise; one that says
"`packages/email/src/client.ts:14` throws when the key is unset, and the caller swallows it
at `…/actions.ts:104`" is a work order. The reader can start immediately.

Investigate **enough to place it confidently and back your claims — then stop.** You are not
fixing it and not reviewing the whole subsystem. If you discover a *second, real* problem
while looking (e.g. a documented fallback that doesn't actually do anything), note it — but
don't go hunting for more.

If the issue is purely a product/idea with no code yet, say so explicitly rather than
inventing references.

## 3. Place it: scope + labels

**Scope — what it touches, and what it does NOT.** Boundaries are often the most useful
thing in the issue. State which package/area owns the change, and call out adjacent areas it
should *not* leak into, with the reason. (A bug that surfaces in the app may belong to the
app even though it looks like a design-system component — saying so saves the next person a
wrong turn.) Use the package vocabulary you learned in §1.

**Labels — map onto what exists.** From `gh label list`, apply:

- A **type** label if the repo has one (`bug`, `enhancement`, `documentation`, a spike/
  exploration label, …). Match the issue's nature.
- An **area/scope** label if the repo has per-package/area labels and one fits the package
  you scoped to.
- A **status** label only if clearly warranted (e.g. a "needs info / blocked" label when the
  issue is a question pending a repro).

Rules of thumb:

- Never apply a label that isn't in `gh label list`. Inventing labels fragments the taxonomy.
- If no area label fits but the repo clearly organises issues by area, **propose** creating
  one to the user (name + colour + description) and only create it on confirmation — don't
  silently invent it.
- It's fine to apply more than one label (type + area). Don't over-label.

## 4. Draft the body

Match the repo's language and any template. Absent a template, this general structure works
for most issues — drop sections that don't apply rather than padding them:

- **Title** — specific and searchable: what + where. "X breaks in Y because Z" beats "X bug".
- **Problem / symptom** — what's wrong or wanted, and the user-visible impact.
- **Current state** — how it works today, with `path:line` references from §2.
- **Scope** — what it touches / what it explicitly does **not** touch, from §3.
- **Proposed fix _or_ exploration steps** — for a known fix, the change; for a spike, the
  open questions to answer. Don't over-prescribe an implementation you haven't validated.
- **Validation / done criteria** — how we'll know it's resolved (tests green, behaviour X).
- **Related** — link sibling issues by `#number` when relevant.

For **exploratory / no-code-yet** tickets, open the body with a one-line callout that it's a
flagging/spike ticket with no code changes intended yet — it sets the reader's expectations
and stops someone "fixing" a ticket meant for discussion.

Keep it tight. References and boundaries carry the weight; prose doesn't.

## 5. Confirm, then create

Creating an issue is outward-facing and visible to the team, so show the user the **title,
labels, and a short body summary** and get a clear go-ahead before creating — unless they've
already told you to just create it. If you're unsure between two scopes or label sets, ask;
that's the kind of judgement the user can make in one line.

Create it via the CLI, writing the body from a file to keep formatting intact:

```sh
gh issue create --repo <owner/name> \
  --title "<title>" \
  --label "<label>" [--label "<label>"] \
  --body-file <path-to-body.md>
```

Write the body to a scratch/temp file first (heredoc or your scratchpad), not inline, so
Markdown and newlines survive. Return the issue URL `gh` prints.

If `gh issue create` rejects a label (e.g. it was deleted between listing and creating),
re-run `gh label list`, fix the mapping, and retry — don't drop the labels silently.

## Notes

- This skill assumes the GitHub CLI (`gh`) is installed and authenticated. If `gh` isn't
  available, say so and offer to open the issue in the browser instead.
- One issue per distinct problem. If your investigation surfaces a clearly separate concern,
  it's fine to file it as its own issue (and cross-link), rather than overloading one ticket.
