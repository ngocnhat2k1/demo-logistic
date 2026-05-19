# Feature: Admin (Quản trị)

## Mô tả

Feature quản trị hệ thống dành cho ADMIN: quản lý người dùng, vai trò và cài đặt hệ thống.

## Chức năng hiện tại

- Danh sách tất cả tài khoản người dùng (read-only trong demo)
- Hiển thị họ tên, email, vai trò (ADMIN/OPS_MANAGER/DISPATCHER/SALES/DRIVER/CUSTOMER)

## Chức năng dự kiến (production)

- CRUD người dùng: tạo, chỉnh sửa, vô hiệu hóa tài khoản
- Permission matrix: cấu hình quyền chi tiết theo vai trò
- Audit log: lịch sử thao tác của người dùng
- Cài đặt hệ thống: thông số điều phối, cảnh báo quota

## Cấu trúc

```
admin/
  pages/
    UsersPage.tsx  — Danh sách người dùng
  index.ts
```

## Phụ thuộc

- `@/shared/stores/data` — users
- `@/shared/types` — User, UserRole

## Lưu ý

Chỉ có role ADMIN mới được truy cập section này. Middleware và sidebar đều lọc theo role. Trong demo, danh sách user được seed từ `src/shared/mock/seed.ts`.
