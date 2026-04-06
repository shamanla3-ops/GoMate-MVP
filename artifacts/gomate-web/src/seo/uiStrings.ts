import type { SeoLang } from "./types";

/** Short UI chrome for SEO templates (CTA labels). Long copy lives in `copy.ts`. */
export const SEO_UI: Record<
  SeoLang,
  {
    tripsCta: string;
    homeCta: string;
    footerTrips: string;
    footerHome: string;
  }
> = {
  pl: {
    tripsCta: "Znajdź przejazd",
    homeCta: "Strona główna",
    footerTrips: "Przejdź do listy przejazdów",
    footerHome: "Strona główna GoMate",
  },
  de: {
    tripsCta: "Fahrten finden",
    homeCta: "Startseite",
    footerTrips: "Zu den Fahrten",
    footerHome: "Zur GoMate-Startseite",
  },
  es: {
    tripsCta: "Buscar viajes",
    homeCta: "Inicio",
    footerTrips: "Ver viajes disponibles",
    footerHome: "Inicio de GoMate",
  },
  en: {
    tripsCta: "Find a ride",
    homeCta: "Home",
    footerTrips: "Browse available rides",
    footerHome: "GoMate home",
  },
  uk: {
    tripsCta: "Знайти поїздку",
    homeCta: "Головна",
    footerTrips: "До списку поїздок",
    footerHome: "Головна GoMate",
  },
  ru: {
    tripsCta: "Найти поездку",
    homeCta: "Главная",
    footerTrips: "К списку поездок",
    footerHome: "Главная GoMate",
  },
};
