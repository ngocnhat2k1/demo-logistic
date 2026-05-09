# Feature: Orders (Đơn hàng)

## Mô tả

Feature quản lý toàn bộ vòng đời đơn hàng logistics: tạo, xem, cập nhật trạng thái, nhập Excel, và quản lý hạn mức khách hàng.

## Chức năng chính

- Danh sách đơn hàng với lọc theo trạng thái, tìm kiếm, phân trang
- Chi tiết đơn: timeline trạng thái, thông tin pickup/dropoff, lịch sử sự kiện, split đơn
- Tạo đơn mới với kiểm tra hạn mức realtime
- Import đơn hàng từ file Excel (SheetJS/xlsx)
- 12 trạng thái FSM: NEW → PENDING_DISPATCH → DISPATCHED → PICKED_UP → IN_TRANSIT → DELIVERED / DELIVERY_FAILED → RETURN_PROCESSING → RETURNING → RETURNED

## Cấu trúc

```
orders/
  domain/
    orderStatus.ts    — Labels, badge variants, hàm transition
    quota.ts          — checkQuota, consumeQuota, refundQuota, quotaLevelColor, quotaLabel
  components/
    StatusBadge.tsx   — Badge hiển thị trạng thái đơn
    CreateOrderDialog.tsx — Dialog tạo đơn nhanh với quota check
  pages/
    OrderListPage.tsx   — Danh sách tất cả đơn
    OrderDetailPage.tsx — Chi tiết + split đơn
    OrderNewPage.tsx    — Form tạo đơn mới
    OrderImportPage.tsx — Import Excel
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — Store chính
- `@/shared/types` — OrderStatus, Order, QuotaInfo
- `@/shared/utils` — formatKg, formatVnd

## Lưu ý

Logic nghiệp vụ quota (POSTPAID/MONTHLY/PREPAID) nằm trong `domain/quota.ts`. Chỉ domain này được phép thao tác với `customer.quota`.
