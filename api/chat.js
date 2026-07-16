/**
 * Gladius AI — Anthropic Claude proxy (Vercel Serverless Function)
 *
 * Supports two request shapes used across the platform:
 *   1. { system, messages }   -> Anthropic passthrough (marketing Gladius console)
 *   2. { message, context }   -> simple assistant (in-dashboard Gladius)
 *
 * Env vars:
 *   CLAUDE_API_KEY / ANTHROPIC_API_KEY   (required)
 *   CLAUDE_MODEL                          (optional)
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        type: "authentication_error",
        message: "CLAUDE_API_KEY is not configured on the server.",
      },
    });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
  const maxTokens = 1024;

  let payload;
  let simple = false;

  if (Array.isArray(body.messages)) {
    payload = {
      model,
      max_tokens: maxTokens,
      system: body.system || "You are Gladius, Lanista Sports' AI intelligence system.",
      messages: body.messages,
    };
  } else {
    simple = true;
    payload = {
      model,
      max_tokens: maxTokens,
      system: body.context || "You are Gladius, an elite AI performance coach for Lanista Sports.",
      messages: [{ role: "user", content: String(body.message || "") }],
    };
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();

    if (simple) {
      const text = data && data.content && data.content[0] ? data.content[0].text : "No response.";
      return res.status(200).json({ response: text, content: text, type: data.type });
    }
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: "Upstream error: " + e.message } });
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}
