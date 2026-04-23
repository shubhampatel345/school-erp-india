# SHUBH SCHOOL ERP — Design Brief

**Concept:** Institutional authority for Indian school management — fast, clean, data-dense with dark navy sidebar + cyan accents.

## Visual Direction
Purpose-built SaaS for educators, admins, parents managing 20+ school operations (students, fees, attendance, HR, transport, inventory, library, exams, chat). Tone: trust-focused, modern premium. Navy primary enforces focus; cyan accents highlight critical actions (fees due, sync status, mark attendance). Dark sidebar reduces cognitive load. No decoration — only functional visual hierarchy. Currency: INR ₹. Class order: Nursery→LKG→UKG→Class 1–12. Session: April–March.

## Color Palette (OKLCH)

| Token | Value | Purpose |
|-------|-------|---------|
| **Primary** | L0.3 C0.12 H260 (Navy) | CTAs, headers, active states |
| **Accent** | L0.55 C0.14 H200 (Cyan) | Highlights, badges, actions |
| **Success** | L0.7 C0.16 H142 (Green) | Fees paid, attendance, positive |
| **Warning** | L0.72 C0.15 H70 (Amber) | Fees due, absent, alerts |
| **Destructive** | L0.56 C0.22 H25 (Red) | Delete, discontinue, critical |
| **Sidebar** | L0.15 C0.05 H265 (Deep Navy) | Left nav, always dark (critical) |
| **Background** | L0.98 C.006 H260 | Page canvas |
| **Card** | L1 C0 H0 | Modules, forms, sections |

## Typography
- **Display:** Space Grotesk — bold geometric; section headers, module titles
- **Body:** Plus Jakarta Sans — accessible 14–16px; prose, forms, tables, UI copy
- **Mono:** JetBrains Mono — receipt IDs, transaction codes, structured data
- **Scale:** 40px Display-lg, 32px Display-md, 18px Base, 14px Small, 12px Label

## Structural Zones

| Zone | Treatment |
|------|-----------|
| **Header** | bg-card border-b, session switcher, search bar, user menu, notification bell |
| **Sidebar** | bg-sidebar (0.15/0.05/265) text-sidebar-foreground, sticky, teal accent links, Z-30 |
| **Content** | bg-background, padding 24px mobile / 32px desktop, modules in cards with shadows |
| **Cards** | bg-card shadow-card rounded-md, 16–24px internal padding, 24px gaps |
| **Mobile Nav** | Fixed bottom, 5 tabs (Dashboard, Students, Fees, Attendance, Menu), unread badges |

## Spacing & Component Rules
- 8px base unit. Form gaps: 12px. Tables: 12px rows, 8px cell padding. Cards: 24px gutters. Buttons: 8–12px padding, 6px radius. No spinners on amount inputs — all plain text with `inputMode=decimal`. Mobile-first 320px→1920px responsive. Sidebar hidden mobile, drawer on tap.

## Component Patterns
**Buttons:** Navy bg, white text; teal secondary; red destructive. Rounded 6px, 8–12px padding, smooth transitions, no shadow. **Forms:** 1px borders, focus rings in primary, error text in red. **Tables:** Alternating row bg, sticky headers, action icons in accent. **Badges:** Inline status (paid=green, due=amber, absent=red). **Modals:** bg-popover, scrim, shadow-elevated, slide-up 250ms. **Mobile nav:** Fixed bottom, 5 tabs, unread badges, safe-area padding.

## Motion & Animations
- Default: all 250ms cubic-bezier(0.4, 0, 0.2, 1)
- Fade-in: 250ms (page load, modals)
- Slide-up: 250ms (drawer, modal entrance)
- Pulse-soft: 2s infinite (sync checkmark, pending badges)
- No bounce, elastic, or scatter — orchestrated, intentional only

## 10 Color Themes
1. **Navy Blue** (default) — L0.3 C0.12 H260 primary + L0.55 C0.14 H200 cyan accent
2. **Deep Ocean** — L0.36 C0.16 H230 + L0.58 C0.18 H175
3. **Forest Green** — L0.34 C0.12 H145 + L0.62 C0.18 H100
4. **Sunset Rose** — L0.4 C0.18 H350 + L0.6 C0.22 H25
5. **Dark Night** — L0.6 C0.18 H285 + L0.55 C0.2 H285 (full dark mode)
6. **Slate Gray** — L0.38 C0.1 H240 + L0.55 C0.12 H220
7. **Royal Purple** — L0.42 C0.2 H295 + L0.65 C0.22 H295
8. **Copper Bronze** — L0.48 C0.14 H55 + L0.62 C0.18 H60
9. **Cherry Red** — L0.45 C0.22 H15 + L0.6 C0.22 H30
10. **Midnight Teal** — L0.45 C0.14 H195 + L0.65 C0.18 H185

All themes: **dark sidebar (0.15 C0.05 H265) always present** — non-negotiable for readability. Themes persist in localStorage (`shubh_erp_theme`). Selection in Settings → Theme Selector.

## Constraints & Differentiation
- **OKLCH only:** All colors via `oklch(var(--token))`. No hex, rgb, or arbitrary colors.
- **Sidebar dark always:** L0.15 C0.05 H265 on every theme — ensures readable text, enforces focus.
- **No spinners:** All number inputs plain text with `inputMode=decimal` — consistent with user preference.
- **Mobile-first PWA:** 320px→1920px responsive. Sidebar hidden mobile, drawer on tap. Bottom nav, installable, offline support, safe-area padding.
- **Accessibility:** WCAG AA+ contrast (L-diff ≥0.7), 44px min touch, visible focus rings, reduced-motion support.
- **Fonts:** Space Grotesk + Plus Jakarta Sans via bundled .woff2 (offline). JetBrains Mono for data.
- **Signature:** Dark navy sidebar + cyan accents create institutional authority for educational SaaS. Color-coded status (green=paid, amber=due, red=critical). Purpose-built for Indian schools managing sensitive data.

---

**Files:** `src/frontend/src/index.css` (OKLCH tokens, fonts), `src/frontend/tailwind.config.js` (Tailwind integration), `.platform/design/preview-*.jpg`
