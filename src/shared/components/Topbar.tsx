"use client";

import { Bell, AlertTriangle } from "lucide-react";
import { useDataStore } from "@/shared/stores/data";
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
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

export function Topbar({ title }: { title: string }) {
  const notifications = useDataStore((s) => s.notifications);
  const markAllRead = useDataStore((s) => s.markAllRead);
  const sosAll = useDataStore((s) => s.sos);
  const sos = sosAll.filter((s) => !s.resolved);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {sos.length > 0 && (
          <Link
            href="/dispatch"
            className="flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground animate-pulse"
          >
            <AlertTriangle className="h-4 w-4" />
            SOS: {sos.length}
          </Link>
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
    </header>
  );
}
