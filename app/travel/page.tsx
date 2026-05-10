import { Compass, MapPinned, Plane, WalletCards } from "lucide-react";
import MarketingPage from "@/components/MarketingPage";

const blocks = [
  { title: "Destinations", text: "Pays, villes, inspirations et priorites.", icon: MapPinned },
  { title: "Itineraires", text: "Plans par jour, rythme et contraintes.", icon: Compass },
  { title: "Budget", text: "Reservations, enveloppes et arbitrages.", icon: WalletCards },
];

export default function TravelPage() {
  return (
    <MarketingPage
      eyebrow="Travel"
      title="Organiser les voyages avec clarte."
      description="Une page vitrine pour presenter les destinations, carnets, plans de voyage et systemes d'organisation."
      icon={Plane}
      items={blocks}
    />
  );
}
