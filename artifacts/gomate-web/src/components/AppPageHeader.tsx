import { LanguageSwitcher } from "../i18n";

type Props = {
  children?: React.ReactNode;
};

/** Logo + optional nav links + language switcher (use on inner pages for global i18n). */
export function AppPageHeader({ children }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <a href="/" className="flex shrink-0 items-center">
        <img
          src="/gomate-logo.png"
          alt="GoMate"
          className="h-12 w-auto sm:h-14"
        />
      </a>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {children}
        <LanguageSwitcher />
      </div>
    </div>
  );
}
