# Build Commands — Developer Reference

## Prerequisites

```bash
node --version   # v18+ required
pnpm --version   # v8+ recommended

# Install pnpm if needed:
npm install -g pnpm
```

---

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

---

## Type Check & Lint

```bash
cd src/frontend

# TypeScript type check (no emit — run before building)
pnpm typecheck

# Auto-fix ESLint + Prettier issues
pnpm fix
```

---

## Production Build

```bash
cd src/frontend
pnpm build

# Output: src/frontend/dist/
# Upload contents of dist/ to public_html/ on cPanel hosting
```

---

## Project Structure

```
src/frontend/src/
├── components/           # Shared UI components
│   ├── Layout.tsx        # App shell (sidebar + header + footer)
│   └── ui/               # shadcn/ui component library (read-only)
├── context/
│   └── AppContext.tsx    # Auth, sessions, notifications, global state
├── hooks/
│   └── useQueries.ts     # React Query / data hooks
├── pages/                # One file per module
│   ├── Documentation.tsx # This in-app guide
│   ├── Students.tsx
│   ├── Fees.tsx
│   ├── Attendance.tsx
│   ├── settings/         # Settings sub-tabs
│   ├── fees/             # Fees sub-tabs (Collect, Plan, Headings, Register...)
│   ├── hr/               # HR sub-tabs (Staff, Payroll, Leave)
│   └── academics/        # Academics sub-tabs
├── types/
│   └── index.ts          # All TypeScript interfaces (Student, Staff, Receipt...)
└── utils/
    ├── localStorage.ts   # ls() helper, MONTHS, CLASSES, generateId
    └── whatsapp.ts       # wacoder.in API integration

docs/                    # Markdown documentation files (this folder)
public/
├── manifest.json        # PWA manifest
├── sw.js                # Service worker (offline support)
└── assets/
    ├── fonts/           # SpaceGrotesk, PlusJakartaSans, JetBrainsMono
    └── icons/           # App icons (192×192, 512×512)
```

---

## Key Utilities

```typescript
// localStorage helpers (src/utils/localStorage.ts)
ls.get('students', [])               // Read with fallback
ls.set('students', studentArray)     // Write

// ID generation
generateId()                         // Returns unique string ID

// Academic year constants
MONTHS = ['April', 'May', 'June', 'July', 'August', 'September',
          'October', 'November', 'December', 'January', 'February', 'March']

CLASSES = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', ..., 'Class 12']

// WhatsApp API (src/utils/whatsapp.ts)
sendWhatsApp('919876543210', 'Fee receipt...')
// Returns: { success: boolean, error?: string }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State / Data | localStorage (browser-side, no external DB) |
| Build tool | Vite |
| Icons | Lucide React |
| Animations | motion/react |
| Fonts | Space Grotesk (display), Plus Jakarta Sans (body), JetBrains Mono |
| WhatsApp | wacoder.in REST API (HTTP outcalls) |
| QR Code | react-qr-code / QR scanner via camera API |
| PWA | Vite PWA plugin + custom service worker |

---

## Environment Notes

- No backend server required for basic operation
- All data stored in browser localStorage with `shubh_erp_` prefix
- WhatsApp API calls go directly to wacoder.in (CORS restriction in localhost/preview)
- Camera/QR scanner requires HTTPS (deploy to real domain, not localhost)
- PWA install requires HTTPS + valid manifest.json

---

## Vite Configuration Notes

The `vite.config.js` includes these critical settings for Caffeine preview iframe:

```js
server: {
  host: '0.0.0.0',
  allowedHosts: 'all',
  cors: true,
  hmr: {
    clientPort: 443,
    protocol: 'wss'
  }
}
```

Do not modify these settings — they are required for the live preview to function correctly.
