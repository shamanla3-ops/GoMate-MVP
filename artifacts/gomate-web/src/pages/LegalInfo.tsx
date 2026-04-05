import { LegalPageShell, LegalSection } from "../components/LegalPageShell";

export default function LegalInfo() {
  return (
    <LegalPageShell title="Contact & Legal Information">
      <LegalSection title="GoMate">
        <p>
          GoMate is a ride-sharing platform that connects drivers and
          passengers.
        </p>
        <p className="mt-3">
          <strong className="text-[#28475d]">Email:</strong>{" "}
          <a
            href="mailto:support@getgomate.com"
            className="font-semibold text-[#1296e8] underline decoration-[#1296e8]/40 underline-offset-2 hover:decoration-[#1296e8]"
          >
            support@getgomate.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Important">
        <p className="rounded-2xl border border-white/80 bg-white/50 px-4 py-3 text-[#35556c]">
          GoMate is a <strong className="text-[#173651]">digital platform</strong>{" "}
          that connects users. GoMate does{" "}
          <strong className="text-[#173651]">not</strong> provide transportation
          services and is <strong className="text-[#173651]">not</strong> a
          transport company.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
