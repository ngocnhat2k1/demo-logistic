# Feature: Fleet (Đội xe)

## Mô tả

Feature quản lý đội xe, tài xế và hãng vận chuyển (carrier). Cho phép xem, lọc và theo dõi trạng thái toàn bộ phương tiện.

## Chức năng chính

- Tab Xe: danh sách xe với trạng thái AVAILABLE/BUSY/MAINTENANCE, tải trọng, tài xế hiện tại
- Tab Tài xế: thông tin tài xế, GPLX, trạng thái, xe đang lái
- Tab Hãng vận chuyển: danh sách carrier, số xe, liên hệ
- Tìm kiếm và lọc nhanh theo tab

## Cấu trúc

```
fleet/
  pages/
    FleetPage.tsx  — Tabs xe/tài xế/carrier
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — vehicles, drivers, carriers
- `@/shared/types` — Vehicle, Driver, Carrier
- `@/shared/utils` — formatKg

## Lưu ý

Trang Fleet hiện là read-only. Bản production cần thêm CRUD xe, gán tài xế và quản lý lịch bảo dưỡng.
