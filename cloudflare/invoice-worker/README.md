# Invoice host (Cloudflare Worker)

Telegram's `downloadFile` only takes an https URL, and the app builds the invoice PDF in the browser.
This Worker keeps an uploaded PDF for one hour so Telegram can download it.

- `POST /invoice` with the PDF bytes (Origin must be `https://middleware-khmer-dev.github.io`) returns `{ url, expiresIn }`.
- `GET /invoice/<32 hex>.pdf` returns the PDF as an attachment. KV deletes it after 1 hour.

Safeguards: only the app's origin may upload, the body must start with `%PDF-`, max 1.5 MB, 20 uploads per minute per IP,
128-bit random ids (not guessable, no listing). Anyone who has the link can download that one invoice until it expires,
and it contains the customer's name and address, so treat the link like a secret.

Live: `https://mini-shop-invoices.infra-deploy-domain.workers.dev` (account: the one linked to the Cloudflare connector).
The app reads it from `EXPO_PUBLIC_INVOICE_API` (set in `.github/workflows/pages.yml`); leave it empty to disable.

Deploy / update: `cd cloudflare/invoice-worker && npx wrangler deploy`. If you change the Pages address, edit `ALLOWED_ORIGINS` in `src/index.js`.
To remove it: delete the Worker `mini-shop-invoices` and the KV namespace `mini-shop-invoices` in the Cloudflare dashboard.
