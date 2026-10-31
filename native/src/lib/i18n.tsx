import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "km" | "en";
const KEY = "mini_shop_lang";

const dict: Record<Lang, Record<string, string>> = {
  km: {
    "nav.home": "ទំព័រដើម", "nav.catalog": "កាតាឡុក", "nav.cart": "កន្ត្រក", "nav.profile": "គណនី",
    "common.back": "ត្រឡប់ក្រោយ", "common.total": "សរុប", "common.totalAll": "សរុបទាំងអស់",
    "common.viewAll": "មើលទាំងអស់", "common.all": "ទាំងអស់", "common.guest": "ភ្ញៀវ",
    "lang.title": "ភាសា",
    "home.hello": "សួស្តី 👋", "home.search": "ស្វែងរកទំនិញ, ហាង...", "home.promoTag": "ការផ្តល់ជូនពិសេស",
    "home.promoTitle": "បញ្ចុះតម្លៃរហូតដល់ 50%", "home.promoSub": "សម្រាប់ការបញ្ជាទិញលើកដំបូង",
    "home.categories": "ប្រភេទទំនិញ", "home.popular": "ទំនិញពេញនិយម", "home.new": "ថ្មីៗសម្រាប់អ្នក",
    "cat.men's clothing": "ខោអាវបុរស", "cat.women's clothing": "ខោអាវស្ត្រី", "cat.jewelery": "គ្រឿងអលង្ការ", "cat.electronics": "អេឡិចត្រូនិច",
    "catalog.title": "កាតាឡុក", "catalog.search": "ស្វែងរកទំនិញ...", "catalog.showing": "បង្ហាញ {n} ទំនិញ",
    "catalog.sort": "តម្លៃទាប → ខ្ពស់", "catalog.sortDesc": "តម្លៃខ្ពស់ → ទាប", "catalog.sortOff": "តម្រៀប", "catalog.clear": "លុបពាក្យស្វែងរក", "catalog.empty": "រកមិនឃើញទំនិញ", "catalog.emptySub": "សូមសាកល្បងពាក្យផ្សេង",
    "card.reviews": "{n} មតិ", "card.add": "ដាក់ក្នុងកន្ត្រក",
    "product.size": "ទំហំ", "product.qty": "ចំនួន", "product.details": "ព័ត៌មានលម្អិត", "product.reviewsTab": "មតិវាយតម្លៃ (128)",
    "product.reviewText": "ទំនិញល្អ ដឹកលឿន ស្អាតដូចរូប។ ណែនាំឱ្យទិញ!", "product.wish": "ចូលចិត្ត", "fav.title": "ទំនិញចូលចិត្ត", "fav.empty": "មិនទាន់មានទំនិញចូលចិត្ត", "fav.emptySub": "ចុចរូបបេះដូងលើទំនិញ ដើម្បីរក្សាទុកទីនេះ", "fav.browse": "មើលកាតាឡុក", "fav.count": "{n} ទំនិញ", "product.share": "ចែករំលែក",
    "product.added": "បានដាក់ក្នុងកន្ត្រក ✓", "product.buyNow": "ទិញឥឡូវនេះ",
    "cart.title": "កន្ត្រករបស់ខ្ញុំ ({n})", "cart.clear": "លុបទាំងអស់", "cart.empty": "កន្ត្រកទទេ", "cart.shop": "ទិញទំនិញ",
    "cart.remove": "លុប", "cart.dec": "ដក", "cart.inc": "បូក", "cart.promoApplied": "បានប្រើកូដរួចហើយ ✓",
    "cart.promoPh": "បញ្ចូលកូដបញ្ចុះតម្លៃ", "cart.apply": "ប្រើប្រាស់", "cart.summary": "សេចក្តីសង្ខេបការបញ្ជាទិញ",
    "cart.subtotal": "តម្លៃទំនិញ", "cart.saved": "បានសន្សំ", "cart.shipping": "ថ្លៃដឹកជញ្ជូន", "cart.pay": "បន្តទៅទូទាត់", "cart.signInToPay": "ចូលគណនីដើម្បីបន្ត", "steps.cart": "កន្ត្រក", "steps.pay": "ទូទាត់", "steps.done": "រួចរាល់",
    "checkout.processing": "កំពុងដំណើរការ...", "checkout.secure": "ការទូទាត់មានសុវត្ថិភាព", "checkout.hint.cod": "រៀបចំប្រាក់សម្រាប់បង់ពេលអ្នកដឹកជញ្ជូនមកដល់។",
    "checkout.hint.khqr": "កូដ KHQR នឹងបង្ហាញបន្ទាប់ពីអ្នកបញ្ជាទិញ។ ស្កេនជាមួយកម្មវិធីធនាគាររបស់អ្នក។", "checkout.hint.card": "អ្នកនឹងបញ្ចូលព័ត៌មានកាតនៅជំហានបន្ទាប់។",
    "checkout.title": "ទូទាត់ប្រាក់", "checkout.address": "អាសយដ្ឋានដឹកជញ្ជូន", "checkout.name": "សុវណ្ណារី",
    "checkout.addressText": "ផ្ទះលេខ 12, ផ្លូវ 271, សង្កាត់ទឹកល្អក់ទី1, ខណ្ឌទួលគោក, ភ្នំពេញ", "checkout.change": "ប្តូរ", "address.title": "អាសយដ្ឋានដឹកជញ្ជូន", "address.save": "រក្សាទុក", "address.cancel": "បោះបង់", "address.add": "បន្ថែមអាសយដ្ឋាន", "address.edit": "កែ", "address.delete": "លុប", "address.confirmDelete": "ចុចម្តងទៀតដើម្បីលុប", "address.default": "ប្រើក្នុងការទូទាត់", "address.empty": "មិនទាន់មានអាសយដ្ឋាន", "address.emptySub": "បន្ថែមអាសយដ្ឋានផ្ទះ កន្លែងធ្វើការ ឬកន្លែងផ្សេងទៀត។", "address.hint": "ចុចអាសយដ្ឋានណាមួយដើម្បីប្រើវាក្នុងការទូទាត់។", "address.label.home": "ផ្ទះ", "address.label.work": "កន្លែងធ្វើការ", "address.label.other": "ផ្សេងៗ", "checkout.addAddress": "បន្ថែមអាសយដ្ឋានដើម្បីបន្ត", "checkout.manageAddress": "គ្រប់គ្រងអាសយដ្ឋាន", "map.pick": "ជ្រើសរើសលើផែនទី", "map.change": "ប្តូរទីតាំងលើផែនទី", "map.close": "បិទផែនទី", "map.search": "ស្វែងរកទីតាំង ឬផ្លូវ...", "map.locate": "ទីតាំងរបស់ខ្ញុំ", "map.hint": "អូសផែនទីដើម្បីដាក់ម្ជុលត្រង់ទីតាំងដឹកជញ្ជូន។", "map.noLocation": "មិនអាចទាញយកទីតាំងបានទេ។ សូមអូសផែនទី ឬស្វែងរកដោយខ្លួនឯង។", "map.noResult": "រកមិនឃើញទីតាំងនេះទេ",
    "checkout.shipping": "ការដឹកជញ្ជូន", "checkout.payment": "វិធីទូទាត់ប្រាក់", "checkout.items": "ទំនិញក្នុងការបញ្ជាទិញ",
    "checkout.note": "កំណត់ចំណាំ (ស្រេចចិត្ត)", "checkout.notePh": "ឧ. សូមទូរស័ព្ទមុនដឹក...", "checkout.place": "ទូទាត់ឥឡូវនេះ",
    "ship.standard.title": "ដឹកជញ្ជូនធម្មតា", "ship.standard.sub": "2–3 ថ្ងៃធ្វើការ",
    "ship.express.title": "ដឹកជញ្ជូនលឿន", "ship.express.sub": "ក្នុងរយៈពេល 24 ម៉ោង",
    "pay.cod.title": "បង់ប្រាក់ពេលទទួលទំនិញ", "pay.cod.sub": "Cash on Delivery",
    "pay.khqr.title": "KHQR", "pay.khqr.sub": "ស្កេនទូទាត់តាមធនាគារ",
    "pay.card.title": "កាតឥណទាន / ដេប៊ីត", "pay.card.sub": "Visa, Mastercard",
    "success.title": "ការបញ្ជាទិញជោគជ័យ!", "success.sub": "អរគុណសម្រាប់ការទិញទំនិញ។ យើងនឹងដឹកជញ្ជូនជូនអ្នកឆាប់ៗនេះ។",
    "success.orderNo": "លេខបញ្ជាទិញ", "success.payMethod": "វិធីទូទាត់", "success.home": "ត្រឡប់ទៅទំព័រដើម", "success.more": "បន្តទិញទំនិញ",
    "profile.title": "គណនី", "profile.loginHint": "ចូលគណនីដើម្បីទិញទំនិញ", "profile.logout": "ចាកចេញពីគណនី", "profile.login": "ចូលគណនី / ចុះឈ្មោះ",
    "auth.login": "ចូលប្រើប្រាស់", "auth.register": "ចុះឈ្មោះ", "auth.create": "បង្កើតគណនី", "auth.fullname": "ឈ្មោះពេញ",
    "auth.fullnamePh": "ឧ. សុវណ្ណារី", "auth.phone": "លេខទូរស័ព្ទ", "auth.password": "ពាក្យសម្ងាត់", "auth.passwordPh": "បញ្ចូលពាក្យសម្ងាត់",
    "auth.confirm": "បញ្ជាក់ពាក្យសម្ងាត់", "auth.confirmPh": "បញ្ចូលម្តងទៀត", "auth.continue": "បន្តមើលទំនិញ",
    "auth.errPhone": "សូមបញ្ចូលលេខទូរស័ព្ទឱ្យត្រឹមត្រូវ", "auth.errPassword": "សូមបញ្ចូលពាក្យសម្ងាត់", "auth.errName": "សូមបញ្ចូលឈ្មោះពេញ",
    "auth.errShort": "ពាក្យសម្ងាត់ត្រូវការយ៉ាងតិច ៨ តួអក្សរ", "auth.errMismatch": "ពាក្យសម្ងាត់មិនដូចគ្នា",
    "auth.errLogin": "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "auth.errRegister": "មិនអាចបង្កើតគណនីបានទេ សូមព្យាយាមម្តងទៀត",
    "invoice.brand": "Mini Shop", "invoice.title": "វិក្កយបត្រ", "invoice.number": "លេខវិក្កយបត្រ", "invoice.date": "កាលបរិច្ឆេទ",
    "invoice.billTo": "ម្ចាស់ការបញ្ជាទិញ", "invoice.deliverTo": "ដឹកជញ្ជូនទៅ", "invoice.item": "ទំនិញ", "invoice.qty": "ចំនួន", "invoice.amount": "ទឹកប្រាក់",
    "invoice.payment": "វិធីទូទាត់", "invoice.status.cod": "បង់ពេលទទួលទំនិញ", "invoice.status.khqr": "រង់ចាំការទូទាត់", "invoice.status.card": "រង់ចាំការទូទាត់",
    "invoice.thanks": "អរគុណសម្រាប់ការទិញទំនិញ!", "invoice.download": "ទាញយក PDF", "invoice.saveImage": "រក្សាទុកជារូបភាព", "invoice.preparing": "កំពុងរៀបចំ...",
    "invoice.failed": "មិនអាចទាញយកបាន សូមសាកល្បងម្តងទៀត", "invoice.hint": "ក្នុង Telegram៖ ជ្រើសកន្លែងរក្សាទុក ឬចែករំលែក។ បើគ្មានអ្វីបើក យើងនឹងបង្ហាញរូបវិក្កយបត្រឱ្យអ្នករក្សាទុក។", "invoice.holdToSave": "ចុចឱ្យជាប់លើរូបភាព រួចជ្រើស រក្សាទុក / ទាញយករូបភាព។ ឬថតអេក្រង់ទុកក៏បាន។", "invoice.close": "បិទ",
    "invoice.notFound": "រកមិនឃើញវិក្កយបត្រ",
    "banner.offline": "មិនអាចទាញយកទំនិញបានទេ — បង្ហាញទិន្នន័យគំរូ", "banner.retry": "ព្យាយាមម្តងទៀត",
  },
  en: {
    "nav.home": "Home", "nav.catalog": "Catalog", "nav.cart": "Cart", "nav.profile": "Account",
    "common.back": "Back", "common.total": "Total", "common.totalAll": "Total",
    "common.viewAll": "View all", "common.all": "All", "common.guest": "Guest",
    "lang.title": "Language",
    "home.hello": "Hello 👋", "home.search": "Search products, shops...", "home.promoTag": "Special offer",
    "home.promoTitle": "Up to 50% off", "home.promoSub": "On your first order",
    "home.categories": "Categories", "home.popular": "Popular", "home.new": "New for you",
    "cat.men's clothing": "Men's clothing", "cat.women's clothing": "Women's clothing", "cat.jewelery": "Jewelry", "cat.electronics": "Electronics",
    "catalog.title": "Catalog", "catalog.search": "Search products...", "catalog.showing": "Showing {n} products",
    "catalog.sort": "Price: low → high", "catalog.sortDesc": "Price: high → low", "catalog.sortOff": "Sort", "catalog.clear": "Clear search", "catalog.empty": "No products found", "catalog.emptySub": "Try a different search",
    "card.reviews": "{n} reviews", "card.add": "Add to cart",
    "product.size": "Size", "product.qty": "Quantity", "product.details": "Details", "product.reviewsTab": "Reviews (128)",
    "product.reviewText": "Great product, fast delivery, looks just like the photo. Recommended!", "product.wish": "Favorite", "fav.title": "Favorites", "fav.empty": "No favorites yet", "fav.emptySub": "Tap the heart on a product to keep it here", "fav.browse": "Browse catalog", "fav.count": "{n} items", "product.share": "Share",
    "product.added": "Added to cart ✓", "product.buyNow": "Buy now",
    "cart.title": "My cart ({n})", "cart.clear": "Clear all", "cart.empty": "Your cart is empty", "cart.shop": "Start shopping",
    "cart.remove": "Remove", "cart.dec": "Decrease", "cart.inc": "Increase", "cart.promoApplied": "Code applied ✓",
    "cart.promoPh": "Enter promo code", "cart.apply": "Apply", "cart.summary": "Order summary",
    "cart.subtotal": "Subtotal", "cart.saved": "You save", "cart.shipping": "Shipping", "cart.pay": "Checkout", "cart.signInToPay": "Sign in to continue", "steps.cart": "Cart", "steps.pay": "Pay", "steps.done": "Done",
    "checkout.processing": "Processing...", "checkout.secure": "Secure payment", "checkout.hint.cod": "Have the cash ready when the courier arrives.",
    "checkout.hint.khqr": "The KHQR code appears after you place the order. Scan it with your bank app.", "checkout.hint.card": "You will enter your card details in the next step.",
    "checkout.title": "Checkout", "checkout.address": "Delivery address", "checkout.name": "Sovannary",
    "checkout.addressText": "House 12, Street 271, Tuek L'ak 1, Tuol Kouk, Phnom Penh", "checkout.change": "Change", "address.title": "Delivery addresses", "address.save": "Save", "address.cancel": "Cancel", "address.add": "Add address", "address.edit": "Edit", "address.delete": "Delete", "address.confirmDelete": "Tap again to delete", "address.default": "Used at checkout", "address.empty": "No addresses yet", "address.emptySub": "Add your home, work or any other place.", "address.hint": "Tap an address to use it at checkout.", "address.label.home": "Home", "address.label.work": "Work", "address.label.other": "Other", "checkout.addAddress": "Add an address to continue", "checkout.manageAddress": "Manage addresses", "map.pick": "Pick on map", "map.change": "Change location on map", "map.close": "Close map", "map.search": "Search a place or street...", "map.locate": "My location", "map.hint": "Drag the map to put the pin on the delivery spot.", "map.noLocation": "Could not get your location. Drag the map or search instead.", "map.noResult": "No place found",
    "checkout.shipping": "Shipping", "checkout.payment": "Payment method", "checkout.items": "Items in this order",
    "checkout.note": "Note (optional)", "checkout.notePh": "e.g. Please call before delivery...", "checkout.place": "Pay now",
    "ship.standard.title": "Standard delivery", "ship.standard.sub": "2–3 business days",
    "ship.express.title": "Express delivery", "ship.express.sub": "Within 24 hours",
    "pay.cod.title": "Cash on delivery", "pay.cod.sub": "Pay when you receive",
    "pay.khqr.title": "KHQR", "pay.khqr.sub": "Scan to pay with your bank app",
    "pay.card.title": "Credit / debit card", "pay.card.sub": "Visa, Mastercard",
    "success.title": "Order placed!", "success.sub": "Thank you for your purchase. We will deliver it to you soon.",
    "success.orderNo": "Order number", "success.payMethod": "Payment", "success.home": "Back to home", "success.more": "Continue shopping",
    "profile.title": "Account", "profile.loginHint": "Sign in to place orders", "profile.logout": "Log out", "profile.login": "Log in / Sign up",
    "auth.login": "Log in", "auth.register": "Sign up", "auth.create": "Create account", "auth.fullname": "Full name",
    "auth.fullnamePh": "e.g. Sovannary", "auth.phone": "Phone number", "auth.password": "Password", "auth.passwordPh": "Enter your password",
    "auth.confirm": "Confirm password", "auth.confirmPh": "Enter it again", "auth.continue": "Continue browsing",
    "auth.errPhone": "Enter a valid phone number", "auth.errPassword": "Enter your password", "auth.errName": "Enter your full name",
    "auth.errShort": "Password must be at least 8 characters", "auth.errMismatch": "Passwords do not match",
    "auth.errLogin": "Wrong phone number or password", "auth.errRegister": "Could not create the account, please try again",
    "invoice.brand": "Mini Shop", "invoice.title": "Invoice", "invoice.number": "Invoice no.", "invoice.date": "Date",
    "invoice.billTo": "Billed to", "invoice.deliverTo": "Deliver to", "invoice.item": "Item", "invoice.qty": "Qty", "invoice.amount": "Amount",
    "invoice.payment": "Payment", "invoice.status.cod": "Pay on delivery", "invoice.status.khqr": "Awaiting payment", "invoice.status.card": "Awaiting payment",
    "invoice.thanks": "Thank you for your purchase!", "invoice.download": "Download PDF", "invoice.saveImage": "Save as image", "invoice.preparing": "Preparing...",
    "invoice.failed": "Could not download, please try again", "invoice.hint": "In Telegram: choose where to save or share it. If nothing opens, the invoice picture is shown so you can save it.", "invoice.holdToSave": "Press and hold the image, then choose Save / Download image. A screenshot works too.", "invoice.close": "Close",
    "invoice.notFound": "Invoice not found",
    "banner.offline": "Could not load products — showing sample data", "banner.retry": "Retry",
  },
};

type Vars = Record<string, string | number>;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Vars) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("km");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => (v === "en" || v === "km") && setLangState(v));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        const raw = dict[lang][key] ?? (vars?.fallback as string | undefined) ?? key;
        return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ""));
      },
    }),
    [lang, setLang],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
};
