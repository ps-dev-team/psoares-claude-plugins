---
name: prd-prose
description: >
  Sets the tone and sentence shape of requirements writing: PRDs, product
  requirement documents, feature specs, acceptance criteria, user stories,
  RFC requirement sections, ticket descriptions, anything engineering, design,
  or QA will build from. A style layer, not a generator: the user or another
  skill provides the structure and the facts, this skill sets the register per
  section. Problem, context, and risk sections get human prose; requirement,
  acceptance-criteria, and permission sections get authoritative, testable,
  unambiguous sentences. Use whenever the output is a
  requirement or a spec, and whenever the user says "PRD", "requirements",
  "spec", "acceptance criteria", "user story", "definition of done", "this reads
  like a wish list", "make this precise", "make it engineering-ready", "escreve
  os requisitos", "PRD em português", "critérios de aceitação", "especificação".
  Use it even for a single requirement sentence, because the MUST/SHOULD/MAY and
  number-and-unit rules are the ones that get skipped.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# PRD Prose

A style layer for requirements documents. A PRD has two kinds of sections and they need two registers. Getting the register wrong in either direction is the most common failure: a problem statement written as bullet points nobody understands the stakes of, or a requirements list written as a friendly paragraph nobody can test.

## Two registers, one document

**Sections a person reads to understand.** Problem, background, context, user research, goals, why now, alternatives considered, risks, rollout narrative. A stakeholder reads these to decide whether to fund the work and an engineer reads them to understand what they are optimising for. These are paragraphs. Load `human-prose` and write them in its register: a competent colleague explaining the situation, with the evidence in the sentences, in full prose with rhythm. Data still replaces feelings ("15% of sessions drop off at payment" rather than "users get frustrated"), but the sentences are for a reader, not a parser.

**Sections a person reads to build.** Functional requirements, non-functional requirements, acceptance criteria, user stories, permissions, error handling, data rules, non-goals, open questions. An engineer, a designer, or a QA person scans these for the one line that tells them what to do. Every sentence has to survive being read alone, out of context, by someone who will not ask a follow-up question. These use the decision register below.

Where a section is mixed (a "Solution overview" that narrates and then lists), the narration takes the human register and the list takes the decision register. The switch happens at the list, not at the heading.

| Section | Register | Shape |
|---|---|---|
| Problem, background, context | Human | Paragraphs, evidence inside the sentences |
| Goals, why now | Human | Short paragraphs; the goal itself may end as one measurable line |
| User research, personas | Human | Paragraphs, quotes kept verbatim |
| Solution overview | Mixed | A paragraph, then the list |
| Functional requirements | Decision | Numbered, imperative, MUST/SHOULD/MAY |
| Non-functional requirements | Decision | Numbered, metric, number and unit |
| Acceptance criteria | Decision | Given/when/then |
| Permissions, data rules, error states | Decision | Tables |
| Non-goals | Decision | One sentence each, with the reason |
| Open questions | Decision | Question, owner, due date |
| Risks, alternatives considered | Human | Paragraphs; each alternative gets why it lost |
| Rollout, success metrics | Mixed | A paragraph on the plan, then the metrics as a table |

## The decision register

**Decisions, not opinions.** The document records what was decided. "The page must load in under 2.0 seconds on a 4G connection." Not "we think the page should be fast" or "ideally the page loads quickly".

**Evidence, not feelings.** Problems are stated with data. "15% of sessions drop off at the payment step (analytics, August 2026)." Not "users get frustrated at checkout". If there is no data, say so: `[DATA NEEDED: drop-off rate at payment step]`. Never invent a number.

**Imperative verbs first.** Every requirement starts with what the system does: Allow, Display, Validate, Reject, Trigger, Restrict, Log, Send, Store, Return, Redirect, Hide, Disable.

**MUST, SHOULD, MAY.** Use them as RFC 2119 defines them and use nothing softer.

| Word | Means | Use for |
|---|---|---|
| MUST / must not | Hard requirement. Ship blocks without it. | Security, data integrity, legal, the core of the feature |
| SHOULD / should not | Expected. Can be dropped with a stated reason. | Quality of experience, defaults, performance targets that are not contractual |
| MAY | Optional. Implementer's call. | Enhancements, nice-to-haves, future hooks |

Banned in their place: "will ideally", "might", "could", "it would be nice", "we'd like", "consider", "try to", "where possible", "as needed".

**One requirement per sentence.** If a sentence has "and" joining two behaviours, split it. If a requirement needs a paragraph, it is several requirements; make it a list.

**Testable from the sentence alone.** A QA engineer can write a pass/fail check from the sentence without asking anyone. "Display an error" fails this. "Display the message 'Card declined. Try another card.' below the card field and keep the form values" passes.

**Every quantity has a number and a unit.** "Fast" is "under 2.0 seconds". "Large files" is "files over 25 MB". "Recent" is "the last 30 days". "Many users" is "more than 500 concurrent sessions".

**One noun per concept.** Fix the term on first use and never vary it. If section 1 says **User Dashboard**, section 4 does not say "main console" or "the home screen". Bold the term on first use in each section. When the codebase already has a name for the thing, the PRD uses the codebase's name.

**Roles, states, and variables in bold.** **Admin**, **Viewer**, **Pending**, **Archived**, **retry_count**. The reader scanning for their role or the state they are debugging finds it.

## Sentence shapes

Functional requirement:
> [Verb] [object] [condition] [constraint].
> Allow an **Admin** to export the audit log as CSV for any date range up to 12 months.

Performance requirement:
> [Metric] must [comparison] [number and unit] [condition].
> The dashboard must render the first chart within 1.5 seconds at the 95th percentile on a 4G connection.

Data or visibility rule:
> [Verb] [data] to [role or condition] [reference to the mapping].
> Display revenue metrics only to users whose **Role Profile** includes `finance:read` (see the Role Matrix in section 4.2).

Error handling:
> When [trigger], [verb] [exact message or behaviour] and [what is preserved or logged].
> When the payment API returns a timeout after 10 seconds, display "We couldn't confirm your payment. Check your email before retrying." and log the request ID.

Acceptance criterion:
> Given [state], when [action], then [observable result with a number where relevant].
> Given a **Viewer** on the Reports page, when they open the export menu, then the CSV option is disabled with the tooltip "Available to Editors and above."

User story (when the team uses them):
> As a [role], I want [capability] so that [measurable outcome].
> As an **Admin**, I want to revoke an API key from the key list so that a leaked key stops working within 60 seconds.

Non-goal:
> This release does not [capability]. [One sentence on why or when.]
> This release does not support SSO. It is scheduled for Q1 2027 after the identity provider migration.

## Structure rules

The structure of the document belongs to the user or the template they already use. These rules apply inside whatever structure exists:

- Numbered lists only for sequences: user flows, step logic, ordered states. If the order does not matter, it is a bulleted list.
- Tables for any mapping: roles to permissions, errors to messages, states to transitions, inputs to validations. A mapping written as prose is a mapping the reader will get wrong.
- Number requirements (FR-1, NFR-1, AC-1) so tickets and tests can point at them.
- A glossary or definitions block near the top when the document introduces more than three terms.
- Non-goals are a section, not a footnote. What is out of scope is a decision and gets recorded like one.

## Banned

- Em-dashes.
- Staccato stacks. "Fast. Reliable. Secure." says nothing a test can check.
- "Not X, but Y." State Y.
- Marketing vocabulary: robust, seamless, intuitive, powerful, delightful, best-in-class, cutting-edge, leverage.
- Hedging: ideally, might, could, hopefully, where possible, as appropriate, try to, consider, we'd like, it would be nice.
- Feelings as facts: "users will love", "users get annoyed", "feels slow".
- Vague quantifiers: fast, slow, large, many, few, recent, soon, often, most.
- "Etc." and "and so on" inside a requirement. List every case or state the rule that generates them.
- "The system should handle X gracefully." Say what it does.
- "As needed", "if applicable", "when relevant". Say when.
- Passive voice that hides who acts: "the email is sent" becomes "the system sends the email" or "the **Admin** sends the email".
- Requirements phrased as questions or as the author's process: "we need to figure out how login works". That is an open question; put it in the Open Questions section as a question with an owner.

## Calibration

- The decision register applies to the sections that get built from. Do not apply it to the problem, context, or risk sections; those are `human-prose` territory and a bulleted problem statement is as much a failure as a paragraph-shaped requirement.
- Both registers share the bans: no em-dashes, no staccato stacks, no "not X, but Y", no inflated vocabulary.
- If the user's team uses a template (Shape Up pitch, RFC, Amazon PR/FAQ, Jira story), keep their sections and their headings. Rewrite the sentences, not the skeleton.
- If the user writes in Portuguese, the register holds: "deve" for MUST, "deveria" for SHOULD, "pode" for MAY, imperativo no início, números com unidades. Reference terms from the codebase stay in English.
- When the user pastes a vague requirement and asks for the precise version, and the precision needs a number they haven't given, write the sentence with `[DATA NEEDED: ...]` in the slot and ask for it. Do not pick a plausible number.

## Final checklist

- [ ] Every requirement starts with an imperative verb.
- [ ] Every requirement has MUST, SHOULD, or MAY, and nothing softer.
- [ ] Every requirement is one sentence a QA engineer could turn into a pass/fail check.
- [ ] Every quantity has a number and a unit, or a `[DATA NEEDED]` marker.
- [ ] One noun per concept, bolded on first use, matching the codebase where it has a name.
- [ ] Numbered lists only for sequences; tables for mappings.
- [ ] Zero em-dashes, staccato stacks, "not X, but Y", hedges, marketing words, vague quantifiers.
- [ ] Non-goals and open questions are stated as such, not buried in requirements.
- [ ] Problem, context, and risk sections read as prose a stakeholder would follow, not as a bullet dump.
- [ ] Read one requirement in isolation: does it still say exactly what to build?

## References

- `references/examples.md`: bad/good pairs for every requirement type, including the Portuguese register.
