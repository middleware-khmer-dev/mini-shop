# Mini Shop – React Native + Tailwind (NativeWind)

Native port of the web mini shop in the repo root. Expo SDK 58, Expo Router, NativeWind 4 (Tailwind 3).

## Run
```bash
cd native
npm install --legacy-peer-deps
npx expo start            # scan the QR with Expo Go, or press a / i / w
npm run typecheck
npm run export:web        # static web build -> dist/
```

## Auth API
Set `EXPO_PUBLIC_API_BASE=https://your-api` (see `src/lib/auth.tsx`):
- `POST /auth/login` `{phone, password}` -> `{token, user:{name,phone}}`
- `POST /auth/register` `{fullname, phone, password}` -> `{token, user:{name,phone}}`

Without it, a demo (mock) login is used.

## Structure
- `src/app/index.tsx` opens on home; `src/app/login.tsx` login/register (`?redirect=` returns to the page you came from); `src/app/(shop)/*` home, catalog, product/[id], cart, checkout, success, profile. Browsing is open to guests; sign-in is required when paying
- `src/components/PillNav.tsx` round icon-only nav (phone), top bar (wide web); hides on scroll down, returns on scroll up
- `src/components/Glass.tsx` glassmorphism surfaces (expo-blur) and backdrop

## Products API
Products load from `https://fakestoreapi.com/products` (override with `EXPO_PUBLIC_PRODUCTS_URL`).
Fields used: `id, title, price, description, category, image, rating{rate,count}`. Categories are derived from the data.
If the request fails, a few sample products are shown with a retry banner.

## Language (Khmer / English)
`src/lib/i18n.tsx` holds both dictionaries; the choice is saved on the device. Switch it from the home header, the login screen or the Account tab. Add a string by adding the same key to both `km` and `en`. Product names and descriptions come from the products API and are not translated.

## Telegram integration
Inside the Telegram client (`src/lib/telegram.tsx`): the Back button shows on every page except home (the app has no back buttons of its own); the page title is a small glass label centered on the same row as Telegram's Back / Close buttons; taps give haptic feedback. The cart's "Checkout" and checkout's "Pay now" are in-app buttons. The bottom nav is hidden on product, cart, checkout and success pages. The cart is saved on the device and survives a refresh.

## Orders and invoice
Paying saves an order on the device (`src/lib/orders.tsx`; items are a snapshot). The order page is an invoice (`src/app/(shop)/success.tsx`) that can be downloaded as a PDF or an image (`src/lib/invoice.ts`). The invoice is drawn on a canvas, so Khmer text is rendered by the browser exactly as on screen, and the PDF is a one-page A4-width PDF holding that picture (text in it is not selectable). No server is involved.

Inside Telegram the in-app browser usually ignores files a page generates itself, and Telegram's own `downloadFile` needs an https URL on a server (there is none here). So there the invoice button first opens the system share sheet with the real PDF/PNG file (save to Files, send to a chat); if the client has no share sheet, a full-screen picture of the invoice is shown to press-and-hold to save (or screenshot). In a normal browser the file is downloaded directly. For a true one-tap save inside Telegram you need a small server that hosts the PDF at an https URL, then call `Telegram.WebApp.downloadFile`.

With `EXPO_PUBLIC_INVOICE_API` set (it is, in the Pages workflow), the PDF button inside Telegram 8.0+ uploads the PDF to the Cloudflare Worker in `../cloudflare/invoice-worker` and opens Telegram's own download dialog (`downloadFile`), so no browser is needed. If the Worker cannot be reached it falls back to the share sheet / picture above.

## Favorites
The heart on a product card or the product page toggles a favorite (saved in `mini_shop_favorites`, survives reopening the app). Account → Favorites lists them at `/favorites`.
