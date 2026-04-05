import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const SEAT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type SeatsPickerTranslate = (
  key: string,
  vars?: Record<string, string | number>
) => string;

type SeatsPickerProps = {
  value: number;
  onChange: (seats: number) => void;
  label: string;
  t: SeatsPickerTranslate;
};

function clampSeat(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(9, Math.max(1, Math.round(n)));
}

export function SeatsPicker({ value, onChange, label, t }: SeatsPickerProps) {
  const safeValue = clampSeat(value);
  const titleId = useId();
  const panelId = useId();
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288 });
  const panelWasShownRef = useRef(false);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, 280), window.innerWidth - 32);
    let left = r.left;
    if (left + w > window.innerWidth - 16) {
      left = window.innerWidth - 16 - w;
    }
    if (left < 16) left = 16;
    setPanelPos({ top: r.bottom + 8, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updatePosition]);

  const requestClose = useCallback(() => {
    if (!open) return;
    if (entered) {
      setEntered(false);
    } else {
      setOpen(false);
    }
  }, [open, entered]);

  useEffect(() => {
    if (!open) {
      panelWasShownRef.current = false;
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panelWasShownRef.current = true;
        setEntered(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open || entered) return;
    if (!panelWasShownRef.current) return;
    const id = window.setTimeout(() => setOpen(false), 200);
    return () => window.clearTimeout(id);
  }, [open, entered]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, requestClose]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      requestClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, requestClose]);

  function toggleTrigger() {
    if (open) {
      requestClose();
    } else {
      setOpen(true);
    }
  }

  function pickSeat(n: number) {
    onChange(clampSeat(n));
    requestClose();
  }

  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  return (
    <div className="relative w-full">
      <label
        htmlFor={triggerId}
        className="mb-2 block text-sm font-semibold text-[#28475d]"
      >
        {label}
      </label>

      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        onClick={toggleTrigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        className={`group flex w-full items-center justify-between gap-3 rounded-2xl border bg-white/90 px-4 py-3 text-left shadow-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1296e8]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8] active:scale-[0.99] ${
          open || entered
            ? "border-[#1296e8]/55 shadow-[0_10px_28px_rgba(18,150,232,0.18)]"
            : "border-white/80 hover:border-[#59c7df]/50"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5a7389]">
            {t("createTrip.seatsPickerTitle")}
          </p>
          <p
            className={`mt-0.5 truncate text-2xl font-extrabold tabular-nums leading-none ${
              open || entered ? "text-[#1296e8]" : "text-[#173651]"
            }`}
          >
            {t("createTrip.seatsPickerSummary", { count: safeValue })}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/80 text-[#28475d] shadow-inner transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={t("createTrip.seatsPickerClose")}
              className={`fixed inset-0 z-[100] border-0 bg-[#173651]/25 backdrop-blur-[2px] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                entered ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => requestClose()}
            />

            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={{
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
              }}
              className={`fixed z-[110] max-h-[min(70vh,calc(100vh-2rem))] overflow-hidden rounded-[22px] border border-white/80 bg-white/95 p-4 shadow-[0_20px_50px_rgba(23,54,81,0.2)] backdrop-blur-md transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                entered
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-2 scale-[0.96] opacity-0"
              }`}
            >
              <p
                id={titleId}
                className="mb-3 text-center text-sm font-bold text-[#173651]"
              >
                {t("createTrip.seatsPickerTitle")}
              </p>

              <div
                className="grid grid-cols-3 gap-3"
                role="group"
                aria-label={t("createTrip.seatsPickerGroupLabel")}
              >
                {SEAT_VALUES.map((n) => {
                  const selected = n === safeValue;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pickSeat(n)}
                      aria-pressed={selected}
                      aria-label={t("createTrip.seatsPickerOption", {
                        count: n,
                      })}
                      className={`relative flex min-h-[52px] items-center justify-center rounded-2xl text-lg font-extrabold tabular-nums transition-transform duration-150 active:scale-95 motion-reduce:transition-none ${
                        selected
                          ? "bg-[linear-gradient(135deg,#1296e8_0%,#8ada33_100%)] text-white shadow-[0_10px_24px_rgba(18,150,232,0.35)] ring-2 ring-white/90"
                          : "border border-white/90 bg-white/90 text-[#173651] shadow-sm hover:border-[#59c7df]/45 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8]/45"
                      }`}
                    >
                      {selected && (
                        <span
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/25"
                          aria-hidden
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-white"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          portalTarget
        )}
    </div>
  );
}
