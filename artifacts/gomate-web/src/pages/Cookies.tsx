import { LegalPageShell, LegalSection } from "../components/LegalPageShell";

export default function Cookies() {
  return (
    <LegalPageShell title="Cookie & Storage Policy">
      <LegalSection title="1. Technologies used">
        <ul className="list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Cookies</li>
          <li>localStorage</li>
          <li>Session storage</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Purpose">
        <ul className="list-inside list-disc space-y-2 marker:text-[#1296e8]">
          <li>Authentication</li>
          <li>Session management</li>
          <li>Core platform functionality</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Important">
        <p>
          Only essential technologies are currently used to operate the
          service.
        </p>
      </LegalSection>

      <LegalSection title="4. No marketing tracking">
        <p>
          No advertising cookies or tracking pixels are used at this stage.
        </p>
      </LegalSection>

      <LegalSection title="5. Future">
        <p>
          If analytics or marketing tools are added in the future, this policy
          will be updated accordingly.
        </p>
      </LegalSection>

      <LegalSection title="6. Clarification">
        <p>
          GoMate is a digital platform connecting users. It is not a transport
          company and does not provide transportation services.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
