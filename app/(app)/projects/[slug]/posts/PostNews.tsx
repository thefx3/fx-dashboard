import { cardClass, subtleTextClass } from "./ui";

export default function PostNews() {
  return (
    <div className={`${cardClass} p-2 ${subtleTextClass}`}>
      <h2 className="text-base font-semibold mb-2">Nouveautés</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ajout de la possibilité de supprimer un post.</li>
        <li>Amélioration de l'interface pour une meilleure expérience utilisateur.</li>
        <li>Correction de bugs mineurs et optimisation des performances.</li>
      </ul>
    </div>
  );
}
