/**
 * /api/player-auth — per-player access without a database.
 *
 * POST { code }                 → { success, token, player }   (player logs in with their code)
 * GET  ?verify=<token>          → { valid, playerId }
 * GET  ?codes=1                 → { players:[{id,name,code,link}] }  (ADMIN ONLY — for coaches to distribute)
 *
 * Access codes are HMAC(AUTH_SECRET, playerId) — stable, unguessable, no storage.
 * Session tokens are signed + expiring HMACs, validated server-side.
 */
const R = require('../lib/rapsodo.js');

function adminOk(req) {
  const key = process.env.ADMIN_KEY || process.env.GLADIUS_PASSWORD;
  return key && (req.headers['x-admin-key'] === key);
}
function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

module.exports = async function handler(req, res) {
  if (!R.isConfigured()) {
    return res.status(200).json({ configured: false });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
    const code = (body.code || '').toString().trim();
    if (!code) return res.status(400).json({ success: false, error: 'code required' });
    try {
      const player = await R.findPlayerByCode(code);
      if (!player) return res.status(200).json({ success: false, error: 'Invalid access code' });
      const token = R.signToken(player.id);
      return res.status(200).json({ success: true, token, player });
    } catch (e) {
      return res.status(502).json({ success: false, error: e.message });
    }
  }

  const q = req.query || {};
  if (q.verify) {
    const v = R.verifyToken(q.verify.toString());
    return res.status(200).json({ valid: !!v, playerId: v ? v.playerId : null });
  }

  if (q.codes) {
    if (!adminOk(req)) return res.status(401).json({ error: 'Admin key required (X-Admin-Key).' });
    try {
      const base = (q.base || '').toString().replace(/\/$/, '');
      const players = (await R.fetchAllPlayers()).map(p => ({
        id: p.id, name: p.name,
        code: R.accessCodeFor(p.id),
        link: base ? base + '/iq?player=' + p.id + '&k=' + R.signToken(p.id) : null,
      }));
      return res.status(200).json({ players });
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Use POST {code}, GET ?verify=, or GET ?codes=1' });
};
