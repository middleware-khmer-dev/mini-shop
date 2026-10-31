import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Place } from "@/lib/geo";

const KEY = "mini_shop_address";

export type SavedAddress = { address: string; place: Place | null };

/** The delivery address saved on this device (set in Account or at checkout). */
export async function loadAddress(): Promise<SavedAddress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<SavedAddress>) : null;
    return { address: typeof s?.address === "string" ? s.address : "", place: s?.place ?? null };
  } catch {
    return { address: "", place: null };
  }
}

export async function saveAddress(a: SavedAddress) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
}
