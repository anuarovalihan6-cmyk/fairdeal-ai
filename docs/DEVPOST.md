# FairDeal AI

**Tagline:** Clear terms. Better work.

**Source code:** [anuarovalihan6-cmyk/fairdeal-ai](https://github.com/anuarovalihan6-cmyk/fairdeal-ai)

**Demo video:** Add the public YouTube URL after recording; no video has been submitted yet.

## Inspiration

A freelance project can start with a friendly conversation and end with two different ideas of what was promised. FairDeal AI explores how structured agreements, visible milestones, and clause-grounded discussion can help people set clearer expectations before that happens.

## What it does

A client describes a project in plain English. FairDeal AI prepares an editable agreement with deliverables, acceptance criteria, revision and ownership terms, milestones, dates, and an exact budget allocation. Its risk scanner highlights unclear wording and gives reviewable alternatives. The project workspace records submitted work and milestone reviews.

The payment adapter integrates PayPal Sandbox Orders v2: a server creates a test order, the buyer approves on PayPal Sandbox, and the server captures and independently verifies the result. The payment history distinguishes verified captures from pending, cancelled, failed, or unresolved attempts. No example payment is represented as a confirmed Sandbox transaction.

When expectations differ, the deal mediator compares both statements with the saved agreement, quotes relevant clauses, separates agreement facts from missing evidence, and suggests a nonbinding path forward. It never makes payment decisions.

## How we built it

Next.js, React, TypeScript, SQLite, Zod, custom responsive CSS, and Lucide icons. PayPal calls and optional Gemini calls run on the server. Gemini structured responses are validated before use, including exact milestone totals and clause quotation matching. Offline templates and local clarity checks remain available and are explicitly labeled as demo output.

## Challenges

Payment reliability requires more than displaying a success screen. The adapter persists request references, reuses the same payable order after a cancelled checkout, and recovers an uncertain capture through a fresh status lookup. AI output also needs validation: fluent wording is not evidence, and a recommendation must point to an actual agreement clause.

## What we learned

Clear product boundaries improve the demonstration: fictional data, explicit demo labels, test payments only, reviewable suggestions, and human decisions for both work acceptance and payment approval.

## What’s next

Potential future work includes authenticated collaboration, shared durable storage, stronger clause review, versioned change requests, accessible hosted demonstrations, and additional provider-error testing. These are not implemented claims.

## Submission checklist — complete before posting

- Submit through [PayPal AI Hackathon on Devpost](https://paypalaihackathon.devpost.com/), using **My projects / Enter a submission** after signing in and joining the event.
- Add the actual public YouTube demo URL (under three minutes) and public repository link. Include English content or an English translation.
- Include the repository's MIT license and complete README setup instructions. Public hosting is optional under the official rules.
- Record whether live Gemini inference was used or the labeled offline mode was shown.
- Two Sandbox captures ($90 and $120) and live Gemini agreement, risk and mediation requests have been verified locally; see [TESTING.md](TESTING.md). Check the corresponding Sandbox Business account activity before submission. Never publish provider keys or buyer passwords.
- Replace any incomplete integration claim with the observed result.
- Check the current hackathon eligibility and submission rules directly.

No user counts, performance claims, legal guarantees, or customer feedback are asserted. The project is a hackathon prototype, not an escrow, legal, or production financial platform.
