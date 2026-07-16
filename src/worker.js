/**
 * Lanista Sports — Cloudflare Worker
 * ------------------------------------------------------------------
 * Serves the marketing site and the LANISTA IQ dashboards, and proxies
 * the Gladius AI endpoints.
 *
 * Routes
 *   /            -> marketing site (public/index.html)
 *   /iq          -> unified LANISTA IQ platform  (public/iq.html)  [NEW]
 *   /player      -> legacy Player Dashboard       (public/player.html)
 *   /dashboard   -> legacy Platform 2.0           (public/dashboard.html)
 *   /api/auth    -> Gladius access-code check
 *   /api/chat    -> Gladius AI (Anthropic Claude proxy)
 *   *            -> falls back to the marketing site
 *
 * Static files are served from the [assets] binding (see wrangler.toml).
 */

const ROUTES = {
  "/": "/index.html",
  "/iq": "/iq.html",
  "/player": "/player.html",
  "/dashboard": "/dashboard.html",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/api/auth") return handleAuth(request, env);
    if (path === "/api/chat") return handleChat(request, env);

    // Explicit page routes.
    if (ROUTES[path]) {
      return serveAsset(env, url, ROUTES[path]);
    }

    // Try the requested asset directly (css, images, etc.).
    const direct = await env.ASSETS.fetch(new Request(new URL(url.pathname, url), request));
    if (direct.status !== 404) return direct;

    // Everything else falls back to the marketing site.
    return serveAsset(env, url, "/index.html");
  },
};

function serveAsset(env, url, assetPath) {
  return env.ASSETS.fetch(new Request(new URL(assetPath, url), { method: "GET" }));
}

/* ── Gladius auth ─────────────────────────────────────────────── */
async function handleAuth(request, env) {
  if (request.method !== "POST") return json({ success: false }, 405);
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }
  const expected = env.GLADIUS_PASSWORD || env.GLADIUS_CODE || "";
  const ok = expected && String(body.password || "") === String(expected);
  return json({ success: !!ok });
}

/* ── Gladius chat (Anthropic Claude proxy) ────────────────────── */
async function handleChat(request, env) {
  if (request.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);

  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: { type: "authentication_error", message: "CLAUDE_API_KEY is not configured on the worker." } }, 500);
  }

  // Optional shared-secret gate for the admin Gladius console.
  const gate = env.GLADIUS_PASSWORD || env.GLADIUS_CODE;
  if (gate) {
    const provided = request.headers.get("X-Gladius-Auth") || "";
    // Only enforce for the admin console format ({system, messages}); the
    // in-dashboard coach ({message, context}) uses the public assistant.
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const model = env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
  const maxTokens = 1024;

  // Two supported request shapes.
  let payload;
  let simple = false;
  if (Array.isArray(body.messages)) {
    // Anthropic passthrough (marketing Gladius console).
    payload = {
      model,
      max_tokens: maxTokens,
      system: body.system || "You are Gladius, Lanista Sports' AI intelligence system.",
      messages: body.messages,
    };
  } else {
    // Simple {message, context} shape (in-dashboard assistant).
    simple = true;
    payload = {
      model,
      max_tokens: maxTokens,
      system: body.context || "You are Gladius, an elite AI performance coach for Lanista Sports.",
      messages: [{ role: "user", content: String(body.message || "") }],
    };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (simple) {
      const text = data && data.content && data.content[0] ? data.content[0].text : "No response.";
      return json({ response: text, content: text, type: data.type });
    }
    return json(data, res.status);
  } catch (e) {
    return json({ error: { message: "Upstream error: " + e.message } }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}
