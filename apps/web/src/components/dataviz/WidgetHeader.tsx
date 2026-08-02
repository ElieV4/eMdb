/**
 * En-tête partagé par les cartes/graphiques dataviz : titre centré, bouton
 * "⋮" épinglé en haut à droite hors du flux de centrage — modification W
 * (retour utilisateur : titres centrés). Le sous-titre indiquant le type de
 * chart ("Barres horizontales groupées", etc.) a été retiré (8ème passe,
 * retour utilisateur).
 */

export function WidgetHeader({
  title,
  menu,
}: {
  title: string;
  menu: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center px-8 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="absolute right-0 top-0">{menu}</div>
    </div>
  );
}
