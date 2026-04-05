import { Link } from "react-router-dom";

const linkClass =
  "text-[#6b8294] rounded-sm transition-all duration-200 hover:text-[#1296e8] motion-safe:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1296e8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#d8e6ef]/90 bg-[#eef4f8]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-medium text-[#5a7389] sm:text-sm">
            © 2026 GoMate. All rights reserved.
          </p>
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-[#7a94a5] sm:text-xs">
            Idea, product concept and creation by Yurii Domrachov
          </p>

          <nav
            className="mt-5 flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[11px] font-semibold sm:text-xs"
            aria-label="Legal"
          >
            <Link to="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            <span className="hidden text-[#c5d4df] sm:inline" aria-hidden>
              |
            </span>
            <Link to="/cookies" className={linkClass}>
              Cookie &amp; Storage Policy
            </Link>
            <span className="hidden text-[#c5d4df] sm:inline" aria-hidden>
              |
            </span>
            <Link to="/terms" className={linkClass}>
              Terms of Use
            </Link>
            <span className="hidden text-[#c5d4df] sm:inline" aria-hidden>
              |
            </span>
            <Link to="/legal" className={linkClass}>
              Contact &amp; Legal Info
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
