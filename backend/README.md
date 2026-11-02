# Mini Shop backend (Python / FastAPI)

The shop's API and admin page. It replaces the old Cloudflare Workers (`api-worker` and `invoice-worker`) and keeps the **same URLs and JSON**, so the React Native app (`../native`) works unchanged: only the addresses in `EXPO_PUBLIC_*` need to point at this server.

| URL | Who | What |
| --- | --- | --- |
| `GET /products` | everyone | the products, same shape as fakestoreapi.com plus an `images` list |
| `GET /img/<id>` | everyone | a picture an admin uploaded |
| `POST /orders/quote` | the shop app | may this pin pay cash? delivery fees (distance rule) |
| `POST /orders` | the shop app | place an order (only from the shop's own website); returns the order number and a secret token |
| `GET /orders/<id>` | the customer's device | the order's status; needs the token from `POST /orders` |
| `POST /orders/<id>/qr` | the customer's device | a new QR for an unpaid QR / deposit order whose code expired (same order, same amount); needs the token |
| `POST /invoice`, `GET /invoice/<id>.pdf` | the shop app | temporary invoice PDFs so Telegram can download them (deleted after 1 hour) |
| `/admin` | admin | the admin page (password): products, pictures, orders, settings |

The business rules (the server prices every order itself, cash only within the radius, delivery fee by distance, 50 % deposit, order statuses) are unchanged; they live in `app/logic.py`. Keep `DEPOSIT_PERCENT` there in step with `native/src/data/shop.ts`.

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=choose-a-password uvicorn app.main:create_app --factory --port 8000
```

Open <http://localhost:8000/admin>, sign in (it looks like the shop app: sidebar on desktop, bottom tabs on phones, and it opens fullscreen when launched as a Telegram Mini App), and add products (**Import sample products** copies the 20 from fakestoreapi.com). For the app, set `EXPO_PUBLIC_PRODUCTS_URL=http://localhost:8000/products` and `EXPO_PUBLIC_ORDERS_API=http://localhost:8000` (orders are only accepted from `ALLOWED_ORIGINS`, see below).

With Docker: `docker build -t mini-shop-api backend && docker run -p 8000:8000 -e ADMIN_PASSWORD=... -v mini-shop-data:/data mini-shop-api`.

### On a server (https, one command)
You need a machine with Docker and a domain name pointing at it (an `A` record), with port 443 open (port 80 is not needed, so it may belong to another service on the same machine; use the `https://` address).

```bash
cd backend
cp .env.example .env      # set DOMAIN and ADMIN_PASSWORD
docker compose up -d --build
```

Caddy gets the https certificate by itself; the data lives in the `shop-data` volume (back it up). Check `https://<DOMAIN>/products`, then open `https://<DOMAIN>/admin`.

Finally point the app at it: in the GitHub repository go to *Settings > Secrets and variables > Actions > Variables*, add `BACKEND_URL = https://<DOMAIN>` and re-run the *Deploy web build* workflow. Until `BACKEND_URL` is set the app still talks to the old Cloudflare Worker, which has no dynamic KHQR.

## Settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `ADMIN_PASSWORD` | *(empty = admin locked)* | the admin password |
| `DATA_DIR` | `data` (`/data` in Docker) | where the database, pictures and invoices are kept: **back this folder up** |
| `ALLOWED_ORIGINS` | `https://middleware-khmer-dev.github.io` | comma-separated websites that may place orders and upload invoices (add `http://localhost:8081` for local web development) |
| `PUBLIC_URL` | taken from each request | the server's public https address, used in picture and invoice links; set it when behind a proxy |
| `ADMIN_RATE` / `ORDER_RATE` / `INVOICE_RATE` | `60` / `10` / `20` | requests per minute per IP for the admin API, placing orders and invoice uploads |
| `TRUST_PROXY` | off | set to `1` behind a reverse proxy so rate limits use the real client IP (`X-Forwarded-For`) |

Serve it over **https** (the app is on https, so browsers block a plain-http API), e.g. behind Caddy / nginx / a platform that terminates TLS, and run a single process: rate limits are kept in memory.

## Dynamic KHQR (optional)
Set these and every QR / deposit order gets its own KHQR with the exact amount (the deposit amount for deposit orders) that expires after `KHQR_MINUTES`; without them the fixed QR picture from the admin settings is used as before.

| Variable | Example | |
|---|---|---|
| `KHQR_ID` | `khqr@aclb` | Bakong account id (required) |
| `KHQR_NAME` | `Im Sovanny` | shop name on the code, max 25 chars (required) |
| `KHQR_ACCOUNT` | bank account number | needed by some banks, e.g. ACLEDA (USD account) |
| `KHQR_BANK` | `ACLEDA` | bank name |
| `KHQR_CITY` | `PHNOM PENH` | max 15 chars |
| `KHQR_MINUTES` | `10` | how long a code is valid |
| `KHQR_MOBILE` | `0969014971` | shop phone inside the code (tag 62), as in the bank's own QR |
| `KHQR_BANK_TAG` | `2CCY\|4` | the bank's own tag 39 parts (ACLEDA), copied from the bank's QR |

**If the bank app says the code does not work (ACLEDA error 0237):** scan the shop's own static QR from the bank with a plain QR reader, read tag `29` (the id after `khqr@aclb` is `KHQR_ACCOUNT`; ACLEDA uses the phone-based number there, not the long account number), tag `39` (`KHQR_BANK_TAG`) and the phone in tag `62` (`KHQR_MOBILE`), set them in `.env` and run `docker compose up -d`.

Amounts are in USD. The code only collects the money; marking an order paid is still done by the admin.

## Automatic payment check with Bakong (optional)
With a Bakong token, the server asks the National Bank of Cambodia every 10 seconds whether each unpaid QR / deposit order was paid with its own code (until the code has expired, plus 10 minutes). When it was, the order is marked paid (the deposit for deposit orders), the customer's page turns into "Payment received!" with the invoice, and the owner gets a Telegram message. Marking an order paid in `/admin` still works.

| Variable | Default | |
|---|---|---|
| `BAKONG_TOKEN` | *(empty = off)* | the Bakong Open API token (see below) |
| `BAKONG_API` | `https://api-bakong.nbc.gov.kh` | the API address |
| `BAKONG_PROXY` | *(none)* | optional https proxy, for a server outside Cambodia if the API refuses it |

Get a token: register for the Bakong Open API at the National Bank of Cambodia (Bakong website, "Open API / Developer") and copy the token it gives you (it expires after a while, so check it with the command below now and then). Check that the token works and that this server may reach the API:

```bash
docker compose exec api python -c "from app.config import Config; from app import bakong; print(bakong.ping(Config.from_env()))"
```
`ok` means it works; `error` means a wrong or expired token, a blocked server (try `BAKONG_PROXY`), or no network (see `docker compose logs api`).

Run a single server process: the check runs inside it. Bakong only sees payments that go through its network; a transfer between two accounts of the same bank may not appear there, so test with a payment from another bank.

## Telegram message for every new order (optional)
The shop owner gets a Telegram message for each new order (customer, payment method, amount to check in the bank app, items, address, link to `/admin`). It is the quick way to know a QR order is waiting for you to confirm the payment.

1. In Telegram open `@BotFather`, send `/newbot`, and copy the token it gives you.
2. Open your new bot and press **Start** (a bot can only write to people who started it; for a group, add the bot to the group).
3. Find your chat id: open `https://api.telegram.org/bot<TOKEN>/getUpdates` after sending the bot a message, and read `message.chat.id` (a group id starts with `-`).
4. Put both in `.env`: `TELEGRAM_BOT_TOKEN=...` and `TELEGRAM_CHAT_ID=...`, then `docker compose up -d`.

A failed message never stops an order. The token is a secret: keep it only in `.env`.

## Storage
- `shop.db` (SQLite): products, settings and orders. Writes are serialized, so two admins saving at once no longer overwrite each other.
- `images/`: uploaded pictures under a random 128-bit id; a picture is deleted when no product uses it any more.
- `invoices/`: temporary invoice PDFs, deleted one hour after upload.

## Security
Unchanged from the Worker version: `/admin/api/*` needs `Authorization: Bearer <ADMIN_PASSWORD>` (constant-time compare, 60 requests/min per IP); uploads are JPEG/PNG/WebP/GIF checked by content, max 2 MB, 12 pictures per product; `POST /orders` accepts only the shop website's origin, 10 per minute per IP, 20 KB; invoices are PDF/PNG only, max 1.5 MB, 20 per minute per IP; the admin page has a strict Content-Security-Policy.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

## Moving from the Cloudflare Workers
The old data lived in Cloudflare KV / D1 / R2 and is not copied automatically. Re-enter the products (or use **Import sample products**), the settings and the QR picture in the admin page; old orders can be exported with `wrangler d1 export mini-shop-orders` if you need them.
