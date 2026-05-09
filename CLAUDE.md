# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install --legacy-peer-deps   # required — peer-dep conflicts exist
npm run dev                      # http://localhost:3000
npm run build                    # production build
npm run lint                     # ESLint via Next.js
```

No test suite. Type-check manually with `npx tsc --noEmit`.

## Stack

- **Next.js 15** App Router, TypeScript strict
- **Tailwind CSS** + shadcn-style components (Radix UI primitives, located in `src/components/ui/`)
- **Zustand** stores with **idb-keyval** persistence (IndexedDB, namespace `logistic:v1:`)
- **Leaflet** + react-leaflet for maps (dynamic import with `ssr: false`)
- **XState v5** available but currently unused beyond `@xstate/react`
- **dnd-kit** for dispatch board drag-drop
- **Recharts** for reports
- **SheetJS (xlsx)** for Excel import

## Architecture

### Route groups

- `src/app/(admin)/` — all staff-facing pages (dashboard, orders, dispatch, fleet, customers, returns, reports, integrations)
- `src/app/driver/` — mobile-first driver app (order list, order detail with POD/signature, SOS)
- `src/app/login/` — 1-click demo login (no real auth)

### Auth & RBAC

Auth is simulated. `src/middleware.ts` reads a `dispatch_role` cookie and redirects:
- DRIVER → `/driver`; all others → admin routes
- No real session — `useAuthStore` (`src/lib/stores/auth.ts`) persists the current user to IndexedDB

Five roles: `ADMIN | OPS_MANAGER | DISPATCHER | SALES | DRIVER`

### State

Single large store in `src/lib/stores/data.ts` holds all entities (customers, vehicles, drivers, carriers, orders, returns, users, notifications, sos, cyberLog). It persists to IndexedDB via `src/lib/db/persist.ts`.

Key patterns:
- `_hasHydrated` flag gates UI rendering — `HydrationGate` blocks until both `authStore` and `dataStore` finish rehydrating
- `ensureSeeded()` bootstraps demo data from `src/lib/mock/seed.ts` (deterministic RNG)
- `resetAll()` wipes and re-seeds (sidebar "Reset Demo Data" button)

### Domain logic

All business logic lives in `src/lib/domain/`:
- `orderStatus.ts` — 12-state `OrderStatus` transition rules and audit event logging into `order.events[]`
- `quota.ts` — consume/refund/reset quota with full `QuotaTransaction` history
- `dispatchHeuristic.ts` — AI suggest: scores vehicles by `distance×0.55 + capacity×0.3 + driver familiarity×0.15`, returns top 3 with Vietnamese reason strings

### Realtime mock

`src/components/realtime/RealtimeProvider.tsx` — ticker fires every 3 s, moves BUSY vehicles along their pre-calculated `routePolyline` (built by `src/lib/mock/geo.ts`).

### Map

Leaflet must be dynamically imported with `{ ssr: false }`. Marker icons use inline data URIs to avoid Next.js asset-path issues with Leaflet's default icon loader.

### Types

All shared types in `src/types/index.ts` — single source of truth for entities, enums, and interfaces.

## POC constraints

- No real backend or database — all state lives in the browser's IndexedDB
- Auth cookie (`dispatch_role`) is set client-side on login; middleware enforces routing only
- GPS tracking, ERP sync (Cyber), SMS/Email notifications are all mock/heuristic
- Seed data: 4 carriers, 25 vehicles, 18 drivers, 15 customers, 60 orders across 7 days
