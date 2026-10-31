# Mini Shop API + admin (Cloudflare Worker)

The shop's products come from this Worker, and shop owners manage them in its admin page.

| URL | Who | What |
| --- | --- | --- |
| `GET /products` | everyone | the products, same shape as fakestoreapi.com plus an `images` list |
| `GET /img/<id>` | everyone | a picture from the R2 bucket |
| `/admin` | admin | the admin page (password) |

Live: `https://mini-shop-api.infra-deploy-domain.workers.dev` (admin at `/admin`).

## Admin page
Sign in with the admin password, then add / edit / delete products, and add pictures from your phone or computer (several at once; the first is the main picture, `<` `>` reorder them, `x` removes). Big photos are shrunk in the browser to at most 1200 px before upload. **Import sample products** copies the 20 products from fakestoreapi.com to start with.

## Storage
- Product list: one KV key `products` in namespace `mini-shop-data` (binding `DATA`). Fine for a small shop (limit 500 products here); two admins saving at the same moment could overwrite each other.
- Pictures: R2 bucket `mini-shop-images` (binding `IMAGES`), stored under a random 128-bit id. A picture is deleted when no product uses it any more.

## Security
- Every `/admin/api/*` call needs `Authorization: Bearer <ADMIN_PASSWORD>`; the password is a Worker secret, compared in constant time, and requests are limited to 60/min per IP.
- Uploads: JPEG/PNG/WebP/GIF only (checked by content, not just the header), max 2 MB each, up to 12 pictures per product. Picture links in a product must be `https://` or this Worker's own.
- The admin page has a strict Content-Security-Policy and puts server text in with `textContent`.
- `GET /products` and `/img/*` are public by design (allowed from any origin).

## Change the password
Cloudflare dashboard → Workers & Pages → `mini-shop-api` → Settings → Variables and Secrets → `ADMIN_PASSWORD` → edit. Or `npx wrangler secret put ADMIN_PASSWORD`.

## Deploy
`npx wrangler deploy` in this folder (the KV namespace, R2 bucket and rate-limit binding in `wrangler.toml` already exist).
