import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import {
  pageEase,
  pageTransitionVariants,
} from "../lib/motionVariants";

/**
 * Wraps routed pages with a shared fade + slide transition.
 * Parent route must render this as `element` and nest child routes.
 */
export function PageTransitionLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="min-w-0 flex-1"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageEase}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
