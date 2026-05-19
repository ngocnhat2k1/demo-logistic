"use client";

import { useMemo } from "react";
import { useDataStore } from "@/shared/stores/data";
import { quotaUsageRatio } from "@/features/orders/domain/quota";
import type { Customer, QuotaTransaction, QuotaType } from "@/shared/types";

export interface QuotaKpis {
  totalLimit: number;
  totalReserved: number;
  totalUsed: number;
  totalOutstanding: number;
  customersTotal: number;
  customersWarning: number;
  customersDanger: number;
}

export interface TypeDistributionItem {
  type: QuotaType;
  label: string;
  count: number;
}

export interface TopUsageItem {
  id: string;
  name: string;
  code: string;
  ratio: number;
  inUseKg: number;
  limitKg: number;
}

export interface HistoryItem extends QuotaTransaction {
  customerId: string;
  customerName: string;
  customerCode: string;
}

const TYPE_LABEL: Record<QuotaType, string> = {
  POSTPAID: "Thanh toán sau",
  MONTHLY: "Theo tháng",
  PREPAID: "Trả trước",
};

export interface QuotaAggregates {
  kpis: QuotaKpis;
  typeDistribution: TypeDistributionItem[];
  topUsage: TopUsageItem[];
  allTransactions: HistoryItem[];
  customers: Customer[];
}

export function useQuotaAggregates(): QuotaAggregates {
  const customers = useDataStore((s) => s.customers);

  return useMemo<QuotaAggregates>(() => {
    let totalLimit = 0;
    let totalReserved = 0;
    let totalUsed = 0;
    let totalOutstanding = 0;
    let customersWarning = 0;
    let customersDanger = 0;

    const typeCount: Record<QuotaType, number> = {
      POSTPAID: 0,
      MONTHLY: 0,
      PREPAID: 0,
    };

    const topUsageRaw: TopUsageItem[] = [];
    const allTransactions: HistoryItem[] = [];

    for (const c of customers) {
      const q = c.quota;
      typeCount[q.type] += 1;

      if (q.type !== "POSTPAID") {
        totalLimit += q.limit;
        topUsageRaw.push({
          id: c.id,
          name: c.name,
          code: c.code,
          ratio: quotaUsageRatio(q),
          inUseKg: (q.reserved ?? 0) + q.used,
          limitKg: q.limit,
        });
      } else {
        totalOutstanding += q.outstanding ?? 0;
      }

      totalReserved += q.reserved ?? 0;
      totalUsed += q.used;

      const inUse = (q.reserved ?? 0) + q.used;
      if (q.type === "POSTPAID") {
        const outstanding = q.outstanding ?? 0;
        if (outstanding >= 50_000) customersDanger += 1;
        else if (outstanding >= 30_000) customersWarning += 1;
      } else if (q.limit > 0) {
        const r = inUse / q.limit;
        if (r >= 1) customersDanger += 1;
        else if (r >= 0.85) customersWarning += 1;
      }

      for (const tx of q.history) {
        allTransactions.push({
          ...tx,
          customerId: c.id,
          customerName: c.name,
          customerCode: c.code,
        });
      }
    }

    const typeDistribution: TypeDistributionItem[] = (
      Object.keys(typeCount) as QuotaType[]
    ).map((t) => ({ type: t, label: TYPE_LABEL[t], count: typeCount[t] }));

    const topUsage = topUsageRaw
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    allTransactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      kpis: {
        totalLimit,
        totalReserved,
        totalUsed,
        totalOutstanding,
        customersTotal: customers.length,
        customersWarning,
        customersDanger,
      },
      typeDistribution,
      topUsage,
      allTransactions,
      customers,
    };
  }, [customers]);
}
