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
Products load from `EXPO_PUBLIC_PRODUCTS_URL`; the deployed site uses our own API (`cloudflare/api-worker`, with an admin page at `/admin` to manage products and pictures), and without the variable the app falls back to `https://fakestoreapi.com/products`.
Fields used: `id, title, price, description, category, image, rating{rate,count}`. Categories are derived from the data.
If the request fails, a few sample products are shown with a retry banner.

**Several pictures per product:** if a product in the API has an `images` array (full `https://` URLs, e.g. the pictures an admin uploaded), the product page shows a gallery: swipe through them, a counter, and thumbnails to jump to one. `image` stays the main picture used on cards, and a product with one picture looks as before. fakestoreapi.com has only one picture per product; with our own API, pictures added in the admin page show here.

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

## Map (delivery address)
Checkout has a real OpenStreetMap map (Leaflet, web build only; no API key). "Pick on map" opens it with a fixed pin: drag the map, search a place (Nominatim, Cambodia only) or tap the location button. The street address is looked up after the map stops moving and fills the address box, which can also be typed. The address and pin are saved on the order (`location`) and remembered for next time (`mini_shop_address`). Tiles and address lookup come from OpenStreetMap's free public servers, which are meant for light use; for heavy traffic use a paid tile/geocoding provider.

### Several addresses
Account → Delivery addresses (`/address`) is an address book: add as many as needed (Home / Work / Other, typed or picked on the map), edit, delete (tap twice), and tap one to use it at checkout. Checkout lists them to choose from and links to the address book; paying needs an address. Stored in `mini_shop_addresses`; the single address from the earlier version is carried over automatically.

## Reviews
On a product page, the Reviews tab lets a signed-in customer rate (1-5 stars) and comment; one review per customer per product, which they can edit or delete. Guests see a sign-in button. The product's rating and review count (also on the cards) combine the catalog's numbers with the reviews written here. Reviews are stored on the device (`mini_shop_reviews`), so other customers' devices do not see them until a backend is added.

## Orders
Pay now sends the order to our API (`EXPO_PUBLIC_ORDERS_API`, the same Worker as the products): the server prices it from its own product list, gives it the number and stores it. The customer's name and phone come from the signed-in account, the address from the address book, plus the note. The success page shows the live status (waiting for confirmation / confirmed / on the way / delivered / cancelled; tap it to refresh), which an admin sets in the admin page. If the server cannot be reached nothing is placed and an error is shown. Without `EXPO_PUBLIC_ORDERS_API` (local development) orders stay on the device only. Payment itself (KHQR / card) is still not collected.

### Tracking an order
Account → My orders (`/orders`) lists every order placed on this device with its latest status (looked up from the server when the page opens, or with Refresh status). Tapping an order opens its invoice page, which shows a progress tracker (placed → confirmed → on the way → delivered, or cancelled) and re-checks the server every 30 seconds while the order is still open. Orders are kept per device, so the list is empty on a new phone or after clearing app data; an account-based history needs real customer accounts.
