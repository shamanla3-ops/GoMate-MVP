import type { Transition, Variants } from "framer-motion";

/** ~easeInOut for page transitions */
export const pageEase: Transition = {
  duration: 0.36,
  ease: [0.42, 0, 0.58, 1],
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const headerRevealVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  show: { opacity: 1, y: 0 },
};

export const headerRevealTransition: Transition = {
  duration: 0.4,
  ease: [0.42, 0, 0.58, 1],
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.42, 0, 0.58, 1] },
  },
};

export const reviewModalEase: Transition = {
  duration: 0.26,
  ease: [0.42, 0, 0.58, 1],
};

export const reviewModalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const reviewModalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.42, 0, 0.58, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 12,
    transition: { duration: 0.22, ease: [0.42, 0, 0.58, 1] },
  },
};

export const reviewModalStepVariants: Variants = {
  initial: { opacity: 0, x: 12 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: [0.42, 0, 0.58, 1] },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.18, ease: [0.42, 0, 0.58, 1] },
  },
};
