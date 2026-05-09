# Feature: Customers (Khách hàng)

## Mô tả

Feature quản lý khách hàng doanh nghiệp, hạn mức vận chuyển (quota) và lịch sử giao dịch.

## Chức năng chính

- Danh sách khách hàng: tìm kiếm theo tên/mã/SĐT, hiển thị mức độ sử dụng hạn mức
- Chi tiết khách hàng: thông tin cơ bản, hạn mức theo loại (POSTPAID/MONTHLY/PREPAID)
- Tab đơn hàng: lịch sử các đơn của khách hàng
- Tab lịch sử biến động quota: các giao dịch CONSUME/REFUND/RESET
- Reset hạn mức tháng (MONTHLY quota)

## Cấu trúc

```
customers/
  pages/
    CustomerListPage.tsx    — Danh sách + tìm kiếm
    CustomerDetailPage.tsx  — Chi tiết + tabs quota/orders/history
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — customers, orders
- `@/features/orders/domain/quota` — quotaLevelColor, quotaLabel
- `@/features/orders/components/StatusBadge` — hiển thị trạng thái đơn
- `@/shared/utils` — formatKg

## Lưu ý

Logic nghiệp vụ quota được định nghĩa trong `orders/domain/quota.ts` (cross-feature dependency có chủ ý vì quota gắn liền với orders).
