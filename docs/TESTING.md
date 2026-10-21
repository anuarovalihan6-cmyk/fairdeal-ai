# Verification record

Executed on Windows with Node.js 24.17.0 and npm 11.13.0 on **October 21, 2026**. Initial workflow checks used demo mode without provider credentials. PayPal Sandbox credentials were subsequently configured locally at the owner's request; the connection check is recorded below.

## Automated checks actually executed

- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — **21 tests passed**. These cover exact integer-cent budget allocation, dates and unique milestone IDs, invalid agreement rejection, rejecting AI milestones in the past with current-date context, risk discovery and reviewed wording, agreement-grounded mediator quotations, missing AI configuration, blocking provider requests without Free Tier confirmation, structured AI output validation, invalid AI references/JSON, quota and timeout fallbacks, Sandbox-only API destinations, concurrent duplicate-order protection, approval and capture, repeated capture, cancellation, uncertain creation, recovery from a lost capture response, foreign-order rejection, and amount mismatch rejection.
- `npm.cmd run test:integration` — **2 HTTP workflow tests passed** against the running local server. It checks page startup; state persistence; actual agreement creation/editing; scan/rescan; invalid budget rejection; foreign-origin and missing-header rejection; localhost/127.0.0.1 compatibility; stale-report invalidation; work evidence and acceptance; mediation; and disabled unconfigured payments without invented transaction records.
- `npm.cmd run build` — production build passed. Next.js compiled the UI, typechecked it, and generated the app routes.
- `npm.cmd audit --omit=dev --audit-level=high` — reported **0 known vulnerabilities** at the time of the check. This is not a security certification.
- `Configure.ps1` — PowerShell parser check; no secrets were entered during testing.

PayPal and Gemini tests substitute local mocked HTTP responses. They **do not** prove access to the real provider APIs. They make no real provider requests or financial transactions.

## EN / RU update

The language test coverage includes four additional language checks: Russian agreement validation and exact budget allocation, the same three clarity flags in Russian and their removal after reviewed wording, Russian mediation with exact saved quotations, and interface/date/dynamic-label translation. Both HTTP tests also passed against an isolated local production server on port 3001 with a separate QA database; the visible user demo was not used for those automated writes.

The coffee-shop scenario was then executed through the visible browser in Russian: new $300 agreement, three risk flags, a reviewed two-round revision policy, rescan to two remaining flags, $90/$120/$90 milestones, one explicitly fictional work description and acceptance, and a mediation analysis citing the online-payments exclusion. No test payment was created. Both EN and RU switches were exercised, English preference survived reload, and stored original quotations stayed identical. Russian pages were checked at a 390px viewport and English pages at 1280px; the document widths showed no horizontal page overflow. Browser error logs were empty after the walkthrough.

## Mixed-language regression fix

The saved Russian coffee-shop demo now presents its known sample content in both languages: project navigation, agreement and editor fields, milestones, risk findings, submission descriptions, and mediation statements/results. Display translations preserve the stored originals and JSON export; unknown custom text stays unchanged. An explanatory caption identifies translated quotation views.

Four additional regression tests passed (19 tests total), covering bidirectional sample presentation, exact preservation on an unchanged editor save, actual user edits, and untouched custom text/transaction references. The production build passed. Browser checks found no Cyrillic in the English main content on all six pages, and no English sample fragments on the corresponding Russian screens. Both mediator fields changed language correctly. Opening the English editor for the Russian project and saving without edits preserved the complete API deal/payment snapshot byte for byte, including analyses and work acceptance. The expanded saved submission also appeared in English. English preference survived reload, browser error logs were empty, and screenshots were saved as `previews/languages-fixed-en.png` and `previews/languages-fixed-ru.png` in the parent outputs folder.

## Browser checks actually executed

In the local in-app Chromium browser:

1. Loaded the dashboard successfully.
2. Created the coffee-shop agreement using the visible form.
3. Ran the risk scanner and saw the three intentional gaps.
4. Opened a suggested revision clause, reviewed/saved it, and rescanned; the finding count decreased from three to two.
5. Submitted fictional work evidence, recorded work acceptance, and confirmed that no payment was triggered.
6. Analyzed the sample online-payments disagreement; saw the saved scope/exclusion quotes, missing evidence, and a nonbinding change-request recommendation.
7. Checked the unconfigured Payments screen, disabled Pay actions, zero transaction history, and explicit Sandbox labeling.
8. Opened setup instructions and closed the dialog with Escape.
9. Exported the agreement to JSON using the UI.
10. Checked overview, agreement, risk scanner, milestones, and payments at a 390px viewport (375px content area with browser scrollbar). Those pages had equal document/content widths, with no horizontal page overflow. Checked the mobile drawer and stacked layouts. Also inspected the desktop layout.

During browser QA, a real localhost-origin mismatch was found and fixed; the HTTP regression test now covers both loopback aliases. A local risk-check bug that matched “one” inside “milestone” was also fixed and covered by the domain test.

Screenshots in the parent outputs folder show the local app. Browser checks are a focused hackathon smoke test, not a full cross-browser or assistive-technology audit.

## PayPal Sandbox connection check

With the owner's locally configured Sandbox application, the official Sandbox OAuth endpoint returned HTTP 200 and an access token. The token and credential values were not printed. After restarting the app, the state endpoint reported PayPal configured and Sandbox-only mode; neither credential appeared in its response. The Russian Payments page showed enabled payment buttons and zero payment records. This verifies authentication and local configuration only: no order, buyer approval, capture, or transaction verification was performed during this initial connection check. Gemini had not yet been configured at that stage.

The owner subsequently used the Sandbox checkout for two milestone orders ($90 and $120). Server-side verification retrieved both real Sandbox orders, validated their stored references and exact amounts, and returned `APPROVED` with no capture ID. The interface was refreshed to show these actual approved statuses. Approval is not a completed capture; no completed payment is claimed by this check.

After the owner explicitly selected completion of both stages ($210 total), both captures were performed through the app's Russian payment-history actions. PayPal returned `COMPLETED` with capture references for each order:

| Amount | Order ID | Capture ID | Server-verified result |
| --- | --- | --- | --- |
| USD 90.00 | `0FK926768B434154G` | `12713985VY678153B` | `COMPLETED` |
| USD 120.00 | `981563579V0506148` | `6KG39120G0039390G` | `COMPLETED` |

A second server-side verification of both orders preserved the same capture references and the same two local payment records. The confirmed Sandbox total was exactly 21,000 cents. No real-money endpoint was used. An untranslated payment-result notification discovered during this check was added to the Russian dictionary. Sandbox Business dashboard activity has not been independently inspected.

## Live Gemini verification

The selected key's project was observed in Google AI Studio with `Free tier` and `Set up billing`. Its key was configured only in ignored `.env.local`; no billing account, card, credits, subscription, or paid model fallback was enabled. This is a UI observation of project status, not automated billing certification. The official model-list request returned HTTP 200. A real request to the previous `gemini-2.5-flash` endpoint returned HTTP 404 and correctly produced a labeled sample fallback.

The adapter was migrated to stable `gemini-3.5-flash-lite`, which Google's pricing page lists with free input/output for the Free Tier. A minimal generation request returned HTTP 200. The app then completed this real HTTP workflow using fictional Russian data:

1. Generated a new agreement for the four-page A4 menu and mobile PDF of fictional Maple Cup coffee shop, rather than the website sample. The source was `live`; its USD 240 budget, November 4, 2026 deadline, and exact milestone sum passed validation.
2. Introduced three deliberate gaps through the agreement editor API: unlimited revisions, unspecified ownership, and no measurable acceptance/review period. A live risk scan returned three findings.
3. Analyzed fictional disagreement about adding a website, online orders, and payments to the menu-design scope. The result was `live`, with two references verified as exact substrings of the saved agreement.
4. Compared all existing payment records against the pre-check snapshot: both confirmed Sandbox captures were unchanged.
5. Checked the state response and every public JavaScript bundle for configured credential values: none were present.

Review also found a suggested milestone date in the past. New agreement requests now explicitly include the current date, and past milestone dates are rejected before saving any live result. The fictional example's first milestone was reviewed to October 23, 2026. Existing historical projects are not rewritten by this creation-only guard.

After that review, both analyses were rerun on the same fictional project: three live risk findings and three exact agreement references in live mediation. The existing payment snapshot was still unchanged. The Russian browser UI displayed the live model badges and saved reports with no browser error logs. Screenshots were saved in the parent outputs folder as `previews/gemini-live-risk.png` and `previews/gemini-live-mediation.png`.

The adapter now uses minimal thinking, a 45-second timeout, and the same structured-output, exact-amount, quotation, local-quota, and labeled-fallback protections. The updated production build and all 21 automated tests passed. No automatic retry, model upgrade, or grounding tool is configured.

## Not yet verified with the owner’s accounts

- Comparison of the verified order/capture references with the Sandbox Business account's activity; live-provider cancellation, decline, and lost-response scenarios (these recovery cases have mocked-transport coverage only).
- Continued Gemini quota/availability, a billing audit beyond the observed Free Tier status, and model quality outside this focused fictional workflow. Future provider behavior is not guaranteed.
- Public deployment, collaborative access, role-based authorization, webhooks, refunds, and real-money payments. These are outside the delivered local MVP.

## Manual PayPal checklist when configured

1. Configure the Sandbox app locally, restart, and verify “Sandbox configured.”
2. Use a new fictional deal. Create one milestone order, approve with a different Sandbox Personal account, and return.
3. Explicitly confirm the capture. Require “Sandbox verified” with both Order ID and Capture ID.
4. Compare the exact USD amount and IDs with Sandbox Business activity.
5. Verify again and confirm no additional capture occurs.
6. On a separate milestone, cancel approval. Confirm no completed capture and resume the same order.
7. Test a declined Sandbox instrument/account scenario if supported for the configured account. Show the actual failure; never mark it paid.
8. Test a temporary connection interruption. Recover through Verify and compare provider activity before retrying.

## Manual live-AI checklist when configured

1. Verify in Google AI Studio that the selected project has Free Tier and no billing account. The app cannot determine this from the key.
2. Set the key privately and confirm the free-tier flag. Restart and choose Live AI.
3. Create a fictional agreement; verify its Live AI badge, exact budget, dates, and assumptions.
4. Scan and review clause-specific findings. Check that edits invalidate stale reports.
5. Submit conflicting fictional statements; verify cited quotes against the saved agreement and distinguish claims from evidence.
6. Disable the key and confirm the labeled demo fallback remains usable.
