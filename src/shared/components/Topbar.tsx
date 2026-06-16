"use client";

import { useState } from "react";
import { Bell, AlertTriangle, Menu, Check } from "lucide-react";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { WarehouseSwitcher } from "@/features/warehouses/components/WarehouseSwitcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function Topbar({ title }: { title: string }) {
  const notifications = useDataStore((s) => s.notifications);
  const markAllRead = useDataStore((s) => s.markAllRead);
  const sosAll = useDataStore((s) => s.sos);
  const vehicles = useDataStore((s) => s.vehicles);
  const resolveSos = useDataStore((s) => s.resolveSos);
  const sos = sosAll.filter((s) => !s.resolved);
  const unread = notifications.filter((n) => !n.read).length;
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-3 md:px-6 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-1 shrink-0"
          aria-label="Mở menu"
          onClick={openMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <WarehouseSwitcher />
        {sos.length > 0 && (
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            className="flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground animate-pulse"
          >
            <AlertTriangle className="h-4 w-4" />
            SOS: {sos.length}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center px-1 text-[10px]">
                  {unread}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Thông báo
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">Không có thông báo</p>
              )}
              {notifications.slice(0, 15).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
                  <div className="flex w-full items-start gap-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      n.severity === "destructive" ? "bg-destructive" :
                      n.severity === "warning" ? "bg-warning" :
                      n.severity === "success" ? "bg-success" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(n.createdAt), "HH:mm dd/MM", { locale: vi })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Cảnh báo SOS ({sos.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {sos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Không có cảnh báo nào đang mở.
              </p>
            )}
            {sos.map((s) => {
              const v = vehicles.find((x) => x.id === s.vehicleId);
              return (
                <div key={s.id} className="rounded-md border border-destructive/40 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">
                        {v?.driverName ?? "?"} • xe {v?.plateNumber ?? "?"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(s.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })} •
                        {" "}
                        {s.location.lat.toFixed(4)}, {s.location.lng.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveSos(s.id)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Đã xử lý
                    </Button>
                  </div>
                  {s.message && (
                    <p className="text-sm whitespace-pre-wrap">{s.message}</p>
                  )}
                  {s.photos && s.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {s.photos.map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={p} target="_blank" rel="noreferrer" className="aspect-square block rounded overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p} alt={`SOS ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
