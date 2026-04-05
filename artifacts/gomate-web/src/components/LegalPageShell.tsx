import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { staggerItemVariants } from "../lib/motionVariants";

const PAGE_GRADIENT =
  "absolute inset-0 bg-[linear-gradient(180deg,#a9df74_0%,#59c7df_18%,#eef8ff_42%,#f9fcff_58%,#e9f7e1_76%,#b8e07d_100%)]";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-4">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#173651] sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#35556c] sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalPageShell({
  title,
  children,
  showPageAttribution = true,
}: {
  title: string;
  children: ReactNode;
  showPageAttribution?: boolean;
}) {
  return (
    <div className="min-h-full bg-[#eef4f8] text-[#193549]">
      <div className="relative min-h-full">
        <div className={PAGE_GRADIENT} />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-[220px] w-[120%] -translate-x-1/2 rounded-b-[50%] bg-white/45 blur-xl" />
          <div className="absolute top-24 left-[8%] h-28 w-28 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-20 right-[10%] h-24 w-24 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-36 left-[-8%] h-56 w-72 rounded-full bg-[#b6e86f]/35 blur-3xl" />
          <div className="absolute bottom-24 right-[-6%] h-56 w-72 rounded-full bg-[#8fdf79]/35 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 pb-12 sm:px-6 sm:py-12">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-semibold text-[#138fe3] transition hover:text-[#0f7bc9]"
          >
            ← Home
          </Link>

          <motion.article
            variants={staggerItemVariants}
            initial="hidden"
            animate="show"
            className="mt-6 rounded-[30px] border border-white/60 bg-white/35 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-10"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-[#173651] sm:text-4xl">
              {title}
            </h1>

            <div className="mt-10 space-y-10">{children}</div>

            {showPageAttribution && (
              <div className="mt-12 border-t border-white/70 pt-8 text-center text-sm text-[#5a7389]">
                <p className="font-bold text-[#28475d]">GoMate</p>
                <p className="mt-1.5 leading-snug">
                  Idea, product concept and creation by Yurii Domrachov
                </p>
              </div>
            )}
          </motion.article>
        </div>
      </div>
    </div>
  );
}
