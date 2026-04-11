# Design Brief — SHUBH SCHOOL ERP

**Concept:** Professional Indian school ERP with institutional credibility, trust-focused hierarchy, and mobile-first accessibility.

## Tone & Purpose
Authoritative institutional design for educators, administrators, and parents managing school operations across student information, fees, attendance, and timetables. Dual light/dark themes support accessibility and personal preference.

## Color Palette (OKLCH)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | L0.42 C0.18 H260 (Navy) | L0.72 C0.16 H260 (Light Navy) | CTAs, active states, section headers |
| Accent | L0.58 C0.16 H150 (Teal/Cyan) | L0.65 C0.15 H150 (Bright Cyan) | Highlights, badges, focus states |
| Destructive | L0.58 C0.22 H25 (Red) | L0.68 C0.19 H25 (Light Red) | Warnings, delete actions |
| Background | L0.98 C0.008 H260 (Off-white) | L0.12 C0.01 H260 (Navy-black) | Page canvas |
| Card | L0.99 C0.004 H260 (Pure white) | L0.16 C0.012 H260 (Navy-grey) | Contained sections, modules |
| Sidebar | — | L0.14 C0.012 H260 (Dark Navy) | Left navigation bar |

## Typography
- **Display:** Space Grotesk (bold, geometric, leadership messaging)
- **Body:** Plus Jakarta Sans (warm, accessible, readable at all sizes)
- **Mono:** JetBrains Mono (code, receipt numbers, structured data)
- **Hierarchy:** Display-lg (32/40px), Display-md (28/32px), Text-base (16px), Text-sm (14px), Label (12px)

## Structural Zones

| Zone | Light | Dark | Details |
|------|-------|------|---------|
| Header | bg-card border-b border-border | bg-card border-b border-sidebar-border | Session switcher, user menu, logo |
| Sidebar | — | bg-sidebar text-sidebar-foreground | Navigation, modules, teal accent links |
| Content | bg-background | bg-background | Main module grid, cards, forms |
| Cards | bg-card shadow-card | bg-card shadow-card | Modules, data tables, input groups |
| Footer | bg-muted/30 border-t border-border | bg-muted/30 border-t border-sidebar-border | Inline help, legal links |

## Spacing & Rhythm
Fluid density: 8px base unit with 1rem (16px) section gutters. Cards use 16–24px internal padding. Tight form groups (8px gap), loose section gaps (24px). Mobile-first: full-width cards with 16px edge margin; 768px+ flex grid.

## Component Patterns
- **Buttons:** Navy primary (fill), teal accent (secondary), minimal destructive. Rounded 6px, 8–12px padding, 14px font.
- **Forms:** Subtle input borders (0.5px), light focus ring in primary color, inline error labels in destructive red.
- **Tables:** Striped rows with muted alternation, sticky headers, action icons in accent color.
- **Modals:** Elevated shadow, scrim overlay (rgba 0 0 0 / 20%), smooth slide-up animation.

## Motion Choreography
Default smooth transition: 300ms cubic-bezier(0.4, 0, 0.2, 1). Fade-in on page load, slide-up on modals, pulse-soft for live indicators. No bounce or elastic easing.

## Signature Detail
**Navy sidebar with teal-cyan accent links** creates a modern, distinctive institutional aesthetic. Teal button accents and badge highlights provide visual relief and draw attention to critical actions (fees due, mark attendance). Combined with clean typography and subtle shadows, this establishes a premium SaaS aesthetic for school management.

## Differentiation
Unlike generic admin dashboards (grey-blue-white), SHUBH uses a bold navy primary backed by teal accents. The sidebar is intentionally dark to create visual separation and reduce cognitive load for long-session users. This aesthetic signals professionalism and trustworthiness appropriate for educational institutions managing sensitive student/financial data.

## Constraints & Rules
- **No color mixing:** All colors use OKLCH values in CSS variables; no hex literals or arbitrary color classes.
- **Dark mode parity:** All light-mode tokens have dark-mode equivalents with maintained contrast ratios.
- **Mobile-first:** All breakpoints scale from 320px (mobile) to 1920px (desktop).
- **Accessibility:** WCAG AA+ contrast on all text; minimum 44px touch targets; focus rings visible on keyboard navigation.
- **PWA ready:** System fonts fall back gracefully; all bundled fonts load via font-display: swap.

---

**Files:** `src/frontend/src/index.css` (tokens, fonts), `src/frontend/tailwind.config.js` (Tailwind integration), `.platform/design/preview-*.jpg` (visual reference)
