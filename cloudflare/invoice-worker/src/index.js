// Temporary host for invoice PDFs, so Telegram's downloadFile (which needs an https URL) can fetch them.
//   POST /invoice            body = the PDF bytes  ->  { url, expiresIn }
//   GET  /invoice/<id>.pdf   -> the PDF as an attachment
// Files are kept for one hour under a random 128-bit id and then deleted by KV itself.

const ALLOWED_ORIGINS = ["https://middleware-khmer-dev.github.io"];
const MAX_BYTES = 1_500_000; // an invoice PDF is ~130 KB
const TYPES = { pdf: "application/pdf", png: "image/png" };
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const TTL_SECONDS = 3600;

const cors = (origin) =>
  ALLOWED_ORIGINS.includes(origin)
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        vary: "Origin",
      }
    : { vary: "Origin" };

const json = (status, body, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...cors(origin) },
  });

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    if (request.method === "POST" && url.pathname === "/invoice") {
      if (!ALLOWED_ORIGINS.includes(origin)) return json(403, { error: "origin_not_allowed" }, origin);
      if (env.LIMITER) {
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const { success } = await env.LIMITER.limit({ key: ip });
        if (!success) return json(429, { error: "too_many_requests" }, origin);
      }
      const declared = Number(request.headers.get("content-length") || 0);
      if (declared > MAX_BYTES) return json(413, { error: "too_large" }, origin);
      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_BYTES) return json(413, { error: "too_large" }, origin);
      const bytes = new Uint8Array(body.slice(0, 5));
      const isPdf = new TextDecoder().decode(bytes) === "%PDF-";
      const isPng = PNG_MAGIC.every((b, i) => bytes[i] === b);
      if (!isPdf && !isPng) return json(400, { error: "not_a_pdf_or_png" }, origin);
      const ext = isPdf ? "pdf" : "png";

      const id = hex(crypto.getRandomValues(new Uint8Array(16)));
      await env.INVOICES.put(`${id}.${ext}`, body, { expirationTtl: TTL_SECONDS });
      return json(200, { url: `${url.origin}/invoice/${id}.${ext}`, expiresIn: TTL_SECONDS }, origin);
    }

    const m = url.pathname.match(/^\/invoice\/([a-f0-9]{32})\.(pdf|png)$/);
    if (request.method === "GET" && m) {
      const file = await env.INVOICES.get(`${m[1]}.${m[2]}`, "arrayBuffer");
      if (!file) return json(404, { error: "not_found_or_expired" }, origin);
      return new Response(file, {
        headers: {
          "content-type": TYPES[m[2]],
          "content-disposition": `attachment; filename="invoice.${m[2]}"`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          ...cors(origin),
        },
      });
    }

    return json(404, { error: "not_found" }, origin);
  },
};
