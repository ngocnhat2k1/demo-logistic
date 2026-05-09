# Feature: Reports (Báo cáo)

## Mô tả

Feature báo cáo thống kê vận hành: đơn hàng theo ngày, hiệu suất tài xế, phân bố trạng thái và sử dụng hạn mức khách hàng.

## Chức năng chính

- Biểu đồ đường: đơn hàng 7 ngày (tổng / đã giao / thất bại)
- Biểu đồ cột ngang: top 10 tài xế theo số đơn hoàn thành
- Biểu đồ tròn: phân bố trạng thái đơn hàng
- Bảng hạn mức khách hàng sắp xếp theo mức sử dụng giảm dần

## Cấu trúc

```
reports/
  pages/
    ReportsPage.tsx  — Tất cả báo cáo trên một trang
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — orders, drivers, customers
- `recharts` — LineChart, BarChart, PieChart, ResponsiveContainer

## Lưu ý

Tất cả số liệu tính toán trực tiếp từ store. Không có export PDF/Excel trong bản demo. Bản production nên thêm bộ lọc ngày tháng và export dữ liệu.
