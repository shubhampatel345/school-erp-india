# SCHOOL LEDGER ERP — Design Brief

**Concept:** Professional institutional authority for Indian school management — fast, clean, data-dense interface with dark navy primary + cyan accent.

## Visual Direction
Authoritative design for educators, admins, parents managing 20+ school operations (students, fees, attendance, HR, transport, inventory). Tone: trust-focused, modern SaaS premium. Context: Indian schools with INR ₹ currency, class structure Nursery→LKG→UKG→1–12, April–March session year. Dark sidebar reduces cognitive load during long admin sessions. Cyan accents highlight critical actions (fees due, mark attendance). No decoration — only functional visual hierarchy.

## Color Palette (OKLCH)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| **Primary** | L0.3 C0.12 H260 (Navy) | L0.72 C0.14 H260 (Light Navy) | CTAs, headers, active states, sidebar links |
| **Accent** | L0.55 C0.14 H200 (Cyan/Teal) | L0.65 C0.15 H200 (Bright Cyan) | Highlights, badges, action emphasis, tab focus |
| **Success** | L0.55 C0.18 H142 (Green) | L0.7 C0.16 H142 (Light Green) | Fees paid, attendance present, positive status |
| **Warning** | L0.68 C0.18 H70 (Amber) | L0.72 C0.15 H70 (Gold) | Fees due, absent, cautions, alerts |
| **Destructive** | L0.56 C0.22 H25 (Red) | L0.68 C0.2 H25 (Light Red) | Discontinue, delete, critical actions |
| **Background** | L0.98 C0.006 H260 (Off-white) | L0.12 C0.01 H260 (Navy-black) | Canvas, page background |
| **Card** | L1 C0 H0 (Pure white) | L0.16 C0.012 H260 (Navy-grey) | Modules, data sections, forms |
| **Sidebar** | — | L0.1 C0.04 H260 (Deep Navy) | Left navigation, always dark |

## Typography
- **Display:** Space Grotesk — bold geometric geometric; section headers, module titles, leadership messaging
- **Body:** Plus Jakarta Sans — warm, accessible, readable at 14px–16px; all prose, forms, tables, UI copy
- **Mono:** JetBrains Mono — receipt numbers, transaction IDs, data codes, structured ledger entries
- **Hierarchy:** 40px/Display-lg (hero), 32px/Display-md (section), 18px/Text-base (body), 14px/Text-sm (detail), 12px/Label (inline info)

## Structural Zones

| Zone | Light | Dark | Treatment |
|------|-------|------|-----------|
| **Header** | bg-card border-b-1 border-border | bg-card border-b-1 border-sidebar-border | Session, search, user menu. Elevation: shadow-card |
| **Sidebar** | hidden | bg-sidebar text-sidebar-foreground, teal accent links | Left nav, collapsible on mobile. Z-index 30. Sticky. |
| **Content** | bg-background | bg-background | Main module area. Padding 24px mobile / 32px desktop. |
| **Card sections** | bg-card shadow-card rounded-md | bg-card shadow-card rounded-md | Modules, grids, student info. Padding 16–24px. Gaps 24px. |
| **Footer** | bg-muted/30 border-t border-border | bg-muted/30 border-t border-sidebar-border | Legal, help links. Padding 16px. |

## Spacing & Density
8px base unit. Sections: 24px gutters. Card internal: 16–24px. Form rows: 12px gap. Mobile-first: 16px edge margin on cards; 768px+: flex 2–3 col grid. Tables: 12px row height, 8px cell padding. Compact hierarchy for data-heavy interfaces (20+ modules, student grids with 1000s of rows).

## Component Patterns
- **Buttons:** Navy bg (`--primary`), white text; teal accent (`--secondary`); destructive red. Rounded 6px. 8–12px padding. 14px font. Smooth transition. No shadow.
- **Forms:** 1px input borders (`--input`), focus ring in primary, error text in destructive. Placeholder: muted-foreground.
- **Tables:** Alternating row bg (card/muted), sticky headers, action icons in accent. Striped for visual separation.
- **Badges/Pills:** Inline status (fees paid: green, due: amber, absent: red). Rounded-full, 8px padding, 12px font.
- **Modals:** bg-popover, scrim (rgba 0 0 0 / 20%), shadow-elevated, slide-up 250ms ease-out.
- **Mobile nav:** Fixed bottom, 5 tabs (icon + label), unread red pill badges, safe-area-inset-bottom padding.

## Motion & Animation
- Default: all 250ms cubic-bezier(0.4, 0, 0.2, 1)
- Page load: fade-in 250ms
- Modals/drawers: slide-up 250ms
- Status indicators: pulse-soft 2s infinite (green sync checkmark, pending badges)
- No bounce, no elastic, no scatter. Orchestrated, intentional choreography.

## Signature Detail
**Dark navy sidebar + cyan-accented links** creates institutional authority and visual separation from light content area. Cyan badges on fees due, green checkmarks on sync, amber warnings on absences — color-coded status without iconography. Combined with tight spacing, monospace transaction numbers, and subtle shadows, this aesthetic signals premium SaaS for educational data stewardship.

## Differentiation
Rejects generic admin dashboards (grey-blue-white uniformity). Navy primary + cyan accent + success/warning colors create a distinctive, purpose-built visual system for schools. Dark sidebar enforces focus, reduces fatigue. Structured spacing and typography hierarchy support data-dense UIs (1184 students, 36 staff, 20+ modules). Result: professional, fast, trustworthy — appropriate for institutions managing sensitive student/financial records.

## Constraints & Rules
- **OKLCH only:** All colors via `oklch(var(--token))`. No hex, no `rgb()`, no arbitrary colors.
- **Dark mode parity:** Every light token has dark equivalent; contrast ≥ 0.7 L-difference.
- **Mobile-first:** 320px → 1920px responsive. Sidebar hidden mobile, drawer on tap.
- **Accessibility:** WCAG AA+ contrast, 44px min touch, visible focus rings, reduced-motion support.
- **Fonts:** Space Grotesk + Plus Jakarta Sans via bundled .woff2; JetBrains Mono for data. `font-display: swap` for PWA offline support.
- **No gradients, no gloss:** Flat colors + precise layering + subtle shadows for depth.

## Chat System (WhatsApp-style)

### Overview
The chat system enables real-time messaging between users (teachers, students, parents, admins) with auto-generated group chats for class sections and transport routes. Mobile UI mirrors WhatsApp UX: full-screen conversations, bottom input bar, left/right message bubbles, and unread badges.

### Key Components

#### 1. **Chat Data Models**
- `Message`: { id, chatId, senderId, senderName, senderRole, content, timestamp, read }
- `Chat`: { id, type, name, participants[], lastMessage, unreadCount, metadata }
- `ChatType`: 'direct' | 'class_group' | 'route_group'

#### 2. **Chat List View (Desktop & Mobile)**
- Lists all chats sorted by most recent message
- Unread badge (red pill) on chat avatar
- Last message preview text
- Participant count or recipient name
- Click to open conversation
- Mobile: Full-width list; Desktop: 320px sidebar on left

#### 3. **Conversation View (Full-screen Mobile)**
- **Header:** Back arrow (mobile), chat name, participant count, mute toggle
- **Message Bubbles:**
  - Sent (right-aligned, primary blue): `--primary` background, white text
  - Received (left-aligned, muted gray): `--muted` background, `--foreground` text
  - Timestamps show on hover/tap
- **Input Bar (Fixed Bottom):**
  - Text input field (multiline support, 200px min mobile)
  - Send button (paper plane icon, primary color)
  - Padding: 16px from bottom navigation on mobile
  - Z-index: 40 (above message list)

#### 4. **Auto-Generated Groups**
- **Class Groups:** Auto-created for each class/section combo (e.g., "Class 2-A Group")
  - Members: teachers, students in that class, admins
  - Auto-populated on first sync
- **Route Groups:** Auto-created for each transport route (e.g., "Route Metro Group")
  - Members: drivers, parents, admins
  - Auto-populated when routes created/updated

#### 5. **Direct Messages**
- One-to-one chats initiated by clicking on any user profile
- Auto-create on first message
- Shows user role badge (Teacher, Parent, Student, etc.)

#### 6. **Mobile Navigation**
- New "Chat" tab in bottom navigation (5th icon after Menu)
- Unread count badge on Chat icon (red pill with white number)
- Tapping Chat opens full-screen chat list
- Tapping a chat opens full-screen conversation

### UI/UX Rules

#### **Spacing & Sizing**
- Message bubbles: 12px padding, 8px gap between messages
- Chat list items: 16px padding, 12px gap
- Input bar: 16px gutter on mobile, 24px on desktop
- Mobile bottom nav padding: pb-20 for input bar clearance

#### **Colors**
- **Sent messages:** `bg-primary text-primary-foreground` (Navy/Light-Navy)
- **Received messages:** `bg-muted text-foreground` (Light-gray/Dark-gray)
- **Unread badge:** `bg-destructive text-white` (Red)
- **Timestamps:** `text-muted-foreground text-xs` (Subtle gray)
- **Active chat highlight:** `bg-secondary` light background, `border-l-4 border-primary`

#### **Typography**
- **Message text:** 14px / body font (Plus Jakarta Sans)
- **Chat name:** 16px bold / display font
- **Participant info:** 12px / muted foreground
- **Timestamp:** 12px / muted foreground

#### **Animations**
- Message slide-in: 200ms fade + 50px translate
- Chat list reorder on new message: instant reorder, smooth scroll
- Send button pulse on click: 100ms scale feedback
- Unread badge pulse: soft opacity animation

#### **Mobile-Specific**
- Full-screen on mobile (no sidebar, 100vw)
- Conversation header sticky at top (z-40)
- Input bar sticky at bottom (z-40)
- Messages scroll area: `calc(100vh - header - input - nav)` height
- Swipe-to-dismiss on chat bubbles (optional enhancement)

### Storage & Persistence
- **LocalStorage keys:**
  - `chats`: Array of Chat objects
  - `messages`: Record<chatId, Message[]>
  - `chat_unread_{userId}`: Track per-user unread state
- **No backend sync required initially** (can be added later via Motoko)
- Auto-persist on every message send/read

### Integration Points

#### **In App.tsx**
```tsx
const [activePage, setActivePage] = useState("dashboard");

// Add to renderPage():
if (activePage === "chat") return <Chat />;
```

#### **In Layout.tsx / MobileNav.tsx**
- Add 5th tab: "Chat" with unread badge
- Route to activePage="chat" on tap

#### **In Dashboard.tsx**
- Add "Recent Chats" card widget (optional)
- Show unread count in header

#### **Data Sync with Students/Transport**
- On mount: Check if class/section groups exist → auto-create missing ones
- When new student added: Add to relevant class group
- When new route added: Auto-create route group

---

**Files:** `src/frontend/src/index.css` (tokens, fonts), `src/frontend/tailwind.config.js` (Tailwind integration), `.platform/design/preview-*.jpg` (visual reference)

### Chat System Implementation Files to Create

**Core Chat Logic:**
- `src/frontend/src/utils/chatService.ts` — Chat data management (CRUD, search, unread tracking)
- `src/frontend/src/context/ChatContext.tsx` — Chat state + actions (useChat hook)

**Components:**
- `src/frontend/src/components/chat/ChatList.tsx` — List of all chats (desktop sidebar + mobile full-screen)
- `src/frontend/src/components/chat/ChatConversation.tsx` — Message bubbles + input bar (full-screen on mobile)
- `src/frontend/src/components/chat/MessageBubble.tsx` — Single message bubble (sent/received styling)
- `src/frontend/src/components/chat/ChatInputBar.tsx` — Text input + send button (fixed bottom on mobile)
- `src/frontend/src/components/chat/ChatHeader.tsx` — Conversation header (name + participant count + back arrow)

**Pages:**
- `src/frontend/src/pages/Chat.tsx` — Main chat page (dispatches to list or conversation view)

**Mobile Navigation:**
- Update `src/frontend/src/components/MobileNav.tsx` — Add Chat tab (5th position) with unread badge

**Integration:**
- Update `src/frontend/src/App.tsx` — Add chat route
- Update `src/frontend/src/pages/Dashboard.tsx` — Add chat widgets/unread count
