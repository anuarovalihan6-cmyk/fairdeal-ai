# FairDeal AI

**Clear terms. Better work.** A local hackathon MVP for freelance agreements, scope clarity, milestone tracking, PayPal Sandbox payments, and agreement-grounded dispute assistance.

All profiles and default projects are fictional. This is drafting and discussion assistance, not legal advice, an escrow product, a signed-contract platform, or a production financial service. AI never approves work or transfers money.

For simple Russian instructions, start with [START-HERE-RU.md](START-HERE-RU.md).

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). The local verification included live Gemini agreement creation, risk scanning and mediation, plus two independently verified PayPal Sandbox captures totaling $210 in test funds. See the [verification record](docs/TESTING.md) for evidence and limitations. The submitted source does not include the author's local data or credentials; a new installation starts with a fictional example and labeled demo mode.

Recording and submission preparation: [2:45 demo script](docs/DEMO-SCRIPT.md), [English project description](docs/DEVPOST.md), and [Russian submission guide](docs/SUBMISSION-RU.md).

## English / Русский

Use **EN / RU** in the upper-right corner. The interface language is remembered in this browser, including after reload. The coffee-shop sample, local risk explanations, and mediation templates support both languages. A new agreement uses the currently selected language. Known demo agreement text, milestone descriptions, example statements, and analysis are presented in the selected language in both directions, including projects saved before switching. Original stored text and exported JSON remain unchanged. Unknown custom user text stays as entered; this offline dictionary is not a general translation service. Switching language never changes project amounts, dates, acceptance records, or payment status.

The UI uses a local React presentation dictionary and a client-side language preference; no translation service or extra API call is used. Russian and English clarity rules share the same budget and quotation validation.

## Run locally on Windows

Requirements: Node.js **24+** with npm. SQLite is included through Node’s `node:sqlite`; no separate database installation is needed.

Double-click **START.cmd**, wait for `Ready`, and open **http://localhost:3000**. Keep its terminal open. Stop with `Ctrl+C`. Alternatively:

```powershell
npm.cmd ci
npm.cmd run dev
```

The server binds to `127.0.0.1`. Keep port 3000 available. With no credentials, the entire agreement → scan → milestone → evidence → mediation flow works in a clearly labeled offline demo. Payments remain disabled until configured; there are no fake successful payment records.

## Configure credentials privately

Double-click **SETUP.cmd** to run the included `Configure.ps1` in a private interactive terminal. Credentials are masked and written to ignored `.env.local`. Enter preserves existing values. The script sends no credentials over the network. Restart the application after changes.

Developers may instead copy `.env.example` to `.env.local` and edit locally. Do not paste secrets in chat. No key has a `NEXT_PUBLIC_` prefix and the state API exposes only readiness booleans.

### PayPal Sandbox

1. Open [PayPal Developer Sandbox apps](https://developer.paypal.com/dashboard/applications/sandbox).
2. Select your REST app for the Sandbox Business receiver account. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` locally.
3. Keep `APP_URL=http://localhost:3000`. The return and cancellation URLs are generated from this fixed local setting.
4. Start the app; choose a milestone in **Payments**. The server creates an Orders v2 order with the stored USD amount and a persisted request ID.
5. The browser follows PayPal’s returned Sandbox approval link. Log in with a different Sandbox Personal buyer account, then approve.
6. Return to the app and explicitly click **Confirm Sandbox payment**. The server retrieves the order, checks its project reference and amount, captures only an approved order, retrieves it again, and records a completed capture only when independently confirmed.
7. Compare both the Order ID and Capture ID against the Sandbox Business account activity.

Only `https://api-m.sandbox.paypal.com` is supported. The browser approval host must be `www.sandbox.paypal.com`. There is no live-money switch. Creating a Sandbox order locks agreement edits so stored terms and amounts remain consistent.

The implementation follows the official [Orders API flow](https://developer.paypal.com/api/rest/integration/orders-api/) and [standard integration example](https://developer.paypal.com/checkout/put-it-all-together/). No platform partner account, escrow, automatic release, card storage, or third-party payouts are implemented. The configured Sandbox Business account is the sole test recipient.

### Optional Gemini free tier

The default requires no AI account or paid API. For live inference, obtain a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys) for a project with **no billing account attached**. Verify Free Tier yourself before setting:

```dotenv
GEMINI_API_KEY=your-private-key
GEMINI_FREE_TIER_CONFIRMED=true
```

Restart and select **Live AI** in the workspace. The server calls `gemini-3.5-flash-lite`, using structured JSON Schema output, minimal thinking, a 45-second timeout, and Zod validation. Requests are limited locally to 6/minute and 40/day. There is no automatic retry, model upgrade, billing setup, grounding, or paid fallback. Account pricing is not discoverable from an API key; the configuration flag records confirmation of the selected project's Free Tier status, not automated billing verification. If billing status is uncertain, keep live AI disabled. This model replaced the older 2.5 Flash endpoint after a real account request returned HTTP 404.

The free tier has availability and rate limits, which can change. See Google’s [pricing](https://ai.google.dev/gemini-api/docs/pricing) and [billing guide](https://ai.google.dev/gemini-api/docs/billing). Free-tier data handling is governed by Google’s terms; use fictional project information only.

Missing keys, quota errors, invalid JSON, invalid totals, mismatched clause quotations, and timeouts fall back to labeled local output. The UI distinguishes **Demo template**, **Demo analysis · local rules**, **Demo analysis · agreement template**, and **Live AI**. A successful sample is never described as live inference.

New agreement requests provide the current date to Gemini and reject suggested milestone dates in the past. Historical saved projects retain their original dates.

## Product flow

- **Overview:** active deal, exact project budget, milestone progress, flagged terms, verified test-payment total, and guided demo.
- **Agreement:** create from a brief; review/edit scope, deliverables, exclusions, revisions, ownership, acceptance, payment conditions, questions, dates, and milestone allocations. Export a JSON record.
- **Risk scanner:** severity, agreement section, explanation, and suggested wording. A suggestion opens the editor for review; it is never applied silently. Saving edits invalidates earlier risk/mediation reports and work acceptance records.
- **Milestones:** ordered deadlines, integer-cent amounts, acceptance checklist, text/URL evidence, and explicit local work acceptance. Evidence is unverified; links are not fetched. Recording acceptance does not pay anyone.
- **Payments:** create/approve/capture/verify real Sandbox orders; persisted order and capture references; verified history; cancellation and failure recovery. No artificial payment-success mode exists.
- **Deal mediator:** compare both statements with the saved agreement and unverified evidence, list established agreement facts versus missing evidence, quote actual clauses, and suggest a nonbinding next step. Live reference quotes are validated against the saved text.

Demo templates intentionally leave revision limits, ownership, and the review window unclear to demonstrate the scanner. For non-website projects the sample is explicitly a generic starting template. Demo checks are limited heuristics and may miss or misclassify terms.

## Architecture

Next.js App Router + React + TypeScript, custom responsive CSS and Lucide icons. Server Route Handler dispatches small local APIs. SQLite stores typed deal JSON, evidence, reviews, reports, payment records, and daily AI quota. Credentials stay in the server environment.

```text
app/                         App entry, styles, local API
components/workspace.tsx      Dashboard, forms, guided demo
lib/schema.ts                Zod schemas, exact-budget validation
lib/db.ts                    SQLite and persistence
lib/ai.ts                    Gemini and labeled fallback adapters
lib/demo.ts                  Offline templates and local checks
lib/paypal.ts                Sandbox Orders v2 adapter and verification
tests/                       Domain and mocked-transport payment tests
tests/integration/           HTTP workflow and input-security tests
docs/                        Demo, Devpost, testing and deployment notes
```

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# With the local app running on port 3000:
npm.cmd run test:integration
```

Domain tests and mocked PayPal transport tests do not spend money or call PayPal. HTTP tests create fictional projects in the currently running local database. See [docs/TESTING.md](docs/TESTING.md) for the actual verification record, manual Sandbox checklist, and live-AI checklist. Production build: `npm.cmd run build`, then `npm.cmd start`.

## Payment integrity and recovery

Amounts come exclusively from the stored milestone. Client input cannot set payment status or capture amount. A database unique index reserves one nonfailed order per milestone. Persisted create/capture request IDs provide idempotency across retries and server restarts. An in-process lock serializes milestone operations, while the database reservation and PayPal idempotency keys cover repeated requests. Confirmed captures require matching local order ID, `custom_id`, currency, exact decimal amount, and a completed capture status.

If a network response is lost after capture, the record stays unresolved and **Verify** retrieves the same order. No new successful payment is invented. If creation is unresolved for over 5 hours without an order ID, automatic retry is blocked for manual Sandbox review because idempotency retention is finite.

Cancelling checkout is a local event, not a PayPal void/refund. The app checks remote status and reuses that same payable order if checkout resumes; it does not create another payable order for the same milestone. A cancelled checkout still locks agreement edits. A completed capture is not undone by cancellation. Declined or voided orders may be retried with a new order after failure is confirmed. Refunds are outside this MVP.

## Privacy, deployment and limitations

This is a **single-computer, single-user prototype** with no public authentication, role enforcement, signatures, email, webhooks, uploads, refunds, appeals, multicurrency, or production payouts. Jamie and Alex are demo roles in one workspace. Both agreement and review actions are local records, not legally executed approvals. Concurrent editing is not a collaborative editing system.

All API requests require a loopback host; mutations require a custom header and same-local-origin checks. Keep the loopback bind. The app must not be put behind a public reverse proxy or exposed to the LAN. There is no public deployment performed or required. For a zero-budget hackathon, demonstrate from the local machine or screen recording. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for what would need to change before hosting.

The SQLite file is `data/fairdeal.sqlite`; make offline backups of the whole `data` directory when the server is stopped. `.env.local`, `data/`, `.next/`, and `node_modules/` are ignored by Git. Never share those folders in a source archive. Demo AI is deterministic, live AI is optional and nondeterministic. Provider access, OAuth, and real Sandbox approval must be manually verified with the user’s account; mocked tests cannot certify them. The CSS uses Google Fonts with installed system-font fallbacks; the product remains usable without those fonts.

No hosting, database, subscription, paid AI, purchase, or real PayPal payment is required. This repository does not enable billing or publish itself.

## License

The project source is available under the [MIT License](LICENSE). Third-party dependencies retain their own licenses.
