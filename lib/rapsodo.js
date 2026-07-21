/**
 * Rapsodo Cloud API integration (server-side only).
 *
 * Secrets are read from environment variables — NEVER hardcode them:
 *   RAPSODO_API_KEY      UUID API key
 *   RAPSODO_SECRET_KEY   secret used to sign each request
 *   RAPSODO_USER_ID      your Rapsodo user id
 *   RAPSODO_BALL_TYPE    "baseball" | "softball"  (default baseball)
 *   RAPSODO_CACHE_TTL_MS cache lifetime in ms     (default 7 days → weekly refresh)
 *   AUTH_SECRET          secret for signing per-player access tokens/codes
 *
 * Requests are signed per the Rapsodo spec:
 *   Authorization: ApiKey <API_KEY>
 *   RapApi-Req-Timestamp: <unix seconds>
 *   RapApi-Req-Signature: SHA1(SECRET_KEY + timestamp)
 *   RapApi-Req-User: <USER_ID>
 *   rapapi-balltype: baseball|softball
 */
const crypto = require('crypto');

const BASE = 'https://cloud.rapsodo.com';

function isConfigured() {
  return Boolean(process.env.RAPSODO_API_KEY && process.env.RAPSODO_SECRET_KEY && process.env.RAPSODO_USER_ID);
}
function ballType() {
  return (process.env.RAPSODO_BALL_TYPE || 'baseball').toLowerCase() === 'softball' ? 'softball' : 'baseball';
}
function authSecret() {
  return process.env.AUTH_SECRET || process.env.RAPSODO_SECRET_KEY || 'lanista-dev-secret';
}

function signedHeaders(bt) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHash('sha1').update(process.env.RAPSODO_SECRET_KEY + ts).digest('hex');
  return {
    Authorization: 'ApiKey ' + process.env.RAPSODO_API_KEY,
    'RapApi-Req-Timestamp': ts,
    'RapApi-Req-Signature': sig,
    'RapApi-Req-User': String(process.env.RAPSODO_USER_ID),
    'rapapi-balltype': bt || ballType(),
  };
}

/* ── tiny in-memory cache (per serverless instance) ──────────────
   Good enough to avoid hammering Rapsodo between weekly refreshes.
   For guaranteed cross-instance snapshots use Vercel KV (see docs). */
const _cache = new Map();
function ttl() { return Number(process.env.RAPSODO_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000; }
function cacheGet(key) {
  const e = _cache.get(key);
  if (e && Date.now() - e.t < ttl()) return e.v;
  return null;
}
function cacheSet(key, v) { _cache.set(key, { t: Date.now(), v }); return v; }
function cacheClear() { _cache.clear(); }

async function rapGet(path, { bt } = {}) {
  const res = await fetch(BASE + path, { headers: signedHeaders(bt) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = { status: res.status, success: false, message: text.slice(0, 200) }; }
  if (!res.ok || json.success === false) {
    const msg = (json && json.message) || ('HTTP ' + res.status);
    const err = new Error('Rapsodo: ' + msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

/* ── Players ── */
function normalizePlayer(p) {
  const hand = h => (h === 1 || h === '1' ? 'L' : 'R');
  return {
    id: p.id,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    name: ((p.firstName || '') + ' ' + (p.lastName || '')).trim() || ('Player ' + p.id),
    email: p.email || '',
    bats: p.hitterProfile ? hand(p.hitterProfile.handedness) : '',
    throws: p.pitcherProfile ? hand(p.pitcherProfile.handedness) : '',
    height: p.height ? Math.round(p.height) : null,
    weight: p.weight ? Math.round(p.weight) : null,
    ballType: p.ballType === 1 ? 'softball' : 'baseball',
  };
}

async function fetchAllPlayers({ max = 300 } = {}) {
  const cached = cacheGet('players');
  if (cached) return cached;
  const out = [];
  let page = 1, pages = 1;
  do {
    const j = await rapGet(`/api/v2/players?limit=100&page=${page}`);
    const list = (j.data && j.data.players) || [];
    list.forEach(p => out.push(normalizePlayer(p)));
    if (j.data && j.data.page) {
      const m = String(j.data.page).split('/');
      pages = Number(m[1]) || 1;
    }
    page++;
  } while (page <= pages && out.length < max);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return cacheSet('players', out);
}

async function fetchPlayerById(id) {
  const j = await rapGet(`/api/v2/players?limit=1&page=1&equal_id=${encodeURIComponent(id)}`);
  const list = (j.data && j.data.players) || [];
  return list.length ? normalizePlayer(list[0]) : null;
}

async function findPlayerByName(first, last) {
  const players = await fetchAllPlayers();
  const f = (first || '').trim().toLowerCase();
  const l = (last || '').trim().toLowerCase();
  return players.find(p =>
    p.firstName.toLowerCase() === f && p.lastName.toLowerCase() === l
  ) || players.find(p => p.name.toLowerCase() === (f + ' ' + l).trim());
}

/* ── Shots (V3 supports equal_player_id) ── */
async function fetchHits(playerId, { after, limit = 100 } = {}) {
  let path = `/api/v3/shots/hit?limit=${limit}&page=1&equal_player_id=${encodeURIComponent(playerId)}`;
  if (after) path += `&after_createdAt=${after}`;
  const j = await rapGet(path);
  return Array.isArray(j.data) ? j.data : (j.data && j.data.hits) || [];
}
async function fetchPitches(playerId, { after, limit = 100 } = {}) {
  let path = `/api/v3/shots/pitch?limit=${limit}&page=1&equal_player_id=${encodeURIComponent(playerId)}`;
  if (after) path += `&after_createdAt=${after}`;
  const j = await rapGet(path);
  return Array.isArray(j.data) ? j.data : (j.data && j.data.pitches) || [];
}

/* ── metric helpers ── */
function num(x) { return typeof x === 'number' && !isNaN(x) ? x : null; }
function avg(a) { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }
function max(a) { const v = a.filter(x => x != null); return v.length ? Math.max.apply(null, v) : null; }
function r1(x) { return x == null ? null : Math.round(x * 10) / 10; }
// Rapsodo returns breaks / release in meters; convert to inches / feet for display.
const M_TO_IN = 39.3701, M_TO_FT = 3.28084;

const PITCH_TYPES = { 0: 'Fastball', 1: 'Curveball', 2: 'Slider', 3: 'Changeup', 4: 'Cutter', 5: 'Sinker', 6: 'Splitter', 7: 'Knuckle' };

function summarizeHitting(hits) {
  if (!hits.length) return { count: 0 };
  const dist = hits.map(h => num(h.distance));
  const la = hits.map(h => num(h.launchAngle));
  const spin = hits.map(h => num(h.spin));
  const sweet = hits.filter(h => num(h.launchAngle) != null && h.launchAngle >= 8 && h.launchAngle <= 32).length;
  return {
    count: hits.length,
    avgDistance: r1(avg(dist)),
    maxDistance: r1(max(dist)),
    avgLaunchAngle: r1(avg(la)),
    avgSpin: r1(avg(spin)),
    sweetSpotPct: Math.round((sweet / hits.length) * 100),
  };
}
function summarizePitching(pitches) {
  if (!pitches.length) return { count: 0 };
  const spin = pitches.map(p => num(p.spin));
  const eff = pitches.map(p => num(p.spinEfficiency));
  const vb = pitches.map(p => (num(p.verticalBreak) != null ? p.verticalBreak * M_TO_IN : null));
  const hb = pitches.map(p => (num(p.horizontalBreak) != null ? p.horizontalBreak * M_TO_IN : null));
  const relH = pitches.map(p => (num(p.releaseHeight) != null ? p.releaseHeight * M_TO_FT : null));
  const relE = pitches.map(p => (num(p.releaseExtension) != null ? p.releaseExtension * M_TO_FT : null));
  const types = {};
  pitches.forEach(p => { const t = PITCH_TYPES[p.pitchType] || ('Type ' + p.pitchType); types[t] = (types[t] || 0) + 1; });
  return {
    count: pitches.length,
    avgSpin: r1(avg(spin)),
    avgSpinEfficiency: r1(avg(eff)),
    avgVerticalBreakIn: r1(avg(vb)),
    avgHorizontalBreakIn: r1(avg(hb)),
    avgReleaseHeightFt: r1(avg(relH)),
    avgReleaseExtensionFt: r1(avg(relE)),
    pitchTypes: types,
  };
}

function clamp(v, mn, mx) { return Math.max(0, Math.min(100, Math.round((v - mn) / (mx - mn) * 100))); }

/**
 * Derive a transparent "Rapsodo Talent Index" (0-100) from available ball-flight
 * signals. Character / Mentality / Alignment are NOT measured by Rapsodo — those
 * come from Lanista check-ins & coach evaluations, so they are left to the app.
 */
function talentFromRapsodo(hit, pitch) {
  const parts = [];
  if (hit && hit.count) {
    if (hit.maxDistance != null) parts.push(clamp(hit.maxDistance, 60, 340));
    if (hit.sweetSpotPct != null) parts.push(hit.sweetSpotPct);
  }
  if (pitch && pitch.count) {
    if (pitch.avgSpinEfficiency != null) parts.push(clamp(pitch.avgSpinEfficiency, 40, 100));
    if (pitch.avgSpin != null) parts.push(clamp(pitch.avgSpin, 1200, 2800));
  }
  if (!parts.length) return null;
  return Math.round(parts.reduce((s, x) => s + x, 0) / parts.length);
}

async function summarizePlayer(id, { after } = {}) {
  const cacheKey = 'summary:' + id + ':' + (after || '');
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const player = await fetchPlayerById(id);
  if (!player) return null;
  const [hits, pitches] = await Promise.all([
    fetchHits(id, { after }).catch(() => []),
    fetchPitches(id, { after }).catch(() => []),
  ]);
  const hitting = summarizeHitting(hits);
  const pitching = summarizePitching(pitches);
  const talent = talentFromRapsodo(hitting, pitching);
  const summary = {
    player,
    hitting,
    pitching,
    talentIndex: talent,
    hasData: (hitting.count || 0) + (pitching.count || 0) > 0,
    updatedAt: Date.now(),
    source: 'rapsodo',
  };
  return cacheSet(cacheKey, summary);
}

/* ── per-player access tokens & codes (no database needed) ──
   A stable per-player code (share with each athlete) and a signed session
   token (validated server-side). Both derived via HMAC(AUTH_SECRET, ...). */
function b32(buf) {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Crockford-ish, no ambiguous chars
  let out = '';
  for (let i = 0; i < buf.length; i++) out += A[buf[i] % A.length];
  return out;
}
function accessCodeFor(playerId) {
  const h = crypto.createHmac('sha256', authSecret()).update('code:' + playerId).digest();
  return b32(h).slice(0, 8);
}
function signToken(playerId, days = 30) {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const payload = playerId + '.' + exp;
  const sig = crypto.createHmac('sha256', authSecret()).update(payload).digest('hex').slice(0, 24);
  return Buffer.from(payload + '.' + sig).toString('base64url');
}
function verifyToken(token) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [playerId, exp, sig] = raw.split('.');
    const expected = crypto.createHmac('sha256', authSecret()).update(playerId + '.' + exp).digest('hex').slice(0, 24);
    if (sig !== expected) return null;
    if (Date.now() > Number(exp)) return null;
    return { playerId: Number(playerId), exp: Number(exp) };
  } catch (e) { return null; }
}
async function findPlayerByCode(code) {
  const players = await fetchAllPlayers();
  const c = String(code || '').trim().toUpperCase();
  return players.find(p => accessCodeFor(p.id) === c) || null;
}

module.exports = {
  isConfigured, ballType,
  fetchAllPlayers, fetchPlayerById, findPlayerByName,
  fetchHits, fetchPitches,
  summarizeHitting, summarizePitching, summarizePlayer, talentFromRapsodo,
  accessCodeFor, signToken, verifyToken, findPlayerByCode,
  cacheClear, PITCH_TYPES,
};
