# Feature: Dispatch (Điều phối)

## Mô tả

Feature điều phối xe — giao đơn hàng cho tài xế/xe thông qua bảng kéo thả (drag-and-drop) tích hợp bản đồ Leaflet và gợi ý AI.

## Chức năng chính

- Bảng Kanban kéo thả đơn hàng vào xe (dnd-kit)
- Hiển thị vị trí xe thời gian thực trên bản đồ Leaflet
- Modal gợi ý AI: chọn top 3 xe tốt nhất theo thuật toán điểm số
- Lọc xe theo trạng thái (AVAILABLE/BUSY)
- Xác nhận điều phối → cập nhật trạng thái đơn → DISPATCHED

## Cấu trúc

```
dispatch/
  domain/
    dispatchHeuristic.ts  — suggestVehicles: score = distance×0.55 + capacity×0.3 + familiarity×0.15
  components/
    Board.tsx             — Bảng kéo thả chính + tích hợp map
    AISuggestModal.tsx    — Modal gợi ý xe AI
  pages/
    DispatchPage.tsx      — Wrapper page
  index.ts
```

## Phụ thuộc

- `@/shared/map` — MapCanvas (dynamic import, ssr:false)
- `@/shared/stores/data` — vehicles, orders, drivers
- `@/shared/types` — Vehicle, Order, LatLng
- `dnd-kit` — DnDContext, useDraggable, useDroppable

## Lưu ý

Leaflet PHẢI được import dynamic với `{ ssr: false }`. Map icons dùng inline data URI SVG để tránh lỗi đường dẫn asset của Next.js.
