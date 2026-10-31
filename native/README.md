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
- `src/app/index.tsx` login/register, `src/app/(shop)/*` home, catalog, product/[id], cart, checkout, success, profile (all behind login)
- `src/components/PillNav.tsx` round icon-only nav (phone), top bar (wide web); hides on scroll down, returns on scroll up
- `src/components/Glass.tsx` glassmorphism surfaces (expo-blur) and backdrop

## Products API
Products load from `https://fakestoreapi.com/products` (override with `EXPO_PUBLIC_PRODUCTS_URL`).
Fields used: `id, title, price, description, category, image, rating{rate,count}`. Categories are derived from the data.
If the request fails, a few sample products are shown with a retry banner.
