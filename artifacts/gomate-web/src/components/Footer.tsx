import { Link } from "react-router-dom";

const linkClass =
  "text-[#6b8294] rounded-sm transition-all duration-200 hover:text-[#1296e8] motion-safe:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#cfdfea]/80 bg-gradient-to-b from-[#eef6fb]/95 to-[#e8f2f8]/98 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col items-stretch gap-8 sm:items-center sm:text-center">
          <div className="h-px w-full max-w-xs self-center bg-gradient-to-r from-transparent via-[#b8d0e0]/90 to-transparent sm:max-w-md" />

          <div>
            <p className="text-[13px] font-semibold tracking-tight text-[#3d5668] sm:text-sm">
              © 2026 GoMate. All rights reserved.
            </p>
            <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-[#6b8496] sm:mx-auto sm:text-xs">
              Idea, product concept and creation by Yurii Domrachov
            </p>
          </div>

          <nav
            className="flex flex-col gap-1 border-t border-[#d8e6ef]/70 pt-6 sm:border-0 sm:pt-0"
            aria-label="Legal"
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a9faf] sm:hidden">
              Legal
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-2 sm:text-xs">
              <Link to="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              <span className="hidden h-3 w-px bg-[#c5d4df] sm:inline" aria-hidden />
              <Link to="/cookies" className={linkClass}>
                Cookie &amp; Storage Policy
              </Link>
              <span className="hidden h-3 w-px bg-[#c5d4df] sm:inline" aria-hidden />
              <Link to="/terms" className={linkClass}>
                Terms of Use
              </Link>
              <span className="hidden h-3 w-px bg-[#c5d4df] sm:inline" aria-hidden />
              <Link to="/legal" className={linkClass}>
                Contact &amp; Legal Info
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
