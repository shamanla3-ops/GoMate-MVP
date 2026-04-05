import { LegalPageShell, LegalSection } from "../components/LegalPageShell";

export default function Privacy() {
  return (
    <LegalPageShell title="Privacy Policy">
      <LegalSection title="1. About GoMate">
        <p>
          GoMate is an online platform that connects drivers and passengers for
          ride-sharing. GoMate acts as a digital intermediary and does not
          provide transportation services.
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect">
        <ul className="list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Account data (name, email, password)</li>
          <li>Profile data</li>
          <li>Trip data</li>
          <li>Technical data</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use data">
        <ul className="list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>To provide platform functionality</li>
          <li>To enable ride matching</li>
          <li>To send emails (verification, notifications)</li>
          <li>To improve the service</li>
          <li>To ensure security</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Important legal clarification">
        <p className="rounded-2xl border border-[#b8e6b6]/80 bg-[#f0faf0]/90 px-4 py-3 text-[#1a4d2e]">
          <strong className="font-bold">GoMate is not</strong> a transport
          company, carrier, or taxi operator. All transportation is arranged{" "}
          <strong className="font-bold">directly between users</strong>.
        </p>
      </LegalSection>

      <LegalSection title="5. Data sharing">
        <ul className="list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>With trusted providers (e.g. hosting, email delivery)</li>
          <li>We do not sell your personal data</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. User rights">
        <p>You may have rights to:</p>
        <ul className="mt-2 list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Access your data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion, where applicable</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Questions about this policy:{" "}
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
