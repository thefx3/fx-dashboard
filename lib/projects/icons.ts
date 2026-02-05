export const PROJECT_ICON_OPTIONS = [
  { value: "folder", label: "Dossier" },
  { value: "music", label: "Musique" },
  { value: "book", label: "Livre" },
  { value: "code", label: "Code" },
  { value: "rocket", label: "Rocket" },
  { value: "chart", label: "Stats" },
  { value: "palette", label: "Design" },
  { value: "camera", label: "Photo" },
  { value: "globe", label: "Web" },
  { value: "calendar", label: "Planning" },
  { value: "briefcase", label: "Business" },
  { value: "target", label: "Objectif" },
  { value: "wrench", label: "Outils" },
  { value: "layers", label: "Produit" },
  { value: "zap", label: "Energie" },
  { value: "sport", label: "Sport" },
  { value: "health", label: "Sante" },
  { value: "medical", label: "Medical" },
  { value: "cpu", label: "Informatique" },
  { value: "monitor", label: "Tech" },
  { value: "economy", label: "Economie" },
  { value: "trending", label: "Croissance" },
  { value: "nature", label: "Nature" },
  { value: "mountain", label: "Outdoor" },
] as const;

export type ProjectIcon = (typeof PROJECT_ICON_OPTIONS)[number]["value"];

export const DEFAULT_PROJECT_ICON: ProjectIcon = "folder";

export function normalizeProjectIcon(input?: string | null) {
  const value = String(input ?? "").trim();
  const match = PROJECT_ICON_OPTIONS.find((option) => option.value === value);
  return match ? match.value : DEFAULT_PROJECT_ICON;
}
