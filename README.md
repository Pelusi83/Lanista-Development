# Lanista Development

Lanista Sports — athlete development platform. Marketing site + the unified
**LANISTA IQ** athlete intelligence dashboard for Players, Coaches, and Admins.

Deployed on **Vercel** (static assets + serverless functions).

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
