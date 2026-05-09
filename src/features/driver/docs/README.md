# Feature: Driver (Tài xế)

## Mô tả

Ứng dụng mobile-first dành cho tài xế: xem đơn được phân công, cập nhật trạng thái giao hàng, ký nhận điện tử (POD), báo thất bại và gửi cảnh báo SOS khẩn cấp.

## Chức năng chính

- Trang chủ: hiển thị xe hiện tại và các đơn cần giao
- Danh sách tất cả đơn của tài xế
- Chi tiết đơn: địa chỉ pickup/dropoff, khối lượng, nút hành động theo trạng thái
- Luồng giao hàng: DISPATCHED → Lấy hàng → PICKED_UP → Bắt đầu giao → IN_TRANSIT → Giao thành công / Thất bại
- POD: canvas chữ ký người nhận (Proof of Delivery)
- Báo thất bại: chọn lý do, ghi chú, (mock) chụp ảnh
- SOS: nhấn giữ 2 giây để gửi cảnh báo khẩn cấp đến điều độ

## Cấu trúc

```
driver/
  pages/
    DriverHomePage.tsx        — Trang chủ tài xế
    DriverOrdersPage.tsx      — Danh sách tất cả đơn
    DriverOrderDetailPage.tsx — Chi tiết đơn + POD + báo thất bại
    DriverSOSPage.tsx         — Nút SOS khẩn cấp
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — orders, vehicles, customers, completeDelivery, reportDeliveryFailure, raiseSos
- `@/features/auth/stores/auth` — currentUser (lấy driverId)
- `@/features/orders/components/StatusBadge` — hiển thị trạng thái
- `@/shared/types` — ReturnReason

## Lưu ý

Trang driver được route riêng tại `/driver/*`. Middleware tự động redirect người dùng có role DRIVER vào đây. Layout driver (`src/app/driver/layout.tsx`) là mobile-first, không có sidebar admin.
