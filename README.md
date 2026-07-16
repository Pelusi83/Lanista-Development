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

| Name               | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `CLAUDE_API_KEY`   | Anthropic API key for the Gladius AI assistant   |
| `GLADIUS_PASSWORD` | Access code for the admin Gladius console        |
| `CLAUDE_MODEL`     | (optional) override the default Claude model     |

## LANISTA IQ

`/iq` merges the original Player Dashboard and Platform 2.0 into one cohesive,
role-adaptive experience with a shared design system, global navigation, a
signature CORE4 visual system, and a universal athlete profile. See
[`docs/UNIFIED-IQ-AUDIT.md`](docs/UNIFIED-IQ-AUDIT.md) for the feature audit and
merge decisions.
