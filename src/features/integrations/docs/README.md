# Feature: Integrations (Tích hợp)

## Mô tả

Feature tích hợp với hệ thống ERP bên ngoài. Hiện tại chỉ có tích hợp Cyber ERP (mock).

## Chức năng chính

- Hiển thị trạng thái kết nối với Cyber ERP
- Pull đơn hàng mới từ Cyber (giả lập: tạo 5 đơn ngẫu nhiên)
- Lịch sử đồng bộ: thời gian, loại, số lượng, kết quả
- Thông báo tới DISPATCHER/OPS_MANAGER khi sync thành công

## Cấu trúc

```
integrations/
  pages/
    CyberPage.tsx  — Trang tích hợp Cyber ERP
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — importCyberOrders, cyberLog, pushNotification

## Lưu ý

`importCyberOrders(n)` trong data store tạo n đơn hàng giả ngẫu nhiên và ghi vào `cyberLog`. Trong production, endpoint thực sẽ thay thế logic mock này. Hàm sync KH hiện bị disable (chỉ hỗ trợ pull đơn trong demo).
