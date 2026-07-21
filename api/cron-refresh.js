/**
 * /api/cron-refresh — weekly warm of Rapsodo data.
 *
 * Triggered by Vercel Cron (see vercel.json "crons"). Clears the cache and
 * re-fetches the roster so the first dashboard load of the week is fast and
 * current. Protected: Vercel sets an Authorization: Bearer <CRON_SECRET> header
 * for cron requests when CRON_SECRET is configured.
 */
const R = require('../lib/rapsodo.js');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    const isVercelCron = req.headers['x-vercel-cron'] != null;
    if (auth !== 'Bearer ' + secret && !isVercelCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  if (!R.isConfigured()) {
    return res.status(200).json({ configured: false, refreshed: false });
  }
  try {
    R.cacheClear();
    const players = await R.fetchAllPlayers();
    return res.status(200).json({ configured: true, refreshed: true, players: players.length, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
