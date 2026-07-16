# LANISTA IQ — Unified Dashboard Audit & Merge Plan

This document captures the audit of the two existing dashboard experiences and
the decisions made when merging them into a single unified LANISTA IQ platform
(`/iq`).

## 1. What existed

| Surface | Route | Summary |
| --- | --- | --- |
| **Original Player Dashboard** | `/player` | Single-role (player) tabbed dashboard. Overview, Athletic, Skillset (Pitcher/Hitter), Mentality, Dev Plan, Resources. Player card + GameChanger highlights, weekly check-in, floating Gladius AI. Clean "border-top gold card" visual language. |
| **Dashboard 2.0 (Platform v2.0)** | `/dashboard` | Multi-role (Player / Coach / Admin) with a role switcher. Adds gamification (XP, levels, streaks, badges, challenges, leaderboards), a coach command center (team overview, roster, mentality heatmap, dev plans, resources), and an admin backend (users, site health, content hub, gamification admin). Modern token-based design system, info tooltips, toasts. |

Both shared: gold/black brand, Barlow + Barlow Condensed type, Chart.js, an
`/api/chat` Gladius integration, and the Athletic / Skillset / Mentality → LS4
data model.

## 2. Feature inventory & disposition

Legend: **KEEP** · **IMPROVE** · **MERGE** · **RELOCATE** · **REMOVE**

### Player
| Feature | From | Decision | Notes |
| --- | --- | --- | --- |
| Player header (identity, scores) | both | **MERGE + IMPROVE** | One premium header with avatar, identity chips, Lanista IQ + LS4, streak, and a profile-completion ring. |
| Overview KPIs | both | **MERGE** | Reduced to 3–5 primary KPIs ("less, but better"). |
| CORE4 snapshot | new | **IMPROVE** | New signature layered-ring visual (see §3). |
| Athletic / Skillset / Mentality detail | both | **KEEP + RELOCATE** | Consolidated under a single **Performance** page (Athletic / Pitching / Hitting segments) so the home stays a decision layer. |
| Dev plan / goals | both | **KEEP + IMPROVE** | Reframed as ranked **Development Priorities** with "why it matters" + recommended action. |
| Weekly check-in (Likert) | both | **KEEP** | Unified single modal. |
| Player card + highlights | player | **KEEP** | Moved into **Reports**; PDF/email/copy/coach + GameChanger links preserved. |
| Recommended next actions | new | **ADD** | Master-prompt requirement — always show the next best action. |
| XP / levels / badges / challenges | 2.0 | **IMPROVE (de-emphasize)** | Streak/level kept as subtle engagement signals; heavy gamification chrome removed to keep a "premium intelligence" tone. |
| Gladius AI | both | **MERGE** | One floating assistant, role-aware context, same `/api/chat`. |

### Coach
| Feature | From | Decision |
| --- | --- | --- |
| Team intelligence overview | 2.0 | **KEEP + IMPROVE** (team CORE4 radar + averages) |
| Athlete Attention Center | new/2.0 | **ADD** — auto-surfaces rising/falling/overdue athletes |
| Roster table | 2.0 | **IMPROVE → Team Matrix** (sortable/filterable by CORE4 & performance) |
| Athlete profile drill-in | 2.0 | **KEEP** — click any athlete → profile drawer |
| Player comparison | new | **ADD** — radar overlay of two athletes |
| Mentality heatmap / dev plans / resources | 2.0 | **KEEP + RELOCATE** into unified nav |

### Admin
| Feature | From | Decision |
| --- | --- | --- |
| Platform KPIs (athletes/coaches/orgs/teams) | new/2.0 | **IMPROVE** |
| Users / Health / Content | 2.0 | **KEEP** (Platform Management page) |
| Org → Team → Athlete drill-down | new | **ADD** — required progressive disclosure |
| CORE4 distribution + org comparison + activity | new | **ADD** |
| Gamification admin | 2.0 | **REMOVE** from primary IA (kept out to reduce clutter; can return under Platform) |

## 3. The unified system

- **One design system**: shared tokens (surfaces, gold brand ramp, CORE4 hues),
  type scale (Barlow Condensed / Barlow / IBM Plex Mono), card system, spacing,
  and interaction patterns.
- **Global navigation shell**: a persistent sidebar that adapts its items by role
  (Player / Coach / Admin) plus a consistent topbar (breadcrumb, search, Gladius).
- **Signature CORE4 visual**: four concentric layered score rings with the
  composite **Lanista IQ** at the center, plus per-dimension cards that drill into
  the underlying metrics — used consistently across player, coach, and admin.
- **Universal athlete profile**: Overview · CORE4 · Performance · Development ·
  Reports · Profile — reused for the player's own profile and for coach/admin
  drill-in (drawer).
- **Every page follows**: *What is happening? → Why does it matter? → What next?*

## 4. CORE4 naming decision

The master prompt defines CORE4 as **Talent · Character · Mentality · Alignment**,
while the shipped product data model is **Athletic · Skillset · Mentality → LS4**.

Decision: adopt the master-prompt CORE4 as the signature scorecard and map the
existing data underneath, preserving all real metrics:

- **Talent** ← on-field skill + athletic performance (exit velo, pitch velo, arm, speed)
- **Character** ← coachability, effort, grit, leadership
- **Mentality** ← confidence, focus, composure, resilience, stress
- **Alignment** ← development-plan follow-through, check-in consistency, coach fit, engagement

**LS4 / Lanista IQ** remains the composite. Detailed Athletic / Pitching / Hitting
metrics are fully preserved under the **Performance** page — no functionality lost.

## 5. Preserved integrations / routes

- `/player` and `/dashboard` remain live for reference and rollback.
- `/api/chat` (Gladius, Anthropic Claude) and `/api/auth` are unchanged in contract.
- The new experience is additive at `/iq`; the marketing site now links to it as
  the primary "Lanista IQ" destination.
