# Lanista Development

Lanista Sports — athlete development platform. Marketing site + the unified
**LANISTA IQ** athlete intelligence dashboard for Players, Coaches, and Admins.

Deployed as a Cloudflare Worker with static assets.

## Structure

```
public/
  index.html      Marketing site            ->  /
  iq.html         Unified LANISTA IQ         ->  /iq        (NEW – Player/Coach/Admin)
  player.html     Legacy Player Dashboard    ->  /player    (kept for reference)
  dashboard.html  Legacy Platform 2.0        ->  /dashboard (kept for reference)
src/
  worker.js       Router + Gladius AI proxy (/api/chat, /api/auth)
wrangler.toml     Cloudflare Worker config
```

## Develop

```bash
npm install
npm run dev        # wrangler dev
```

## Deploy

```bash
npm run deploy     # wrangler deploy
```

### Secrets

```bash
wrangler secret put CLAUDE_API_KEY      # Anthropic key for Gladius AI
wrangler secret put GLADIUS_PASSWORD    # admin Gladius console access code
```

## LANISTA IQ

`/iq` merges the original Player Dashboard and Platform 2.0 into one cohesive,
role-adaptive experience with a shared design system, global navigation, a
signature CORE4 visual system, and a universal athlete profile. See
[`docs/UNIFIED-IQ-AUDIT.md`](docs/UNIFIED-IQ-AUDIT.md) for the feature audit and
merge decisions.
