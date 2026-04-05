import { LegalPageShell, LegalSection } from "../components/LegalPageShell";

export default function Terms() {
  return (
    <LegalPageShell title="Terms of Use">
      <LegalSection title="1. About the platform">
        <p>
          GoMate is a platform that connects users for ride-sharing and
          carpooling arrangements.
        </p>
      </LegalSection>

      <LegalSection title="2. Critical">
        <p className="rounded-2xl border border-[#f5d0a8]/90 bg-[#fffaf3] px-4 py-3 text-[#5c3d1e]">
          <strong className="font-bold">GoMate does not provide transportation
          services.</strong> GoMate is <strong className="font-bold">not</strong>{" "}
          a carrier, taxi company, or transport operator.
        </p>
      </LegalSection>

      <LegalSection title="3. User responsibility">
        <p className="font-semibold text-[#28475d]">Drivers</p>
        <ul className="mt-2 list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Are responsible for the trips they offer</li>
          <li>Are responsible for compliance with applicable laws and rules</li>
        </ul>
        <p className="mt-4 font-semibold text-[#28475d]">Passengers</p>
        <ul className="mt-2 list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Are responsible for their own decisions and conduct</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Platform role">
        <p>
          GoMate only facilitates connections between users. Any ride is
          arranged between the parties involved.
        </p>
      </LegalSection>

      <LegalSection title="5. Accounts">
        <p>Users must provide accurate information and keep credentials secure.</p>
      </LegalSection>

      <LegalSection title="6. Conduct">
        <p>
          Fraud, abuse, harassment, or illegal use of the platform is prohibited.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation">
        <p>
          GoMate is not responsible for the transportation itself, nor for
          disputes between users beyond its role as a technical intermediary.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          <a
            href="mailto:support@getgomate.com"
            className="font-semibold text-[#1296e8] underline decoration-[#1296e8]/40 underline-offset-2 hover:decoration-[#1296e8]"
          >
            support@getgomate.com
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
