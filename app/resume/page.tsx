import { BriefcaseBusiness, Code2, Layers3, Trophy } from "lucide-react";
import MarketingPage from "@/components/MarketingPage";

const sections = [
  { title: "Experience", text: "Roles, missions et resultats concrets.", icon: BriefcaseBusiness },
  { title: "Projects", text: "Produits, apps, systems et dashboards.", icon: Layers3 },
  { title: "Skills", text: "Engineering, product, data et execution.", icon: Code2 },
];

export default function ResumePage() {
  return (
    <MarketingPage
      eyebrow="Resume"
      title="Un profil net, lisible, oriente impact."
      description="Une presentation professionnelle simple pour structurer parcours, projets, competences et preuves de progression."
      icon={Trophy}
      items={sections}
    />
  );
}
