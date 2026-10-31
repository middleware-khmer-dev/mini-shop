import { router, usePathname } from "expo-router";

/** Where "back" goes when there is no history (page opened directly, reloaded or from a shared link). */
export function fallbackFor(path: string): string {
  if (path.startsWith("/product")) return "/catalog";
  if (path.startsWith("/checkout")) return "/cart";
  if (path.startsWith("/favorites") || path.startsWith("/address") || path.startsWith("/orders")) return "/profile";
  if (path.startsWith("/success")) return "/home";
  return "/home";
}

/** Back that always does something: history if there is any, otherwise the page's parent. */
export function goBack(path: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallbackFor(path) as never);
}

export function useGoBack() {
  const path = usePathname();
  return () => goBack(path);
}
