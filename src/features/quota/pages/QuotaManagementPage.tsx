"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/shared/components/Topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { useQuotaAggregates } from "@/features/quota/hooks/useQuotaAggregates";
import { QuotaKpiCards } from "@/features/quota/components/QuotaKpiCards";
import { QuotaCharts } from "@/features/quota/components/QuotaCharts";
import {
  QuotaCustomersTable,
  QUOTA_MUTATION_ROLES,
} from "@/features/quota/components/QuotaCustomersTable";
import { QuotaHistoryTable } from "@/features/quota/components/QuotaHistoryTable";
import { PaymentDialog } from "@/features/quota/components/PaymentDialog";
import { TopUpDialog } from "@/features/quota/components/TopUpDialog";
import type { Customer, UserRole } from "@/shared/types";

const VIEW_ROLES: UserRole[] = ["ADMIN", "OPS_MANAGER", "SALES", "DISPATCHER"];

export default function QuotaManagementPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const autoResetMonthlyIfDue = useDataStore((s) => s.autoResetMonthlyIfDue);
  const { kpis, typeDistribution, topUsage, allTransactions, customers } =
    useQuotaAggregates();

  const [paymentTarget, setPaymentTarget] = useState<Customer | null>(null);
  const [topupTarget, setTopupTarget] = useState<Customer | null>(null);

  useEffect(() => {
    autoResetMonthlyIfDue();
  }, [autoResetMonthlyIfDue]);

  useEffect(() => {
    if (!user) return;
    if (!VIEW_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const canMutate = !!user && QUOTA_MUTATION_ROLES.includes(user.role);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  if (!user || !VIEW_ROLES.includes(user.role)) return null;

  return (
    <>
      <Topbar title="Quản lý hạn mức" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Tổng quan hạn mức khách hàng</h2>
            <p className="text-sm text-muted-foreground">
              Theo dõi sử dụng, công nợ và lịch sử biến động hạn mức của {kpis.customersTotal} khách hàng.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="mr-3">
              Cảnh báo: <span className="font-semibold text-warning">{kpis.customersWarning}</span>
            </span>
            <span>
              Nguy hiểm: <span className="font-semibold text-destructive">{kpis.customersDanger}</span>
            </span>
          </div>
        </div>

        <QuotaKpiCards kpis={kpis} />
        <QuotaCharts typeDistribution={typeDistribution} topUsage={topUsage} />

        <Tabs defaultValue="overview" className="space-y-3">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan KH</TabsTrigger>
            <TabsTrigger value="alerts">
              Cảnh báo ({kpis.customersWarning + kpis.customersDanger})
            </TabsTrigger>
            <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <QuotaCustomersTable
              customers={customers}
              canMutate={canMutate}
              onPay={(c) => setPaymentTarget(c)}
              onTopUp={(c) => setTopupTarget(c)}
            />
          </TabsContent>

          <TabsContent value="alerts">
            <QuotaCustomersTable
              customers={customers}
              defaultLevelFilter="warn"
              canMutate={canMutate}
              onPay={(c) => setPaymentTarget(c)}
              onTopUp={(c) => setTopupTarget(c)}
            />
          </TabsContent>

          <TabsContent value="history">
            <QuotaHistoryTable
              transactions={allTransactions}
              customerOptions={customerOptions}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PaymentDialog
        open={!!paymentTarget}
        onOpenChange={(o) => !o && setPaymentTarget(null)}
        customer={paymentTarget}
      />
      <TopUpDialog
        open={!!topupTarget}
        onOpenChange={(o) => !o && setTopupTarget(null)}
        customer={topupTarget}
      />
    </>
  );
}
