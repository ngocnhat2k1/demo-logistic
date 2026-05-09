"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useDataStore } from "@/shared/stores/data";

export default function AdminUsersPage() {
  const users = useDataStore((s) => s.users);

  return (
    <>
      <Topbar title="Quản trị / Người dùng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          {users.length} tài khoản. Đây là danh sách read-only của demo. Bản production sẽ có CRUD đầy đủ + permission matrix.
        </p>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Họ tên</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3"><Badge>{u.role}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
