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
