"use client";

import { useState } from "react";
import { Search, Plus, Pencil, Trash2, MapPin, Phone, Warehouse as WarehouseIcon } from "lucide-react";
import { toast } from "sonner";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { formatKg, cn } from "@/shared/utils";
import { WarehouseDialog } from "@/features/warehouses/components/WarehouseDialog";
import type { Warehouse, WarehouseType } from "@/shared/types";

type TabKey = "ALL" | WarehouseType;

const TAB_DEFS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "MAIN", label: "Kho tổng" },
  { key: "SATELLITE", label: "Kho vệ tinh" },
  { key: "TRANSIT", label: "Trung chuyển" },
];

const TYPE_LABEL: Record<WarehouseType, string> = {
  MAIN: "Kho tổng",
  SATELLITE: "Kho vệ tinh",
  TRANSIT: "Trung chuyển",
};

export default function WarehouseListPage() {
  const warehouses = useDataStore((s) => s.warehouses);
  const toggleWarehouseStatus = useDataStore((s) => s.toggleWarehouseStatus);
  const deleteWarehouse = useDataStore((s) => s.deleteWarehouse);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const counts: Record<TabKey, number> = {
    ALL: warehouses.length,
    MAIN: warehouses.filter((w) => w.type === "MAIN").length,
    SATELLITE: warehouses.filter((w) => w.type === "SATELLITE").length,
    TRANSIT: warehouses.filter((w) => w.type === "TRANSIT").length,
  };

  const filtered = warehouses.filter((w) => {
    if (tab !== "ALL" && w.type !== tab) return false;
    const t = q.toLowerCase().trim();
    if (!t) return true;
    return (
      w.name.toLowerCase().includes(t) ||
      w.code.toLowerCase().includes(t) ||
      w.location.address.toLowerCase().includes(t) ||
      (w.contactPhone?.includes(q) ?? false)
    );
  });

  function handleDelete(w: Warehouse) {
    if (!confirm(`Xoá kho "${w.name}"?`)) return;
    const res = deleteWarehouse(w.id);
    if (!res.ok) {
      toast.error(res.reason ?? "Không thể xoá kho");
      return;
    }
    toast.success(`Đã xoá kho ${w.name}`);
  }

  return (
    <>
      <Topbar title="Kho hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, mã, địa chỉ, SĐT..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="sm:flex-none" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm kho
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> kho
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="w-full grid grid-cols-4 sm:inline-flex sm:w-auto">
            {TAB_DEFS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">
                <span className="truncate">{t.label}</span>
                <span className="ml-1 text-xs text-muted-foreground">({counts[t.key]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Không có kho phù hợp
              </CardContent>
            </Card>
          )}
          {filtered.map((w) => (
            <Card key={w.id} className="hover:border-primary transition">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground">{w.code}</span>
                      <span className="font-semibold truncate">{w.name}</span>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{w.location.address}</span>
                    </p>
                    {w.contactPhone && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {w.contactPhone}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(w)} title="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(w)} title="Xoá">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TYPE_LABEL[w.type]}</Badge>
                  <button onClick={() => toggleWarehouseStatus(w.id)}>
                    <Badge variant={w.status === "ACTIVE" ? "success" : "secondary"}>
                      {w.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                    </Badge>
                  </button>
                  {w.capacityKg != null && (
                    <span className="text-xs text-muted-foreground">Sức chứa {formatKg(w.capacityKg)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kho</th>
                    <th className="px-4 py-3 font-medium">Loại</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Địa chỉ</th>
                    <th className="px-4 py-3 font-medium">Sức chứa</th>
                    <th className="px-4 py-3 font-medium">Liên hệ</th>
                    <th className="px-4 py-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Không có kho phù hợp
                      </td>
                    </tr>
                  )}
                  {filtered.map((w) => (
                    <tr key={w.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-muted-foreground">{w.code}</span>
                              <span className="font-semibold">{w.name}</span>
                            </div>
                            {w.operatingHours && (
                              <p className="text-xs text-muted-foreground">{w.operatingHours}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{TYPE_LABEL[w.type]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleWarehouseStatus(w.id)} title="Đổi trạng thái">
                          <Badge variant={w.status === "ACTIVE" ? "success" : "secondary"}>
                            {w.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{w.location.address}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.capacityKg != null ? formatKg(w.capacityKg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {w.contactName && <div>{w.contactName}</div>}
                        {w.contactPhone && <div>{w.contactPhone}</div>}
                        {!w.contactName && !w.contactPhone && "—"}
                      </td>
                      <td className={cn("px-2 py-3 text-right whitespace-nowrap")}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(w)} title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(w)} title="Xoá">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <WarehouseDialog open={addOpen} onOpenChange={setAddOpen} />
      <WarehouseDialog
        open={!!editing}
        warehouse={editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      />
    </>
  );
}
