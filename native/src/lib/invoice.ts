import { Platform, Share } from "react-native";
import type { Order } from "@/lib/orders";

export type InvoiceLabels = {
  brand: string;
  title: string;
  number: string;
  date: string;
  billTo: string;
  deliverTo: string;
  item: string;
  qty: string;
  amount: string;
  subtotal: string;
  shipping: string;
  total: string;
  payment: string;
  status: string; // payment status text
  thanks: string;
  dateText: string;
  paymentText: string;
  /** "Name (variant)" style lines are built by the caller */
};

const FONT = '"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const money = (n: number) => `$${n.toFixed(2)}`;

/** Wrap text to a width; breaks long words/Khmer (no spaces) by characters. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  const tokens = text.includes(" ") ? text.split(/(\s+)/) : Array.from(text);
  for (const tk of tokens) {
    const test = line + tk;
    if (ctx.measureText(test).width <= maxW || !line) {
      line = test;
      if (ctx.measureText(line).width > maxW) {
        // single token wider than the line: split by characters
        let cur = "";
        for (const ch of Array.from(line)) {
          if (ctx.measureText(cur + ch).width > maxW && cur) {
            out.push(cur);
            cur = ch;
          } else cur += ch;
        }
        line = cur;
      }
    } else {
      out.push(line.trim());
      line = tk.trimStart();
    }
  }
  if (line.trim()) out.push(line.trim());
  return out.length ? out : [""];
}

/** Draw the invoice (A4-ish width) to a canvas. Browsers shape Khmer text themselves. */
export function drawInvoice(order: Order, L: InvoiceLabels, itemLine: (i: Order["items"][number]) => string): HTMLCanvasElement {
  const W = 794;
  const PAD = 56;
  const S = 2; // pixel ratio
  const measure = document.createElement("canvas").getContext("2d")!;

  // ---- layout pass (height) ----
  measure.font = `600 15px ${FONT}`;
  const nameW = W - PAD * 2 - 150; // leave room for qty + amount
  const rows = order.items.map((i) => ({ i, lines: wrap(measure, itemLine(i), nameW) }));
  measure.font = `400 14px ${FONT}`;
  const addr = wrap(measure, order.address, 330);
  const itemsH = rows.reduce((h, r) => h + Math.max(34, r.lines.length * 22 + 14), 0);
  const H = 520 + itemsH + Math.max(0, addr.length - 2) * 20 + 150;

  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const g = c.getContext("2d")!;
  g.scale(S, S);
  g.textBaseline = "alphabetic";

  // background + top band
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#14141f";
  g.fillRect(0, 0, W, 8);

  // brand + title
  g.fillStyle = "#14141f";
  g.font = `800 26px ${FONT}`;
  g.fillText(L.brand, PAD, 68);
  g.textAlign = "right";
  g.font = `800 30px ${FONT}`;
  g.fillText(L.title, W - PAD, 68);
  g.textAlign = "left";

  // meta (number / date) + status chip
  g.fillStyle = "#6b7280";
  g.font = `400 14px ${FONT}`;
  g.fillText(L.number, PAD, 110);
  g.fillText(L.date, PAD, 136);
  g.fillStyle = "#111827";
  g.font = `700 15px ${FONT}`;
  g.fillText(`#${order.id}`, PAD + 150, 110);
  g.fillText(L.dateText, PAD + 150, 136);
  g.font = `700 13px ${FONT}`;
  const chipW = g.measureText(L.status).width + 28;
  g.fillStyle = "#fef3c7";
  g.beginPath();
  g.roundRect(W - PAD - chipW, 92, chipW, 30, 15);
  g.fill();
  g.fillStyle = "#92400e";
  g.textAlign = "center";
  g.fillText(L.status, W - PAD - chipW / 2, 112);
  g.textAlign = "left";

  // bill to / deliver to
  let y = 190;
  g.fillStyle = "#6b7280";
  g.font = `700 12px ${FONT}`;
  g.fillText(L.billTo.toUpperCase(), PAD, y);
  g.fillText(L.deliverTo.toUpperCase(), PAD + 380, y);
  g.fillStyle = "#111827";
  g.font = `700 16px ${FONT}`;
  g.fillText(order.customer.name, PAD, y + 28);
  g.fillText(order.customer.name, PAD + 380, y + 28);
  g.fillStyle = "#4b5563";
  g.font = `400 14px ${FONT}`;
  g.fillText(order.customer.phone, PAD, y + 52);
  addr.forEach((l, k) => g.fillText(l, PAD + 380, y + 52 + k * 20));

  // items table
  y = 330 + Math.max(0, addr.length - 2) * 20;
  g.fillStyle = "#f3f4f6";
  g.fillRect(PAD, y, W - PAD * 2, 36);
  g.fillStyle = "#6b7280";
  g.font = `700 12px ${FONT}`;
  g.fillText(L.item.toUpperCase(), PAD + 14, y + 23);
  g.textAlign = "right";
  g.fillText(L.qty.toUpperCase(), W - PAD - 100, y + 23);
  g.fillText(L.amount.toUpperCase(), W - PAD - 14, y + 23);
  g.textAlign = "left";
  y += 36;
  for (const r of rows) {
    const h = Math.max(34, r.lines.length * 22 + 14);
    g.fillStyle = "#111827";
    g.font = `600 15px ${FONT}`;
    r.lines.forEach((l, k) => g.fillText(l, PAD + 14, y + 24 + k * 22));
    g.textAlign = "right";
    g.font = `400 15px ${FONT}`;
    g.fillText(`${r.i.qty}`, W - PAD - 100, y + 24);
    g.font = `700 15px ${FONT}`;
    g.fillText(money(r.i.price * r.i.qty), W - PAD - 14, y + 24);
    g.textAlign = "left";
    g.strokeStyle = "#e5e7eb";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(PAD, y + h);
    g.lineTo(W - PAD, y + h);
    g.stroke();
    y += h;
  }

  // totals
  y += 30;
  const lab = (text: string, val: string, yy: number, big = false) => {
    g.textAlign = "left";
    g.fillStyle = big ? "#111827" : "#6b7280";
    g.font = `${big ? 800 : 400} ${big ? 20 : 15}px ${FONT}`;
    g.fillText(text, W - PAD - 260, yy);
    g.textAlign = "right";
    g.fillStyle = "#111827";
    g.font = `${big ? 800 : 700} ${big ? 24 : 15}px ${FONT}`;
    g.fillText(val, W - PAD - 14, yy);
    g.textAlign = "left";
  };
  lab(L.subtotal, money(order.subtotal), y);
  lab(L.shipping, money(order.shipping), y + 28);
  g.strokeStyle = "#111827";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(W - PAD - 260, y + 46);
  g.lineTo(W - PAD, y + 46);
  g.stroke();
  lab(L.total, money(order.total), y + 78, true);

  // payment + thanks
  g.fillStyle = "#6b7280";
  g.font = `400 14px ${FONT}`;
  g.fillText(`${L.payment}: ${L.paymentText}`, PAD, y + 26);
  g.fillStyle = "#9ca3af";
  g.font = `400 13px ${FONT}`;
  g.textAlign = "center";
  g.fillText(L.thanks, W / 2, H - 36);
  g.textAlign = "left";
  return c;
}

/** A one-page PDF containing the canvas as a JPEG (so Khmer renders exactly as on screen). */
export function canvasToPdf(canvas: HTMLCanvasElement): Blob {
  const jpeg = atob(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
  const jpgBytes = new Uint8Array(jpeg.length);
  for (let i = 0; i < jpeg.length; i++) jpgBytes[i] = jpeg.charCodeAt(i);

  const pageW = 595; // A4 width in points
  const pageH = Math.round((canvas.height / canvas.width) * pageW);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    parts.push(u);
    pos += u.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgBytes.length} >>\nstream\n`);
    push(jpgBytes);
    push("\nendstream");
  });
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = pos;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const all = new Uint8Array(pos);
  let o = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  return new Blob([all], { type: "application/pdf" });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type DownloadKind = "pdf" | "png";

/** Download the invoice as a PDF or PNG (web). On native, shares a text summary instead. */
export async function downloadInvoice(
  order: Order,
  L: InvoiceLabels,
  itemLine: (i: Order["items"][number]) => string,
  kind: DownloadKind,
): Promise<void> {
  if (Platform.OS !== "web") {
    const lines = order.items.map((i) => `${itemLine(i)}  x${i.qty}  ${money(i.price * i.qty)}`).join("\n");
    await Share.share({ message: `${L.brand} - ${L.title} #${order.id}\n${lines}\n${L.total}: ${money(order.total)}` });
    return;
  }
  // make sure the page font is loaded before drawing
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {}
  const canvas = drawInvoice(order, L, itemLine);
  const name = `invoice-${order.id}`;
  if (kind === "pdf") {
    saveBlob(canvasToPdf(canvas), `${name}.pdf`);
  } else {
    await new Promise<void>((resolve, reject) =>
      canvas.toBlob((b) => (b ? (saveBlob(b, `${name}.png`), resolve()) : reject(new Error("png"))), "image/png"),
    );
  }
}
