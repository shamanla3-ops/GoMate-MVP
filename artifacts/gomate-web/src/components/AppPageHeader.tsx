import { motion } from "framer-motion";
import { LanguageSwitcher } from "../i18n";
import {
  headerRevealTransition,
  headerRevealVariants,
} from "../lib/motionVariants";

type Props = {
  children?: React.ReactNode;
};

/** Logo + optional nav links + language switcher (use on inner pages for global i18n). */
export function AppPageHeader({ children }: Props) {
  return (
    <motion.header
      initial="hidden"
      animate="show"
      variants={headerRevealVariants}
      transition={headerRevealTransition}
      className="sticky top-0 z-40 -mx-4 mb-6 border-b border-white/55 bg-white/50 px-4 py-3 shadow-[0_10px_40px_rgba(23,54,81,0.07)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 sm:-mx-6 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <motion.a
          href="/"
          className="gomate-icon-pop flex shrink-0 items-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img
            src="/gomate-logo.png"
            alt="GoMate"
            className="h-12 w-auto sm:h-14"
          />
        </motion.a>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {children}
          <LanguageSwitcher />
        </div>
      </div>
    </motion.header>
  );
}
