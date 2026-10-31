# Mini Shop API + admin (Cloudflare Worker)

The shop's products come from this Worker, and shop owners manage them in its admin page.

| URL | Who | What |
| --- | --- | --- |
| `GET /products` | everyone | the products, same shape as fakestoreapi.com plus an `images` list |
| `GET /img/<id>` | everyone | a picture from the R2 bucket |
| `POST /orders/quote` | the shop app | may this pin pay cash? (distance rule) |
| `POST /orders` | the shop app | place an order (only from the shop's own website); returns the order number and a secret token |
| `GET /orders/<id>` | the customer's device | the order's status, needs the token from `POST /orders` |
| `/admin` | admin | the admin page (password): products, pictures and orders |

Live: `https://mini-shop-api.infra-deploy-domain.workers.dev` (admin at `/admin`).

## Admin page
Sign in with the admin password, then add / edit / delete products, and add pictures from your phone or computer (several at once; the first is the main picture, `<` `>` reorder them, `x` removes). Big photos are shrunk in the browser to at most 1200 px before upload. **Import sample products** copies the 20 products from fakestoreapi.com to start with.

## Orders
The app sends what is in the cart (product ids and quantities), the address, phone, name, note, shipping and payment choice. **The Worker prices the order itself** from its own product list and the shipping table in `src/orders.js` (keep it in step with `SHIPPING_OPTIONS` in the app), so a customer cannot change what they pay. Orders start as `pending`; in the admin page's Orders tab an admin opens an order (customer, phone, address with a map link, note, items) and sets the status: pending, confirmed, shipped, delivered or cancelled. The customer sees the status on the order page in the app.

### Payment rules
- Two payment methods: **cash on delivery** and **QR**. Card is gone.
- Cash only if the order has a map pin within the cash radius (default 25 km, a circle around the shop in every direction). Farther away, or with no pin, the customer must pay by QR. The server checks this when the order is placed (`cash_not_allowed`), and `POST /orders/quote` lets the app grey out cash in advance without revealing the shop's location.
- In the admin page, **Settings**: the shop's latitude and longitude, the radius, and a picture of the bank's KHQR. The customer sees that picture, with the amount, on the order page after choosing QR. **Until the shop location is set it defaults to the middle of Phnom Penh.**
- Payment is not collected automatically: the admin sees the order, checks that the money arrived and sets the status.

## Storage
- Product list: one KV key `products` in namespace `mini-shop-data` (binding `DATA`). Fine for a small shop (limit 500 products here); two admins saving at the same moment could overwrite each other.
- Orders: D1 database `mini-shop-orders` (binding `DB`, schema in `schema.sql`). Order lookups need the order's secret token, because order numbers have only 6 digits.
- Pictures: R2 bucket `mini-shop-images` (binding `IMAGES`), stored under a random 128-bit id. A picture is deleted when no product uses it any more.

## Security
- Every `/admin/api/*` call needs `Authorization: Bearer <ADMIN_PASSWORD>`; the password is a Worker secret, compared in constant time, and requests are limited to 60/min per IP.
- Uploads: JPEG/PNG/WebP/GIF only (checked by content, not just the header), max 2 MB each, up to 12 pictures per product. Picture links in a product must be `https://` or this Worker's own.
- `POST /orders` only accepts the shop website's origin, is limited to 10 per minute per IP and 20 KB, and checks every field. Customer names, phones and addresses are visible to anyone with the admin password.
- The admin page has a strict Content-Security-Policy and puts server text in with `textContent`.
- `GET /products` and `/img/*` are public by design (allowed from any origin).

## Change the password
Cloudflare dashboard → Workers & Pages → `mini-shop-api` → Settings → Variables and Secrets → `ADMIN_PASSWORD` → edit. Or `npx wrangler secret put ADMIN_PASSWORD`.

## Deploy
`npx wrangler deploy` in this folder (the KV namespace, R2 bucket and rate-limit binding in `wrangler.toml` already exist).
