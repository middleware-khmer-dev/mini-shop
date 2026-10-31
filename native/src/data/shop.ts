export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice: number | null;
  rating: number;
  sold: string;
  media: number;
  badge: string | null;
  image?: string;
  /** every picture the admin added (the first one is `image`); more than one shows a gallery */
  images?: string[];
  category?: string;
  description?: string;
};

/** Shape returned by https://fakestoreapi.com/products */
export type ApiProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  /** optional extra pictures, e.g. added by an admin; the first is used as the main one when `image` is missing */
  images?: string[];
  rating?: { rate: number; count: number };
};

const isUrl = (u: unknown): u is string => typeof u === "string" && /^(https?:\/\/|\/)/.test(u.trim());

/** Main picture first, then the others, without duplicates or broken entries. */
const pictures = (a: ApiProduct): string[] => {
  const all = [a.image, ...(Array.isArray(a.images) ? a.images : [])].filter(isUrl).map((u) => u.trim());
  return Array.from(new Set(all));
};

export const fromApi = (a: ApiProduct): Product => ({
  id: a.id,
  name: a.title,
  price: a.price,
  oldPrice: null,
  rating: a.rating?.rate ?? 0,
  sold: String(a.rating?.count ?? 0),
  media: (a.id % 6) + 1,
  badge: null,
  image: pictures(a)[0] ?? a.image,
  images: pictures(a),
  category: a.category,
  description: a.description,
});

export const CATEGORY_ICONS: Record<string, string> = {
  "men's clothing": "shirt",
  "women's clothing": "sparkle",
  jewelery: "gift",
  electronics: "bolt",
};

/** Offline fallback shown only if the products API cannot be reached. */
export const fallbackProducts: Product[] = [
  { id: 1, name: "ស្រោមកាបូបស្បែកស្ត្រី ម៉ូតថ្មី", price: 18.5, oldPrice: 25, rating: 4.8, sold: "1.2k", media: 1, badge: "-26%" },
  { id: 2, name: "កាស Bluetooth ថាមពលបាទ ANC", price: 32, oldPrice: null, rating: 4.6, sold: "860", media: 2, badge: "ថ្មី" },
  { id: 3, name: "ក្រែមថែរក្សាស្បែកមុខ Vitamin C", price: 9.9, oldPrice: 13, rating: 4.7, sold: "2.3k", media: 3, badge: "-24%" },
  { id: 4, name: "កែវទឹកកាបូបធន់កំដៅ 600ml", price: 6.5, oldPrice: null, rating: 4.9, sold: "540", media: 4, badge: null },
  { id: 5, name: "អាវយឺតកប្បាសទន់ Unisex", price: 7.2, oldPrice: 10, rating: 4.5, sold: "980", media: 5, badge: "-28%" },
  { id: 6, name: "ឆ្កែក្មេងលេងកូនតុក្កតាទន់", price: 5.4, oldPrice: null, rating: 4.4, sold: "410", media: 6, badge: null },
  { id: 7, name: "នាឡិកាឆ្លាតវៃតាមដានសុខភាព", price: 45, oldPrice: 59, rating: 4.7, sold: "700", media: 2, badge: "-24%" },
  { id: 8, name: "កាបូបស្ពាយកម្សាន្តធំ", price: 21, oldPrice: null, rating: 4.6, sold: "330", media: 1, badge: null },
];

export const mediaColors: Record<number, [string, string]> = {
  1: ["#9a9a9a", "#4a4a4a"],
  2: ["#b5b5b5", "#6e6e6e"],
  3: ["#8c8c8c", "#2f2f2f"],
  4: ["#c2c2c2", "#7a7a7a"],
  5: ["#a8a8a8", "#3c3c3c"],
  6: ["#bcbcbc", "#5a5a5a"],
};

export const SHIPPING_OPTIONS = [
  { id: "standard", price: 1.5, icon: "truck" },
  { id: "express", price: 4, icon: "bolt" },
] as const;

export const PAYMENT_OPTIONS = [
  { id: "cod", icon: "cash" },
  { id: "khqr", icon: "qr" },
  { id: "card", icon: "card" },
] as const;
