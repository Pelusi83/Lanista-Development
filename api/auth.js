/**
 * Gladius access-code check (Vercel Serverless Function)
 *
 * POST { password } -> { success: boolean }
 *
 * Env vars:
 *   GLADIUS_PASSWORD / GLADIUS_CODE   (required to enable the admin console)
 */

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const expected = process.env.GLADIUS_PASSWORD || process.env.GLADIUS_CODE || "";
  const ok = Boolean(expected) && String(body.password || "") === String(expected);

  return res.status(200).json({ success: ok });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}
