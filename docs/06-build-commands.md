# Build Commands — Developer Reference

## Prerequisites

```bash
node --version   # v18+ required
pnpm --version   # v8+ recommended

# Install pnpm if needed:
npm install -g pnpm
```

## Setup & Local Development

```bash
# Clone repository
git clone https://github.com/shubhampatel345/school-erp-india
cd school-erp-india

# Install all dependencies
pnpm install

# Start frontend dev server
cd src/frontend
pnpm dev
# Opens at http://localhost:5173
```

## Type Check & Lint

```bash
cd src/frontend

# TypeScript type check (no emit)
pnpm typecheck

# Auto-fix ESLint + Prettier issues
pnpm fix
```

## Production Build

```bash
cd src/frontend
pnpm build
# Output: src/frontend/dist/
# Upload dist/ contents to public_html/ on cPanel
```

## Project Structure

```
src/frontend/src/
├── components/           # Shared UI components
│   ├── Layout.tsx        # App shell with sidebar, header
│   ├── Sidebar.tsx       # Navigation sidebar
│   └── ui/               # shadcn/ui component library
├── context/
│   └── AppContext.tsx    # Auth, sessions, notifications
├── hooks/
│   └── useQueries.ts     # React Query / data hooks
├── pages/                # One file per module
│   ├── settings/         # Settings sub-tabs
│   ├── fees/             # Fees sub-tabs
│   ├── hr/               # HR sub-tabs
│   ├── academics/        # Academics sub-tabs
│   └── ...
├── types/
│   └── index.ts          # All TypeScript interfaces
└── utils/
    ├── localStorage.ts   # ls(), MONTHS, CLASSES, generateId etc.
    └── whatsapp.ts       # WhatsApp API integration (wacoder.in)
```

## Key Utilities

- `ls.get(key, fallback)` — Read from localStorage with prefix
- `ls.set(key, value)` — Write to localStorage with prefix
- `generateId()` — Generate unique ID
- `MONTHS` — Indian academic year months (April → March)
- `CLASSES` — All class names including Nursery, LKG, UKG, 1-12
- `sendWhatsApp(phone, message)` — Send via wacoder.in API

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | localStorage (no backend) |
| Build | Vite |
| Icons | Lucide React |
| Fonts | Space Grotesk, Plus Jakarta Sans |
