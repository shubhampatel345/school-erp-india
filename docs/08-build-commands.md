# Build Commands — SHUBH SCHOOL ERP

Developer reference for local setup, building, and deployment.

---

## Prerequisites

```bash
node --version    # v18+ required
pnpm --version    # v8+ recommended

# Install pnpm if not installed:
npm install -g pnpm
```

---

## Clone & Install

```bash
# Clone repository
git clone https://github.com/shubhampatel345/school-erp-india
cd school-erp-india

# Install all dependencies
pnpm install
```

---

## Local Development

```bash
# Start frontend dev server
cd src/frontend
pnpm dev
# Opens at: http://localhost:5173
# Hot reload is active — changes reflect instantly
```

---

## Type Check & Lint

```bash
cd src/frontend

# TypeScript type check (no errors = ready to build)
pnpm typecheck

# Lint + auto-fix (ESLint + Prettier)
pnpm fix
```

---

## Production Build

```bash
cd src/frontend
pnpm build

# Output: src/frontend/dist/
# Contains: index.html, assets/, manifest.json
# Upload contents of dist/ to public_html/ on cPanel
```

---

## Preview Production Build Locally

```bash
cd src/frontend
pnpm preview
# Opens at: http://localhost:4173
# Serves the built dist/ folder exactly as it will on cPanel
```

---

## Project Structure

```
school-erp-india/
├── src/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/     # Shared UI (Layout, shadcn/ui wrappers)
│   │   │   ├── context/        # AppContext: auth, sessions, notifications
│   │   │   ├── pages/          # One file per module page
│   │   │   │   ├── fees/       # Fees sub-pages
│   │   │   │   ├── hr/         # HR sub-pages
│   │   │   │   └── settings/   # Settings sub-tabs
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   └── utils/
│   │   │       ├── localStorage.ts  # ls() helper, MONTHS, CLASSES
│   │   │       └── whatsapp.ts      # wacoder.in API integration
│   │   ├── public/
│   │   │   ├── manifest.json   # PWA manifest
│   │   │   ├── sw.js           # Service worker
│   │   │   └── assets/
│   │   │       ├── fonts/      # Web fonts (SpaceGrotesk, PlusJakartaSans)
│   │   │       └── icons/      # App icons (192x192, 512x512)
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   ├── vite.config.js
│   │   └── package.json
│   └── backend/                # Motoko backend (Internet Computer)
│       └── Main.mo
├── docs/                       # Markdown documentation files
│   ├── 01-getting-started.md
│   ├── 02-deploy-cpanel.md
│   ├── 03-whatsapp-setup.md
│   ├── 04-biometric-essl-setup.md
│   ├── 05-backup-restore.md
│   ├── 06-pwa-install.md
│   ├── 07-roles-permissions.md
│   └── 08-build-commands.md
└── README.md
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/frontend/src/App.tsx` | Router + provider wrappers |
| `src/frontend/src/context/AppContext.tsx` | Global state: auth, sessions, notifications |
| `src/frontend/src/utils/localStorage.ts` | `ls()` helper, shared constants (MONTHS, CLASSES) |
| `src/frontend/src/utils/whatsapp.ts` | wacoder.in API integration |
| `src/frontend/src/pages/Fees.tsx` | Main fees module |
| `src/frontend/src/pages/Students.tsx` | Student information module |
| `src/frontend/src/pages/Attendance.tsx` | Attendance + QR scanner + Welcome Display |
| `src/frontend/src/index.css` | OKLCH design tokens + custom utilities |
| `src/frontend/tailwind.config.js` | Tailwind configuration |
| `src/frontend/public/manifest.json` | PWA manifest (app name, icons, display) |
| `src/frontend/public/sw.js` | Service worker (offline cache) |

---

## Environment Setup Notes

- No `.env` file is required — all configuration is done within the ERP's Settings module
- The WhatsApp API keys are stored in `localStorage` under `shubh_erp_settings`
- The frontend is purely client-side — no backend server call is needed for the static app
- The Motoko backend (`src/backend/`) is for Internet Computer deployment (optional — the static build works standalone)

---

## Dependency Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Vite | 5.x | Build tool |
| shadcn/ui | latest | Component library |
| lucide-react | latest | Icons |
| motion/react | latest | Animations |
| @tanstack/react-query | 5.x | Server state management |
| react-icons | latest | Brand icons |
