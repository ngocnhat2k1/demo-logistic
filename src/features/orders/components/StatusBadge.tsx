import { Badge } from "@/shared/ui/badge";
import type { OrderStatus } from "@/shared/types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/features/orders/domain/orderStatus";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS_VARIANT[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
