import { getSeoCopy, type SeoCopyBlock } from "./copy";
import type { SeoPageModel } from "./types";

/**
 * Curated SEO copy for specific /:lang/:city/:slug routes.
 * Key: `${lang}|${citySlug}|${seoSlug}` (lowercase segments).
 * All other routes use generic templates from `copy.ts`.
 */
export type SeoRouteOverride = {
  title: string;
  description: string;
  h1: string;
  paragraphs: string[];
  /** If omitted, reuse the three benefit lines from the same lang+intent fallback. */
  benefits?: [string, string, string];
  /** Primary CTA label on the hero button (still links to /trips). */
  tripsCta?: string;
};

const SEO_ROUTE_OVERRIDES: Record<string, SeoRouteOverride> = {
  "pl|szczecin|wspolne-przejazdy": {
    title: "Wspólne przejazdy Szczecin — tańsze dojazdy do pracy | GoMate",
    description:
      "Znajdź wspólne przejazdy w Szczecinie. Dziel koszty paliwa, podróżuj szybciej niż komunikacją miejską i oszczędzaj każdego dnia.",
    h1: "Wspólne przejazdy w Szczecinie",
    paragraphs: [
      "W Szczecinie codziennie tysiące osób dojeżdża do pracy, szkoły i na uczelnie tymi samymi trasami. Mimo to większość z nas nadal podróżuje w pojedynkę, tracąc czas i pieniądze.",
      "GoMate powstał, aby to zmienić. Dzięki wspólnym przejazdom możesz znaleźć kierowcę lub pasażerów na swojej trasie i dzielić koszty paliwa. To rozwiązanie jest nie tylko tańsze niż taxi, ale często także szybsze niż komunikacja miejska, szczególnie w godzinach szczytu.",
      "Jeśli codziennie dojeżdżasz do pracy w Szczecinie, GoMate pozwala zamienić codzienny dojazd w wygodną i przewidywalną podróż. Bez przesiadek, bez czekania, bez stresu.",
      "Dodatkowo wspólne przejazdy pomagają ograniczyć emisję CO₂ i zmniejszyć liczbę samochodów na drogach. Każdy przejazd ma znaczenie.",
    ],
    tripsCta: "Znajdź przejazd",
  },

  "de|berlin|mitfahrgelegenheit": {
    title: "Mitfahrgelegenheit Berlin — günstiger zur Arbeit | GoMate",
    description:
      "Finde Mitfahrgelegenheiten in Berlin. Spare Geld, fahre komfortabel und vermeide überfüllte öffentliche Verkehrsmittel.",
    h1: "Mitfahrgelegenheiten in Berlin",
    paragraphs: [
      "In Berlin pendeln täglich Millionen Menschen zur Arbeit. Staus, überfüllte U-Bahnen und steigende Kosten machen den Arbeitsweg immer anstrengender.",
      "GoMate bietet eine einfache Alternative: Mitfahrgelegenheiten innerhalb der Stadt. Fahrer und Mitfahrer können sich verbinden und die Kosten teilen, während sie schneller und komfortabler ans Ziel kommen.",
      "Statt alleine zu fahren oder auf verspätete Verkehrsmittel zu warten, kannst du deine Route mit anderen teilen. Das spart nicht nur Geld, sondern auch Zeit und Nerven.",
      "Gerade in einer Großstadt wie Berlin kann ein gemeinsamer Arbeitsweg den Alltag deutlich entspannter machen. Weniger Umsteigen, mehr Komfort und direkte Verbindungen.",
      "Zusätzlich trägt jede gemeinsame Fahrt dazu bei, CO₂-Emissionen zu reduzieren und den Verkehr zu entlasten.",
    ],
    tripsCta: "Fahrt finden",
  },

  "es|madrid|compartir-viaje": {
    title: "Compartir viaje Madrid — ahorra dinero en tus trayectos | GoMate",
    description:
      "Encuentra viajes compartidos en Madrid. Ahorra dinero, viaja más cómodo y evita el transporte público saturado.",
    h1: "Compartir viaje en Madrid",
    paragraphs: [
      "En Madrid, miles de personas realizan cada día los mismos trayectos al trabajo. Sin embargo, la mayoría sigue viajando sola, perdiendo dinero y tiempo.",
      "GoMate conecta conductores y pasajeros para compartir viajes dentro de la ciudad. Así puedes reducir gastos de combustible y desplazarte de forma más cómoda que en el transporte público.",
      "Evita esperas, transbordos y retrasos. Con GoMate puedes encontrar rutas directas que se adapten a tu horario diario.",
      "Además, compartir coche no solo es más económico, también es una forma inteligente de reducir el tráfico y las emisiones de CO₂ en la ciudad.",
      "Si buscas una alternativa al metro o al taxi en Madrid, GoMate es una solución práctica para tu día a día.",
    ],
    tripsCta: "Encuentra tu viaje",
  },

  "uk|kyiv|spilni-poizdky": {
    title: "Спільні поїздки Київ — дешевше та зручніше | GoMate",
    description:
      "Знайди спільні поїздки в Києві. Економ гроші, їдь швидше та комфортніше, ніж громадським транспортом.",
    h1: "Спільні поїздки у Києві",
    paragraphs: [
      "У Києві щодня тисячі людей їдуть на роботу одними й тими ж маршрутами. Але більшість досі витрачає більше часу і грошей, ніж потрібно.",
      "GoMate допомагає знайти водіїв і пасажирів для спільних поїздок. Ви ділите витрати на паливо та їдете комфортніше, ніж у переповненому транспорті.",
      "Без пересадок, без очікування, без зайвого стресу. Спільні поїздки дозволяють зробити щоденну дорогу простішою і передбачуванішою.",
      "Крім того, кожна така поїздка допомагає зменшити кількість автомобілів на дорогах і скоротити викиди CO₂.",
    ],
    tripsCta: "Знайти поїздку",
  },
};

function routeOverrideKey(lang: string, citySlug: string, seoSlug: string): string {
  return `${lang.toLowerCase()}|${citySlug.toLowerCase()}|${seoSlug.toLowerCase()}`;
}

export function getSeoRouteOverride(
  lang: string,
  citySlug: string,
  seoSlug: string
): SeoRouteOverride | undefined {
  return SEO_ROUTE_OVERRIDES[routeOverrideKey(lang, citySlug, seoSlug)];
}

/**
 * Returns copy for rendering + meta tags. Curated routes use fixed strings;
 * everything else uses the generic `copy.ts` templates per lang+intent.
 */
export function resolveSeoCopyForPage(model: SeoPageModel): {
  copy: SeoCopyBlock;
  tripsCta?: string;
} {
  const o = getSeoRouteOverride(model.lang, model.city.slug, model.slug);
  const fallback = getSeoCopy(model.lang, model.intent);

  if (!o) {
    return { copy: fallback };
  }

  const copy: SeoCopyBlock = {
    title: () => o.title,
    description: () => o.description,
    h1: () => o.h1,
    paragraphs: o.paragraphs.map((p) => () => p),
    benefits: o.benefits ?? fallback.benefits,
  };

  return { copy, tripsCta: o.tripsCta };
}
