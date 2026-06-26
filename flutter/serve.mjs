// Dev harness: serves the Flutter web build on the SAME origin as the backend
// by proxying /api/* to the Next.js server (localhost:3000). This avoids CORS
// without changing the backend. The guest session is established server-side so
// the Flutter client doesn't need to manage auth cookies.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

const BACKEND = { host: "localhost", port: 3000 };
const PORT = 8090;
const ROOT = join(process.cwd(), "build", "web");

let sessionCookie = null;

function backendReq(path, { method = "GET", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: BACKEND.host, port: BACKEND.port, path, method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function ensureSession() {
  if (sessionCookie) return;
  const r = await backendReq("/api/auth/guest?redirectUrl=/", {
    headers: { host: "localhost:3000" },
  });
  const sc = r.headers["set-cookie"] || [];
  sessionCookie = sc.map((c) => c.split(";")[0]).join("; ");
  console.log("[proxy] guest session established:", sessionCookie.slice(0, 40), "...");
}

const CT = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".bin": "application/octet-stream",
};

http
  .createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/api")) {
        await ensureSession();
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = chunks.length ? Buffer.concat(chunks) : null;
        const headers = { ...req.headers, host: "localhost:3000" };
        delete headers["accept-encoding"]; // keep responses uncompressed
        headers.cookie = sessionCookie + (req.headers.cookie ? `; ${req.headers.cookie}` : "");
        const r = await backendReq(req.url, { method: req.method, headers, body });
        const h = { ...r.headers };
        delete h["content-encoding"];
        delete h["transfer-encoding"];
        delete h["content-length"];
        res.writeHead(r.status, h);
        res.end(r.body);
        return;
      }

      let p = req.url.split("?")[0];
      if (p === "/" || p === "") p = "/index.html";
      const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
      try {
        const data = await readFile(file);
        const ext = p.slice(p.lastIndexOf("."));
        res.writeHead(200, { "content-type": CT[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        const data = await readFile(join(ROOT, "index.html"));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(data);
      }
    } catch (e) {
      res.writeHead(500);
      res.end(`proxy error: ${e.message}`);
    }
  })
  .listen(PORT, () => console.log(`[proxy] Flutter web + backend on http://localhost:${PORT}`));
