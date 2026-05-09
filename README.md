# Hệ thống Quản lý Điều độ & Phương tiện GTVT — Demo POC

Demo POC ứng dụng quản lý logistics đường bộ — đầy đủ end-to-end từ tạo đơn → phân xe → giao → trả hàng. Đặc tả gốc cover 13 modules nghiệp vụ; demo này hiện thực hóa tất cả ở mức có thể trình diễn cho khách.

> **POC Notice**: Đây là proof-of-concept để show flow nghiệp vụ và năng lực UX/AI. Không có backend thật, không có DB thật. Toàn bộ dữ liệu lưu trong IndexedDB của trình duyệt và có thể reset bằng nút "Reset Demo Data" trong sidebar.

## Stack

- **Framework**: Next.js 14 App Router + TypeScript strict
- **UI**: Tailwind CSS + shadcn-style components (Radix UI primitives)
- **State**: Zustand + idb-keyval (persist sang IndexedDB)
- **Maps**: Leaflet + OpenStreetMap (free, không cần API key)
- **Charts**: Recharts
- **Drag-drop**: dnd-kit
- **Excel**: SheetJS (xlsx)
- **AI**: Heuristic-only (scoring local — distance + capacity + driver familiarity)

## Modules đã implement

| # | Module | Trạng thái |
|---|---|---|
| 1 | Auth + RBAC (5 role, 1-click login) | ✅ |
| 2 | Customers + Quota (3 loại: POSTPAID / MONTHLY / PREPAID) + audit trail | ✅ |
| 3 | Orders CRUD + Excel import + Cyber mock sync + 12-state lifecycle | ✅ |
| 4 | Pre-dispatch validation (quota check + Manager override) | ✅ |
| 5 | Dispatch Board (drag-drop + AI suggest + tách đơn) | ✅ |
| 6 | Fleet (vehicles, drivers, 4 carriers TTM/VNA/DXP/Backup) | ✅ |
| 7 | Returns (delivery failed → return + tự động hoàn hạn mức) | ✅ |
| 8 | Tracking + GPS mock realtime (di chuyển 3s/tick) | ✅ |
| 9 | Driver App responsive (POD signature, fail/complete) | ✅ |
| 10 | Emergency SOS (hold-to-confirm 2s) | ✅ |
| 11 | Notifications (in-app bell + toast + dropdown) | ✅ |
| 12 | Cyber ERP Sync (mock) | ✅ |
| 13 | Reports (3 charts: orders/day, top drivers, status pie) | ✅ |

## Chạy local

```bash
npm install --legacy-peer-deps
npm run dev
```

Mở `http://localhost:3000`.

## Tài khoản demo (1-click login)

| Vai trò | Mô tả |
|---|---|
| **Admin** | Toàn quyền hệ thống |
| **Quản lý vận hành** | Giám sát + báo cáo + override quota |
| **Điều độ viên** | Phân xe, theo dõi đơn (UI chính) |
| **Kinh doanh** | Tạo đơn cho KH |
| **Tài xế** | App di động (giả lập) — UI mobile-first |

## Kịch bản demo gợi ý (~15 phút)

1. Login as **Dispatcher** → Dashboard (3 chart, 4 KPI cards).
2. `/customers` — chú ý 1-2 KH có hạn mức ≥85% (vàng) và 1 KH 100% (đỏ).
3. `/orders/new` — tạo đơn lớn cho KH gần đầy → cảnh báo vượt hạn mức.
4. `/orders/import` — click "Load demo data" → 8 đơn vào ngay.
5. `/integrations/cyber` — bấm "Pull đơn mới" → 5 đơn xuất hiện sau 1.5s.
6. `/dispatch` — kéo thả đơn vào xe; click AI gợi ý xe; tách đơn lớn.
7. Mở tab thứ 2 → `/login` as **Driver** → home thấy đơn vừa dispatched.
8. Driver: Đã lấy hàng → Bắt đầu giao → Xác nhận giao (chữ ký) hoặc Báo thất bại.
9. Quay lại admin: notification, return order auto-tạo, quota refunded.
10. Driver `/driver/sos` — hold 2s → admin có alert đỏ.
11. `/reports` — 3 chart đầy đủ.
12. Sidebar → "Reset Demo Data" → seed sạch.

## Thiết kế

- **Seed dữ liệu**: 4 carriers, 25 vehicles, 18 drivers, 15 customers (mix 3 loại quota), 60 orders rải đều 12 status với 7 ngày history. Deterministic mulberry32 RNG.
- **Realtime mock**: 1 ticker 3s di chuyển vehicles BUSY theo polyline đã pre-calculated từ pickup → dropoff.
- **AI heuristic**: scoring `distance×0.55 + capacity×0.3 + driver familiarity×0.15`. Trả về top 3 xe + lý do tiếng Việt.
- **State machine**: 12 OrderStatus, transitions log vào `events[]` (audit trail).
- **Quota**: tự refund khi giao thất bại / huỷ; `consumeQuota` khi giao thành công; `resetMonthlyQuota` cho loại MONTHLY.
- **Hydration**: `<HydrationGate>` block UI cho đến khi cả auth + data store rehydrate xong từ IndexedDB.
- **Map**: Leaflet dynamic import `ssr:false`, marker icons inline data URI để tránh asset-path issues.

## Out-of-scope (nói rõ với khách)

- Auth thật (chỉ login giả với cookie)
- Database thật (IndexedDB only)
- SMS/Email thật (chỉ in-app notifications)
- GPS device vật lý (Bình Anh) — sẽ có doc tích hợp riêng
- Multi-tenant, audit log đầy đủ, backup/restore

## Deploy lên Vercel

```bash
npx vercel --prod
```

Không cần env vars. Build clean.
