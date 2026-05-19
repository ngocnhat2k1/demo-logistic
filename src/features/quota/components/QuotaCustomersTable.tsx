"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Search,
  Wallet,
  Plus,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import {
  quotaInUse,
  quotaLabel,
  quotaLevelColor,
  quotaUsageRatio,
} from "@/features/orders/domain/quota";
import { formatKg } from "@/shared/utils";
import type { Customer, QuotaType, UserRole } from "@/shared/types";
import { useDataStore } from "@/shared/stores/data";

type LevelFilter = "ALL" | "ok" | "warn" | "danger";
type TypeFilter = "ALL" | QuotaType;
type SortKey = "USAGE_DESC" | "OUTSTANDING_DESC" | "NAME_ASC";

interface QuotaCustomersTableProps {
  customers: Customer[];
  defaultLevelFilter?: LevelFilter;
  canMutate: boolean;
  onPay: (c: Customer) => void;
  onTopUp: (c: Customer) => void;
}

const TYPE_VARIANT: Record<QuotaType, "default" | "secondary" | "outline"> = {
  POSTPAID: "outline",
  MONTHLY: "secondary",
  PREPAID: "default",
};

export function QuotaCustomersTable({
  customers,
  defaultLevelFilter = "ALL",
  canMutate,
  onPay,
  onTopUp,
}: QuotaCustomersTableProps) {
  const resetMonthlyQuota = useDataStore((s) => s.resetMonthlyQuota);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(defaultLevelFilter);
  const [sortBy, setSortBy] = useState<SortKey>("USAGE_DESC");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = customers.filter((c) => {
      if (typeFilter !== "ALL" && c.quota.type !== typeFilter) return false;
      if (levelFilter !== "ALL" && quotaLevelColor(c.quota) !== levelFilter) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    });

    result.sort((a, b) => {
      if (sortBy === "NAME_ASC") return a.name.localeCompare(b.name);
      if (sortBy === "OUTSTANDING_DESC") {
        return (b.quota.outstanding ?? 0) - (a.quota.outstanding ?? 0);
      }
      return quotaUsageRatio(b.quota) - quotaUsageRatio(a.quota);
    });
    return result;
  }, [customers, search, typeFilter, levelFilter, sortBy]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên / mã / SĐT"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Loại hạn mức" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả loại</SelectItem>
            <SelectItem value="POSTPAID">Thanh toán sau</SelectItem>
            <SelectItem value="MONTHLY">Theo tháng</SelectItem>
            <SelectItem value="PREPAID">Trả trước</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Mức cảnh báo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả mức</SelectItem>
            <SelectItem value="ok">Bình thường</SelectItem>
            <SelectItem value="warn">Cảnh báo</SelectItem>
            <SelectItem value="danger">Nguy hiểm</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USAGE_DESC">% sử dụng giảm dần</SelectItem>
            <SelectItem value="OUTSTANDING_DESC">Công nợ giảm dần</SelectItem>
            <SelectItem value="NAME_ASC">Tên A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Khách hàng</th>
                <th className="px-3 py-2 font-medium">Loại</th>
                <th className="px-3 py-2 font-medium text-right">Hạn mức</th>
                <th className="px-3 py-2 font-medium text-right">Đã dùng</th>
                <th className="px-3 py-2 font-medium text-right">Giữ chỗ</th>
                <th className="px-3 py-2 font-medium text-right">Công nợ</th>
                <th className="px-3 py-2 font-medium min-w-[180px]">% sử dụng</th>
                <th className="px-3 py-2 font-medium">Cảnh báo</th>
                <th className="px-3 py-2 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    Không có khách hàng phù hợp
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const isPostpaid = c.quota.type === "POSTPAID";
                const level = quotaLevelColor(c.quota);
                const ratio = quotaUsageRatio(c.quota);
                const inUse = quotaInUse(c.quota);

                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.code}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={TYPE_VARIANT[c.quota.type]}>{quotaLabel(c.quota)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isPostpaid ? "—" : formatKg(c.quota.limit)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatKg(c.quota.used)}</td>
                    <td className="px-3 py-2 text-right">
                      {formatKg(c.quota.reserved ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isPostpaid ? formatKg(c.quota.outstanding ?? 0) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {isPostpaid ? (
                        <span className="text-xs text-muted-foreground">Không giới hạn</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(100, ratio * 100)}
                            className="h-2 w-[100px]"
                            indicatorClassName={
                              level === "danger"
                                ? "bg-destructive"
                                : level === "warn"
                                ? "bg-warning"
                                : "bg-primary"
                            }
                          />
                          <span className="text-xs text-muted-foreground w-9 text-right">
                            {Math.round(ratio * 100)}%
                          </span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {isPostpaid ? null : `${formatKg(inUse)} / ${formatKg(c.quota.limit)}`}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <LevelBadge level={level} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RowActions
                        customer={c}
                        canMutate={canMutate}
                        onPay={onPay}
                        onTopUp={onTopUp}
                        onReset={() => {
                          resetMonthlyQuota(c.id);
                          toast.success(`Đã reset hạn mức tháng cho ${c.name}`);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hiển thị {filtered.length} / {customers.length} khách hàng
      </p>
    </div>
  );
}

function LevelBadge({ level }: { level: "ok" | "warn" | "danger" }) {
  if (level === "danger") return <Badge variant="destructive">Nguy hiểm</Badge>;
  if (level === "warn") return <Badge variant="warning">Cảnh báo</Badge>;
  return <Badge variant="success">Bình thường</Badge>;
}

interface RowActionsProps {
  customer: Customer;
  canMutate: boolean;
  onPay: (c: Customer) => void;
  onTopUp: (c: Customer) => void;
  onReset: () => void;
}

function RowActions({ customer, canMutate, onPay, onTopUp, onReset }: RowActionsProps) {
  const isPostpaid = customer.quota.type === "POSTPAID";
  const isMonthly = customer.quota.type === "MONTHLY";
  const isPrepaid = customer.quota.type === "PREPAID";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canMutate && isPostpaid && (
          <DropdownMenuItem onSelect={() => onPay(customer)}>
            <Wallet className="h-4 w-4 mr-2" /> Ghi nhận thanh toán
          </DropdownMenuItem>
        )}
        {canMutate && isPrepaid && (
          <DropdownMenuItem onSelect={() => onTopUp(customer)}>
            <Plus className="h-4 w-4 mr-2" /> Nạp thêm hạn mức
          </DropdownMenuItem>
        )}
        {canMutate && isMonthly && (
          <DropdownMenuItem onSelect={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset tháng
          </DropdownMenuItem>
        )}
        {canMutate && (isPostpaid || isPrepaid || isMonthly) && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link href={`/customers/${customer.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" /> Xem chi tiết KH
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const QUOTA_MUTATION_ROLES: UserRole[] = ["ADMIN", "OPS_MANAGER", "SALES"];
