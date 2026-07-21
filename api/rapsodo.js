/**
 * /api/rapsodo — secure Rapsodo data proxy.
 *
 * Query:
 *   ?resource=roster                     → normalized player list (names for matching)
 *   ?resource=summary&playerId=<id>      → profile + hitting/pitching + talent index
 *   ?resource=summary&first=&last=       → same, matched by first/last name
 *   ?resource=hits|pitches&playerId=<id> → normalized shot summary
 *   &fresh=1                             → bypass cache
 *
 * Secrets live in env vars (never in the client). If Rapsodo isn't configured,
 * responds { configured:false } so the dashboard falls back to demo data.
 *
 * Optional auth (set REQUIRE_AUTH=1 to enforce):
 *   - Admin: header  X-Admin-Key: <ADMIN_KEY|GLADIUS_PASSWORD>
 *   - Player: header X-Player-Token: <token>  (must match requested playerId)
 */
const R = require('../lib/rapsodo.js');

function adminOk(req) {
  const key = process.env.ADMIN_KEY || process.env.GLADIUS_PASSWORD;
  return key && (req.headers['x-admin-key'] === key);
}
function playerTokenId(req) {
  const t = req.headers['x-player-token'];
  if (!t) return null;
  const v = R.verifyToken(t);
  return v ? v.playerId : null;
}
function authorize(req, playerId) {
  if (process.env.REQUIRE_AUTH !== '1') return true;      // open in demo mode
  if (adminOk(req)) return true;
  if (playerId != null && playerTokenId(req) === Number(playerId)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (!R.isConfigured()) {
    return res.status(200).json({ configured: false, message: 'Rapsodo API not configured on the server.' });
  }
  const q = req.query || {};
  const resource = (q.resource || 'roster').toString();

  try {
    if (resource === 'roster' || resource === 'players') {
      if (!authorize(req, null)) return res.status(401).json({ error: 'Unauthorized' });
      const players = await R.fetchAllPlayers();
      return res.status(200).json({ configured: true, count: players.length, players, updatedAt: Date.now() });
    }

    if (resource === 'summary') {
      let playerId = q.playerId;
      if (!playerId && (q.first || q.last)) {
        const p = await R.findPlayerByName(q.first, q.last);
        if (!p) return res.status(404).json({ configured: true, error: 'Player not found' });
        playerId = p.id;
      }
      if (!playerId) return res.status(400).json({ error: 'playerId or first/last required' });
      if (!authorize(req, playerId)) return res.status(401).json({ error: 'Unauthorized' });
      const after = q.after ? Number(q.after) : undefined;
      const summary = await R.summarizePlayer(playerId, { after });
      if (!summary) return res.status(404).json({ configured: true, error: 'Player not found' });
      return res.status(200).json({ configured: true, ...summary });
    }

    if (resource === 'hits' || resource === 'pitches') {
      const playerId = q.playerId;
      if (!playerId) return res.status(400).json({ error: 'playerId required' });
      if (!authorize(req, playerId)) return res.status(401).json({ error: 'Unauthorized' });
      const after = q.after ? Number(q.after) : undefined;
      const data = resource === 'hits'
        ? R.summarizeHitting(await R.fetchHits(playerId, { after }))
        : R.summarizePitching(await R.fetchPitches(playerId, { after }));
      return res.status(200).json({ configured: true, resource, playerId: Number(playerId), data });
    }

    return res.status(400).json({ error: 'Unknown resource: ' + resource });
  } catch (e) {
    return res.status(e.status || 502).json({ configured: true, error: e.message });
  }
};
