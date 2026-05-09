# Feature: Auth (Xác thực)

## Mô tả

Feature quản lý xác thực người dùng và phân quyền (RBAC) trong hệ thống điều phối logistics.

## Chức năng chính

- Đăng nhập 1-click theo vai trò (demo, không có backend thực)
- Lưu trạng thái người dùng vào IndexedDB qua Zustand (`idb-keyval`)
- Đồng bộ cookie `dispatch_role` để middleware Next.js điều hướng đúng route
- Hỗ trợ 5 vai trò: `ADMIN | OPS_MANAGER | DISPATCHER | SALES | DRIVER`

## Cấu trúc

```
auth/
  stores/auth.ts       — Zustand store: currentUser, login(), logout()
  pages/LoginPage.tsx  — Trang đăng nhập với các nút 1-click theo role
  index.ts             — Public API
```

## Phụ thuộc

- `@/shared/db/persist` — StateStorage adapter cho IndexedDB
- `@/shared/types` — Interface `User`, `UserRole`

## Lưu ý

- Auth chỉ là mock. Cookie được set client-side; không có JWT hay session thực.
- Middleware `src/middleware.ts` dùng cookie `dispatch_role` để redirect DRIVER → `/driver`.
