# Rapsodo Integration — Design

Connects LANISTA IQ to the **Rapsodo Cloud API** (Baseball Partner API v2/v3) so
each athlete's dashboard is built from their real ball-flight data, refreshed
weekly, searchable by name, and accessible via a personal login.

## Security model

Rapsodo requires an **API key + secret** and every request is **signed**
(`SHA1(SECRET_KEY + unix_timestamp)`). The secret can never touch the browser, so
all Rapsodo calls go through server-side functions. Secrets live only in
environment variables:

```
RAPSODO_API_KEY, RAPSODO_SECRET_KEY, RAPSODO_USER_ID, RAPSODO_BALL_TYPE
AUTH_SECRET, ADMIN_KEY, CRON_SECRET, REQUIRE_AUTH
```

> ⚠️ The credentials in the shared API PDF are visible to anyone who has that
> document. Set them as environment variables (never commit them) and consider
> asking Rapsodo to **rotate** them if the PDF has been circulated.

## Server (Vercel functions)

| File | Route | Purpose |
| --- | --- | --- |
| `lib/rapsodo.js` | — | Signing, paged fetch, normalizers, metric/talent derivation, cache, token/code helpers. |
| `api/rapsodo.js` | `/api/rapsodo` | `?resource=roster` · `?resource=summary&playerId=` (or `&first=&last=`) · `?resource=hits|pitches&playerId=`. Returns `{configured:false}` when env not set. |
| `api/player-auth.js` | `/api/player-auth` | `POST {code}` → session token; `GET ?verify=` → validate; `GET ?codes=1` (admin) → per-player codes + links. |
| `api/cron-refresh.js` | `/api/cron-refresh` | Weekly cron target — clears cache & re-warms the roster. |

Endpoints used upstream: `/api/v2/players` (roster + lookup by `equal_id`),
`/api/v3/shots/hit` and `/api/v3/shots/pitch` filtered by `equal_player_id`
(the reliable per-player feed).

## Data mapping

Rapsodo measures **ball flight only** — there is no velocity field in the API, so
power is derived from distance / launch / spin.

- **Hitting** → count, avg & max distance, avg launch angle, sweet-spot % (8–32°), avg spin.
- **Pitching** → count, avg spin, spin efficiency, vertical/horizontal break (in),
  release height/extension (ft), pitch-type mix.
- **Talent Index** (0–100) → a transparent blend of max distance, sweet-spot %,
  spin efficiency and spin (whichever are present).

CORE4 = **Talent · Character · Mentality · Alignment**. Rapsodo powers **Talent**
and the **Performance** page. **Character / Mentality / Alignment** come from
Lanista check-ins & coach evaluations and show as *pending* until captured — so
the numbers are always honest about their source.

## Per-player access (no database)

Each athlete gets a stable **access code** = `HMAC(AUTH_SECRET, playerId)` (short,
unguessable, no storage). Login exchanges a code for a **signed, expiring token**
(`HMAC` of `playerId + expiry`) validated server-side.

- **Send a link:** `/iq?player=<id>&k=<token>` — opens straight into that athlete's dashboard (great to text or screenshot).
- **Self login:** `/iq?login=1` → athlete enters their code.
- **Distribute:** Coach → Athletes → **Player Access** lists every athlete's code + one-click link (requires `ADMIN_KEY`).

Set `REQUIRE_AUTH=1` to enforce that a player can only open their own dashboard
(admins bypass with `X-Admin-Key`). Left off, links are shareable for convenience.

## Weekly refresh

- `vercel.json` registers a cron: `{ "path": "/api/cron-refresh", "schedule": "0 6 * * 1" }` (Mondays 06:00 UTC).
- The proxy also caches responses for `RAPSODO_CACHE_TTL_MS` (default 7 days); append `&fresh=1` or click the **Rapsodo Live** badge to force a sync.
- The in-memory cache is per-instance. For guaranteed cross-instance weekly
  snapshots (and historical trends), back it with **Vercel KV** and persist each
  weekly pull — a natural next step.

## Testing

- `npm test` — demo-path smoke test (all roles/pages).
- `node live.test.js` — live-path test with a mocked Rapsodo fetch (roster,
  drawer, access panel, login, live player + performance).
