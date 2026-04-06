import { motion } from "framer-motion";
import { useSound } from "../../context/SoundContext";
import { useTranslation } from "../../i18n";
import { SuccessModalShell } from "./SuccessModalShell";
import { JoinRequestAnimation } from "./JoinRequestAnimation";

type Props = {
  open: boolean;
  onClose: () => void;
  onViewRequests: () => void;
};

export function JoinRequestSuccessModal({ open, onClose, onViewRequests }: Props) {
  const { t } = useTranslation();
  const { playClick } = useSound();

  return (
    <SuccessModalShell
      open={open}
      onClose={onClose}
      title={t("successModal.joinRequest.title")}
      description={t("successModal.joinRequest.body")}
      a11yCloseLabel={t("successModal.joinRequest.a11yClose")}
      celebrationSound={false}
      illustration={<JoinRequestAnimation />}
      footer={
        <>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            onClick={() => {
              playClick();
              onViewRequests();
              onClose();
            }}
            className="flex min-h-[3rem] w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1296e8_0%,#8ada33_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(39,149,119,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6fbfd] sm:w-auto sm:min-w-[12rem]"
          >
            {t("successModal.joinRequest.viewRequests")}
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            onClick={() => {
              playClick();
              onClose();
            }}
            className="flex min-h-[3rem] w-full items-center justify-center rounded-full border border-white/90 bg-white/95 px-6 text-sm font-bold text-[#29485d] shadow-[0_8px_22px_rgba(23,54,81,0.08)] ring-1 ring-[#d7e4eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6fbfd] sm:w-auto sm:min-w-[10rem]"
          >
            {t("successModal.joinRequest.stayHere")}
          </motion.button>
        </>
      }
    />
  );
}
