"use client";
import type { ResultCard } from "../../types";
import { OrderResultCard } from "./OrderResultCard";
import { VehicleResultCard } from "./VehicleResultCard";
import { SuggestionResultCard } from "./SuggestionResultCard";
import { EventTimelineCard } from "./EventTimelineCard";
import { KpiDeltaCard } from "./KpiDeltaCard";
import { AlertListCard } from "./AlertListCard";
import { MiniMapCard } from "./MiniMapCard";

export function CardRenderer({ card }: { card: ResultCard }) {
  switch (card.kind) {
    case "orders":
      return <OrderResultCard card={card} />;
    case "vehicles":
      return <VehicleResultCard card={card} />;
    case "suggestion":
      return <SuggestionResultCard card={card} />;
    case "timeline":
      return <EventTimelineCard card={card} />;
    case "kpi":
      return <KpiDeltaCard card={card} />;
    case "alerts":
      return <AlertListCard card={card} />;
    case "map":
      return <MiniMapCard card={card} />;
    default:
      return null;
  }
}
