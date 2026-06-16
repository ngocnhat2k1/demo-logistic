"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Boxes } from "lucide-react";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { formatKg } from "@/shared/utils";
import { QuickAddProductDialog } from "@/features/products/components/QuickAddProductDialog";

export default function ProductListPage() {
  const products = useDataStore((s) => s.products);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t)
    );
  }, [products, q]);

  return (
    <>
      <Topbar title="Sản phẩm / SKU" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SKU, nhóm hàng..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="sm:flex-none" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> sản phẩm
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sản phẩm</th>
                    <th className="px-4 py-3 font-medium">Nhóm hàng</th>
                    <th className="px-4 py-3 font-medium">Đơn vị</th>
                    <th className="px-4 py-3 font-medium">TL/đơn vị</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        Chưa có sản phẩm
                      </td>
                    </tr>
                  )}
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Boxes className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                            <p className="font-medium">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3">{p.unit}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatKg(p.unitWeightKg)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>
                          {p.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <QuickAddProductDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
