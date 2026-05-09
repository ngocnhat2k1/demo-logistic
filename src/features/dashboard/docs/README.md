# Feature: Dashboard

## Mô tả

Trang tổng quan cho nhân viên điều phối và quản lý vận hành, hiển thị các chỉ số KPI và biểu đồ thống kê theo thời gian thực.

## Chức năng chính

- KPI cards: đơn chờ điều phối, đang vận chuyển, đã giao, cần xử lý
- Biểu đồ đường: đơn hàng 7 ngày qua (tổng vs đã giao)
- Biểu đồ cột: top 8 tài xế theo số đơn hoàn thành
- Danh sách hạn mức khách hàng (top 8) với progress bar màu cảnh báo

## Cấu trúc

```
dashboard/
  pages/DashboardPage.tsx  — Toàn bộ UI dashboard
  index.ts                 — Public API
```

## Phụ thuộc

- `@/shared/stores/data` — Dữ liệu orders, vehicles, customers, drivers
- `@/features/orders/domain/quota` — `quotaLevelColor` để tô màu cảnh báo hạn mức
- `recharts` — LineChart, BarChart, ResponsiveContainer

## Lưu ý

Dữ liệu được tính toán trực tiếp từ store Zustand. Không có API call thực. Tất cả tính toán xảy ra trên client.
