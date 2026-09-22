# Examples

Bad/good pairs by requirement type. The "bad" column is how requirements arrive: from a meeting note, a Slack thread, a first draft. The "good" column is the register.

## Problem statements (human register)

The problem section is prose. The facts go inside the sentences; the sentences are still for a reader. Two failure modes: feelings instead of data, and a bullet dump instead of a paragraph.

**Bad (feelings):**
> Users are frustrated with checkout and we're losing sales. We think a faster flow would really help.

**Bad (bullet dump, right facts, wrong register):**
> - 15% drop-off at payment step
> - 42 support tickets, "card" + "error"
> - Aug 2026

**Good:**
> Fifteen percent of sessions that reach the payment step do not complete it (analytics, 1 to 31 August 2026). In the same month, support received 42 tickets that mention "card" and "error", and in 30 of them the customer had tried the same card twice. The pattern points at the decline message: it says nothing about what to do next, so people retry, fail again, and leave. Fixing the message alone will not recover all 15%, but it is the cheapest change with a measurable effect, and it unblocks the retry-flow work planned for Q4.

The facts that matter are all there, with sources. The reader also learns what the author believes is going on and why this fix comes first. That is what the section is for.

Individual evidence lines, when you need them (for a goals line or a metrics table):

| Bad | Good |
|---|---|
| Onboarding is too long. | Median time from signup to first deployment is 26 minutes. 38% of signups never deploy. `[DATA NEEDED: target time]` |
| People keep asking for dark mode. | 14 of the last 50 feature requests in the support inbox ask for a dark theme. No revenue impact is measured. |

Everything below this line is the decision register.

## Functional requirements

| Bad | Good |
|---|---|
| We want a way for users to change their passwords if they forget them. | FR-1. Allow an unauthenticated user to request a password reset email from the "Forgot password" link on the login screen. |
| The system should let admins export stuff. | FR-2. Allow an **Admin** to export the audit log as CSV for any date range up to 12 months. |
| Users should be able to invite people, and the invited people get an email, and they can accept it. | FR-3. Allow an **Editor** or **Admin** to invite a user by email address. FR-4. Send the invitee an email containing an accept link within 60 seconds of the invite. FR-5. Allow the invitee to accept the invite from the link and create an account with the **Viewer** role. |
| Handle duplicates gracefully. | FR-6. Reject an invite to an email address that already belongs to a member of the workspace, and display "ana@acme.com is already a member." below the email field. |
| It would be nice to remember the last filter. | FR-7. The Reports page SHOULD restore the last filter set the user applied, per workspace, for 30 days. |

## Performance and non-functional

| Bad | Good |
|---|---|
| The page should ideally load pretty fast so the user doesn't get annoyed and leave. | NFR-1. The Reports page must render the first chart within 2.0 seconds at the 95th percentile on a 4G connection (as measured by Lighthouse, mobile preset). |
| Needs to scale. | NFR-2. The API must sustain 500 concurrent sessions with a p95 response time under 300 ms. |
| Should be secure. | NFR-3. The system must encrypt exported CSV files at rest with AES-256 and delete them 24 hours after creation. |
| Accessible. | NFR-4. Every interactive element on the Reports page must be reachable by keyboard and must meet WCAG 2.2 AA contrast. |

## Data and permissions

| Bad | Good |
|---|---|
| The dashboard will show a bunch of different metrics depending on who is logged in. | FR-8. Display only the metrics whose `visibility` includes the user's **Role Profile** (see the Role Matrix, section 4.2). |
| Admins can do everything, editors most things, viewers just look. | See the table below. A mapping is a table, not a sentence. |

| Action | Viewer | Editor | Admin |
|---|---|---|---|
| View reports | Yes | Yes | Yes |
| Export CSV | No | Yes | Yes |
| Invite users | No | Yes | Yes |
| Revoke API keys | No | No | Yes |

## Error handling

| Bad | Good |
|---|---|
| Show an error if payment fails. | FR-9. When the payment provider returns `card_declined`, display "Card declined. Try another card." below the card field, keep all form values, and log the provider's request ID. |
| Handle timeouts. | FR-10. When the payment provider does not respond within 10 seconds, display "We couldn't confirm your payment. Check your email before retrying." and log the request ID. Do not retry automatically. |
| Something should happen when the upload is too big. | FR-11. Reject files over 25 MB before upload starts, and display "Files must be under 25 MB." next to the file picker. |

## Acceptance criteria

| Bad | Good |
|---|---|
| Export works for the right people. | AC-1. Given a **Viewer** on the Reports page, when they open the export menu, then the CSV option is disabled and shows the tooltip "Available to Editors and above." |
| Reset email gets sent. | AC-2. Given an unauthenticated user enters a registered email on the "Forgot password" screen, when they submit, then a reset email is delivered to that address within 60 seconds and the screen shows "Check your email for a reset link." |
| Doesn't leak whether the email exists. | AC-3. Given an unauthenticated user enters an unregistered email on the "Forgot password" screen, when they submit, then the screen shows the same message as AC-2 and no email is sent. |

## User stories

| Bad | Good |
|---|---|
| As a user I want the app to be faster. | As a **Viewer**, I want the Reports page to render within 2.0 seconds so that I can check the daily numbers during a standup without waiting. |
| As an admin I want to manage keys. | As an **Admin**, I want to revoke an API key from the key list so that a leaked key stops working within 60 seconds. |

## Non-goals and open questions

| Bad | Good |
|---|---|
| We might do SSO later. | Non-goal. This release does not support SSO. It is scheduled for Q1 2027 after the identity provider migration. |
| We need to figure out how login works with the mobile app. | Open question (owner: mobile lead, due 3 October). Does the mobile app share the web session, or does it need its own reset flow? |
| Maybe support Excel export too. | Non-goal. This release exports CSV only. XLSX is not planned. |

## Portuguese register

The same rules hold in PT-PT. "Deve" for MUST, "deveria" for SHOULD, "pode" for MAY. Imperative verb first. Numbers with units. Terms from the codebase stay in English.

| Mau | Bom |
|---|---|
| Era bom que a página carregasse rápido. | NFR-1. A página de Relatórios deve renderizar o primeiro gráfico em menos de 2,0 segundos no percentil 95, em ligação 4G. |
| Os admins devem conseguir exportar as coisas. | FR-2. Permitir a um **Admin** exportar o audit log em CSV para qualquer intervalo até 12 meses. |
| Tratar os erros de pagamento. | FR-9. Quando o fornecedor de pagamentos devolver `card_declined`, mostrar "Cartão recusado. Tenta outro cartão." por baixo do campo do cartão, manter os valores do formulário e registar o request ID do fornecedor. |
| Se calhar fazemos SSO mais tarde. | Fora de âmbito. Esta release não suporta SSO. Está planeado para o Q1 de 2027, depois da migração do identity provider. |

## The one-line test

Take any requirement out of the document and read it alone. If a QA engineer could write a pass/fail check from that line, without opening the document again and without asking anyone, it is in the register. If not, it is missing a verb, a number, a role, or a decision.
