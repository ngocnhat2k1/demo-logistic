# Feature: Returns (Đơn trả hàng)

## Mô tả

Feature quản lý các đơn hàng bị trả lại: theo dõi lý do, khối lượng, trạng thái xử lý và hoàn tất trả hàng.

## Chức năng chính

- Danh sách đơn trả hàng với mã trả, đơn gốc, khách hàng, lý do
- Hiển thị trạng thái: PENDING_RETURN / RETURNING / COMPLETED
- Nút "Hoàn tất" để đánh dấu đơn trả đã xử lý xong
- Liên kết đến đơn gốc

## Lý do trả hàng được hỗ trợ

- CUSTOMER_REJECTED — KH từ chối nhận
- NO_CONTACT — Không liên lạc được
- WRONG_ADDRESS — Sai địa chỉ
- DAMAGED_GOODS — Hàng hư hỏng
- CUSTOMER_REQUEST — KH yêu cầu trả
- VEHICLE_BREAKDOWN — Xe sự cố

## Cấu trúc

```
returns/
  pages/
    ReturnsPage.tsx  — Danh sách đơn trả
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — returns, orders, customers
- `@/shared/utils` — formatKg

## Lưu ý

Đơn trả được tạo tự động bởi `reportDeliveryFailure` trong data store khi tài xế báo giao thất bại. Quota khách hàng được hoàn lại khi đơn trả hoàn tất.
