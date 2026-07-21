# Lanista Development

Lanista Sports — athlete development platform. Marketing site + the unified
**LANISTA IQ** athlete intelligence dashboard for Players, Coaches, and Admins.

Deployed on **Vercel** (static assets + serverless functions).

## 🚀 Share it with your team (fastest path)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Pelusi83/Lanista-Development&env=CLAUDE_API_KEY,GLADIUS_PASSWORD&envDescription=Gladius%20AI%20key%20%2B%20admin%20access%20code&project-name=lanista-iq&repository-name=lanista-iq)

**Recommended: import the existing repo (2 minutes)**

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Click **Import** next to `Pelusi83/Lanista-Development`.
3. Framework Preset: **Other** (no build step needed — leave build/output empty).
4. (Optional) add Environment Variables so the Gladius AI works:
   - `CLAUDE_API_KEY` — your Anthropic key
   - `GLADIUS_PASSWORD` — admin Gladius access code
   - *(the dashboards work fine without these; Gladius just shows "offline")*
5. Click **Deploy**. You'll get a shareable URL like `https://lanista-iq.vercel.app`.

Then send your team:
- `https://<your-project>.vercel.app/iq` → the **new unified LANISTA IQ** dashboard
- Add `?role=coach` or `?role=admin` to open a specific view (e.g. `.../iq?role=coach`)
- `https://<your-project>.vercel.app/` → the marketing site (its nav opens Lanista IQ)

> **Getting the NEW dashboard live:** the redesign is on branch
> `cursor/unified-lanista-iq-dashboard-ac54` (PR #1). Either **merge PR #1 into
> `main`** first, or — once the repo is connected to Vercel — open the PR and use
> the **preview URL** Vercel auto-comments for that branch (great for team review
> without merging).

**CLI alternative**

```bash
npm i -g vercel
vercel login
vercel            # preview deploy → preview URL
vercel --prod     # production deploy
```


## Structure

```
index.html        Marketing site            ->  /
iq.html           Unified LANISTA IQ         ->  /iq        (NEW – Player/Coach/Admin)
player.html       Legacy Player Dashboard    ->  /player    (kept for reference)
dashboard.html    Legacy Platform 2.0        ->  /dashboard (kept for reference)
api/
  chat.js         Gladius AI proxy (Anthropic Claude)  ->  /api/chat
  auth.js         Gladius access-code check            ->  /api/auth
vercel.json       Routing (rewrites)
```

## Develop

```bash
npm install
npm run dev        # vercel dev (serves static files + /api functions locally)
```

## Deploy

```bash
npm run deploy     # vercel deploy --prod
```

### Environment variables

Set these in the Vercel project (Settings → Environment Variables):

| Name                 | Purpose                                                      |
| -------------------- | ----------------------------------------------------------- |
| `CLAUDE_API_KEY`     | Anthropic API key for the Gladius AI assistant              |
| `GLADIUS_PASSWORD`   | Access code for the admin Gladius console                   |
| `CLAUDE_MODEL`       | (optional) override the default Claude model                |
| `RAPSODO_API_KEY`    | Rapsodo Cloud API key (UUID)                                |
| `RAPSODO_SECRET_KEY` | Rapsodo secret used to sign requests                        |
| `RAPSODO_USER_ID`    | Your Rapsodo user id                                        |
| `RAPSODO_BALL_TYPE`  | (optional) `baseball` (default) or `softball`               |
| `AUTH_SECRET`        | secret for signing per-player login tokens & access codes   |
| `ADMIN_KEY`          | (optional) key to view/distribute player access links       |
| `CRON_SECRET`        | (optional) protects the weekly refresh cron endpoint        |
| `REQUIRE_AUTH`       | (optional) set to `1` to require player token / admin key   |

## Rapsodo integration

`/iq` connects to the **Rapsodo Cloud API** to build each athlete's dashboard
from real ball-flight data. See [`docs/RAPSODO-INTEGRATION.md`](docs/RAPSODO-INTEGRATION.md)
for the full design. In short:

- **Live roster by name** — coaches/admins see real Rapsodo players; click any
  athlete to open their dashboard. Search works by first/last name.
- **Per-player dashboards** — each athlete has their own view at
  `/iq?player=<id>`. Coaches can send that link or screenshot it.
- **Unique player logins** — every athlete gets a stable access code
  (`/iq?login=1` → enter code) or a one-click signed link. Codes/links are
  generated in **Coach → Athletes → Player Access** (needs `ADMIN_KEY`).
- **Weekly refresh** — a Vercel Cron (`api/cron-refresh`, Mondays 06:00) warms the
  data each week; the proxy also caches for a week (`RAPSODO_CACHE_TTL_MS`).
- **Graceful fallback** — with no Rapsodo env vars set, `/iq` shows the built-in
  demo so nothing breaks.

> Talent + Performance come from live Rapsodo data. Character, Mentality &
> Alignment come from Lanista check-ins & coach evaluations (Rapsodo only
> measures ball flight).

## LANISTA IQ

`/iq` merges the original Player Dashboard and Platform 2.0 into one cohesive,
role-adaptive experience with a shared design system, global navigation, a
signature CORE4 visual system, and a universal athlete profile. See
[`docs/UNIFIED-IQ-AUDIT.md`](docs/UNIFIED-IQ-AUDIT.md) for the feature audit and
merge decisions.
