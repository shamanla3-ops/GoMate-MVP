import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { resolveSeoCopyForPage } from "../../seo/overrides";
import { resolveSeoPage } from "../../seo/resolve";
import { SITE_ORIGIN } from "../../seo/urls";
import { SEO_UI } from "../../seo/uiStrings";
import { staggerContainerVariants, staggerItemVariants } from "../../lib/motionVariants";

const DEFAULT_ORIGIN =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) || SITE_ORIGIN;

export default function SeoCityPage() {
  const { lang, city, slug } = useParams<{
    lang: string;
    city: string;
    slug: string;
  }>();

  const model = useMemo(
    () => resolveSeoPage(lang, city, slug),
    [lang, city, slug]
  );

  const resolvedCopy = useMemo(
    () => (model ? resolveSeoCopyForPage(model) : null),
    [model]
  );
  const copy = resolvedCopy?.copy ?? null;
  const tripsCtaOverride = resolvedCopy?.tripsCta;

  const canonicalUrl = useMemo(() => {
    if (!model) return `${DEFAULT_ORIGIN}/`;
    const path = `/${model.lang}/${model.city.slug}/${model.slug}`;
    return `${DEFAULT_ORIGIN.replace(/\/$/, "")}${path}`;
  }, [model]);

  useEffect(() => {
    if (!model || !copy) {
      document.title = "GoMate";
      let el = document.querySelector('meta[name="robots"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "robots");
        document.head.appendChild(el);
      }
      el.setAttribute("content", "noindex,follow");
      return;
    }

    const title = copy.title(model.city);
    const description = copy.description(model.city);

    document.title = title;

    const ensureMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMeta("name", "description", description);
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:description", description);
    ensureMeta("property", "og:type", "website");
    ensureMeta("property", "og:url", canonicalUrl);
    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "robots", "index,follow");

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonicalUrl);

    const ld = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.h1(model.city),
      description,
      url: canonicalUrl,
      isPartOf: { "@type": "WebSite", name: "GoMate", url: DEFAULT_ORIGIN },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "GoMate",
            item: `${DEFAULT_ORIGIN.replace(/\/$/, "")}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    };

    const scriptId = "gomate-seo-jsonld";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [model, copy, canonicalUrl]);

  if (!model || !copy) {
    return (
      <div className="min-h-screen overflow-hidden bg-[#eef4f8] px-4 py-16 text-center text-[#193549]">
        <p className="text-lg font-semibold">404</p>
        <p className="mt-2 text-[#4a6678]">
          <Link className="font-bold text-[#138fe3] underline" to="/">
            Go to homepage
          </Link>
        </p>
      </div>
    );
  }

  const { city: c } = model;
  const ui = SEO_UI[model.lang];
  const tripsCta = tripsCtaOverride ?? ui.tripsCta;

  return (
    <div className="min-h-screen overflow-hidden bg-[#eef4f8] text-[#193549]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#a9df74_0%,#59c7df_18%,#eef8ff_42%,#f9fcff_58%,#e9f7e1_76%,#b8e07d_100%)]" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-[220px] w-[120%] -translate-x-1/2 rounded-b-[50%] bg-white/45 blur-xl" />
          <div className="absolute top-24 left-[8%] h-28 w-28 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-20 right-[10%] h-24 w-24 rounded-full bg-white/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:px-10">
          <nav className="mb-8 text-sm text-[#4a6678]">
            <Link className="font-semibold text-[#138fe3] hover:underline" to="/">
              GoMate
            </Link>
            <span className="mx-2 text-[#8ca0ae]">/</span>
            <span className="uppercase tracking-wide text-[#5d7485]">{model.lang}</span>
            <span className="mx-2 text-[#8ca0ae]">/</span>
            <span>{c.name}</span>
          </nav>

          <div className="gomate-glass-hero">
            <motion.h1
              variants={staggerItemVariants}
              initial="hidden"
              animate="show"
              className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-[#173651] sm:text-5xl"
            >
              {copy.h1(c)}
            </motion.h1>

            <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-[#35556c] sm:text-xl sm:leading-relaxed">
              {copy.paragraphs.map((fn, i) => (
                <p key={i}>{fn(c)}</p>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/trips"
                className="gomate-btn-gradient flex min-h-[3.5rem] items-center justify-center rounded-full px-8 text-lg font-bold text-white"
              >
                {tripsCta}
              </Link>
              <Link
                to="/"
                className="gomate-btn-secondary px-8 text-lg"
              >
                {ui.homeCta}
              </Link>
            </div>
          </div>

          <motion.div
            className="mt-12 grid gap-4 sm:grid-cols-3"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="show"
          >
            {copy.benefits.map((text) => (
              <motion.div
                key={text}
                variants={staggerItemVariants}
                className="gomate-lift-card p-5 backdrop-blur-sm"
              >
                <p className="text-base font-bold leading-snug text-[#1f3548]">{text}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="gomate-glass-panel mt-12 p-6 text-sm leading-relaxed text-[#35556c]">
            <p>
              <Link className="font-bold text-[#138fe3] hover:underline" to="/trips">
                {ui.footerTrips}
              </Link>
              {" · "}
              <Link className="font-bold text-[#138fe3] hover:underline" to="/">
                {ui.footerHome}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
