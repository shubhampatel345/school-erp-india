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
