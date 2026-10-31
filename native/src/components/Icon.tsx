import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "home" | "grid" | "cart" | "user" | "shirt" | "bolt" | "sparkle" | "basket" | "gift" | "bell"
  | "search" | "filter" | "back" | "trash" | "close" | "plus" | "minus" | "heart" | "share" | "star"
  | "truck" | "cash" | "qr" | "card" | "pin" | "check";

type Props = { name: IconName; size?: number; color?: string; fill?: string };

export function Icon({ name, size = 20, color = "#111", fill = "none" }: Props) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  let body: React.ReactNode;
  switch (name) {
    case "home": body = (<><Path d="m3 11 9-7 9 7" {...p} /><Path d="M5 10v10h14V10" {...p} /></>); break;
    case "grid": body = (<><Rect x="3" y="3" width="7" height="7" rx="1.5" {...p} /><Rect x="14" y="3" width="7" height="7" rx="1.5" {...p} /><Rect x="3" y="14" width="7" height="7" rx="1.5" {...p} /><Rect x="14" y="14" width="7" height="7" rx="1.5" {...p} /></>); break;
    case "cart": body = (<><Path d="M6 6h15l-1.5 9h-12z" {...p} /><Path d="M6 6 5 2H2" {...p} /><Circle cx="9" cy="20" r="1.4" fill={color} stroke="none" /><Circle cx="17" cy="20" r="1.4" fill={color} stroke="none" /></>); break;
    case "user": body = (<><Circle cx="12" cy="8" r="4" {...p} /><Path d="M4 20c1.5-4 6-5 8-5s6.5 1 8 5" {...p} /></>); break;
    case "shirt": body = <Path d="M16 4l-4 2-4-2-4 3 2 3v10h12V10l2-3-4-3Z" {...p} />; break;
    case "bolt": body = <Path d="m13 2-8 11h6l-1 9 8-11h-6l1-9Z" {...p} />; break;
    case "sparkle": body = <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" {...p} />; break;
    case "basket": body = (<><Path d="M4 9h16l-1.5 10h-13z" {...p} /><Path d="M8 9l3-5M16 9l-3-5" {...p} /></>); break;
    case "gift": body = (<><Rect x="3" y="8" width="18" height="4" rx="1" {...p} /><Path d="M12 8v13M5 12v9h14v-9M12 8c-2-4-6-3-5 0 .6 1.5 5 0 5 0Zm0 0c2-4 6-3 5 0-.6 1.5-5 0-5 0Z" {...p} /></>); break;
    case "bell": body = (<><Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...p} /><Path d="M13.7 21a2 2 0 0 1-3.4 0" {...p} /></>); break;
    case "search": body = (<><Circle cx="11" cy="11" r="7" {...p} /><Path d="m21 21-4.3-4.3" {...p} /></>); break;
    case "filter": body = <Path d="M4 6h16M7 12h10M10 18h4" {...p} />; break;
    case "back": body = <Path d="m15 18-6-6 6-6" {...p} />; break;
    case "trash": body = <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...p} />; break;
    case "close": body = <Path d="M18 6 6 18M6 6l12 12" {...p} />; break;
    case "plus": body = <Path d="M12 5v14M5 12h14" {...p} />; break;
    case "minus": body = <Path d="M5 12h14" {...p} />; break;
    case "heart": body = <Path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z" {...p} fill={fill} />; break;
    case "share": body = (<><Circle cx="18" cy="5" r="3" {...p} /><Circle cx="6" cy="12" r="3" {...p} /><Circle cx="18" cy="19" r="3" {...p} /><Path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" {...p} /></>); break;
    case "star": body = <Path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="none" fill={color} />; break;
    case "truck": body = (<><Path d="M2 6h11v10H2zM13 9h4l3 3v4h-7" {...p} /><Circle cx="7" cy="18" r="1.8" {...p} /><Circle cx="17" cy="18" r="1.8" {...p} /></>); break;
    case "cash": body = (<><Rect x="2" y="6" width="20" height="12" rx="2" {...p} /><Circle cx="12" cy="12" r="2.6" {...p} /></>); break;
    case "qr": body = (<><Rect x="3" y="3" width="7" height="7" rx="1" {...p} /><Rect x="14" y="3" width="7" height="7" rx="1" {...p} /><Rect x="3" y="14" width="7" height="7" rx="1" {...p} /><Path d="M14 14h3v3h-3zM20 14v7M14 20h3" {...p} /></>); break;
    case "card": body = (<><Rect x="2" y="5" width="20" height="14" rx="2" {...p} /><Path d="M2 10h20" {...p} /></>); break;
    case "pin": body = (<><Path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" {...p} /><Circle cx="12" cy="10" r="2.5" {...p} /></>); break;
    case "check": body = <Path d="m5 12 5 5 9-10" {...p} />; break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
