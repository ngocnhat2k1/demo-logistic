"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { formatKg } from "@/shared/utils";
import type { HistoryItem } from "@/features/quota/hooks/useQuotaAggregates";
import type { QuotaTransaction } from "@/shared/types";

type TxType = QuotaTransaction["type"];
type TxFilter = "ALL" | TxType;

interface QuotaHistoryTableProps {
  transactions: HistoryItem[];
  customerOptions: { id: string; name: string }[];
}

const TX_LABEL: Record<TxType, string> = {
  RESERVE: "Giữ chỗ",
  RELEASE: "Hoàn",
  CONSUME: "Tiêu thụ",
  PAYMENT: "Thanh toán",
  TOPUP: "Nạp thêm",
  RESET: "Reset",
  REFUND: "Hoàn (đổi/trả)",
};

function txVariant(type: TxType): "default" | "outline" | "secondary" | "success" | "warning" | "destructive" {
  switch (type) {
    case "RESERVE":
      return "default";
    case "RELEASE":
    case "PAYMENT":
    case "REFUND":
      return "success";
    case "CONSUME":
      return "secondary";
    case "TOPUP":
      return "warning";
    case "RESET":
      return "outline";
    default:
      return "outline";
  }
}

export function QuotaHistoryTable({ transactions, customerOptions }: QuotaHistoryTableProps) {
  const [typeFilter, setTypeFilter] = useState<TxFilter>("ALL");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(to).getTime() + 24 * 3600 * 1000 - 1 : null;
    return transactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (customerFilter !== "ALL" && tx.customerId !== customerFilter) return false;
      const ms = new Date(tx.createdAt).getTime();
      if (fromMs !== null && ms < fromMs) return false;
      if (toMs !== null && ms > toMs) return false;
      return true;
    });
  }, [transactions, typeFilter, customerFilter, from, to]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TxFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả loại GD</SelectItem>
            {(Object.keys(TX_LABEL) as TxType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TX_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Khách hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả khách hàng</SelectItem>
            {customerOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Từ</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-xs text-muted-foreground">đến</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Thời gian</th>
                <th className="px-3 py-2 font-medium">Khách hàng</th>
                <th className="px-3 py-2 font-medium">Loại</th>
                <th className="px-3 py-2 font-medium text-right">Khối lượng</th>
                <th className="px-3 py-2 font-medium">Lý do</th>
                <th className="px-3 py-2 font-medium">Đơn liên quan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              )}
              {filtered.slice(0, 500).map((tx) => (
                <tr key={tx.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/customers/${tx.customerId}`}
                      className="text-primary hover:underline"
                    >
                      {tx.customerName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{tx.customerCode}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={txVariant(tx.type)}>{TX_LABEL[tx.type]}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatKg(tx.amount)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{tx.reason}</td>
                  <td className="px-3 py-2">
                    {tx.orderId ? (
                      <Link
                        href={`/orders/${tx.orderId}`}
                        className="text-primary hover:underline font-mono text-xs"
                      >
                        Xem đơn
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length > 500
          ? `Hiển thị 500 / ${filtered.length} giao dịch (lọc thêm để xem chi tiết)`
          : `Tổng ${filtered.length} giao dịch`}
      </p>
    </div>
  );
}
