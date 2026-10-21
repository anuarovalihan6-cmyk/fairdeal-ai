# Deployment

The delivered app is intentionally local. Run `START.cmd` for development, or run `npm.cmd run build` followed by `npm.cmd start` for an optimized local demonstration. Both scripts bind to `127.0.0.1`. Use `http://localhost:3000` and keep `APP_URL` aligned.

No code has been published, no service has been deployed, and no paid resource is required. A local laptop demonstration or screen recording is the zero-budget deployment plan for this MVP.

## Why not a static upload?

The app has server-only secrets and durable SQLite state. A static host cannot execute its PayPal/Gemini adapters. Many free serverless platforms have ephemeral disks, so copying SQLite there would lose or split payment state. This app deliberately rejects non-loopback requests and nonlocal callback URLs. Simply changing a bind address or uploading the folder is not a supported deployment.

## If public hosting is later approved

Before choosing an actually available free tier, add authentication, per-project ownership and role checks, durable shared storage with database migrations, HTTPS callback configuration, CSRF/authenticated-session protection, durable rate limiting, and an operational recovery procedure. Retain Sandbox-only payments. Replace local-only guard logic deliberately after that design is reviewed. Use the host's secret manager and never upload `.env.local` or the demo SQLite database. Confirm no credit card, billing account, trial conversion, or automatic overage charges are required.

These are future changes, not features claimed by this prototype. Do not enable external hosting or a public tunnel without the owner’s approval.
