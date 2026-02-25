import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "FaB Stats privacy policy — how we handle your Flesh and Blood match data and account information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Privacy Policy</h1>
      <div className="space-y-6 text-sm text-fab-muted leading-relaxed">
        <p className="text-fab-text">Last updated: February 2026</p>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">1. What We Collect</h2>
          <p>When you create an account, we collect:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-fab-text">Account info:</strong> email address (via Firebase Authentication)</li>
            <li><strong className="text-fab-text">Profile info:</strong> username, display name, first/last name (optional), profile photo (optional)</li>
            <li><strong className="text-fab-text">Match data:</strong> match results, dates, heroes played, opponent names, event details, and notes you enter or import</li>
            <li><strong className="text-fab-text">Usage data:</strong> browser-stored preferences (localStorage) such as user count cache and guest mode data</li>
          </ul>
          <p className="mt-2">
            In guest mode, all data is stored locally in your browser. No data is sent to any server until you create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">2. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Display your profile, match history, and statistics to you</li>
            <li>Show your public profile and aggregated stats on the leaderboard (if you opt in)</li>
            <li>Display match import activity in the public activity feed</li>
            <li>Enable match commenting and notifications between users</li>
            <li>Process bug reports and feature requests you submit</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">3. Lawful Basis for Processing (GDPR)</h2>
          <p>We process your personal data based on:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-fab-text">Consent:</strong> you provide consent when you create an account and agree to our Terms of Service and this Privacy Policy</li>
            <li><strong className="text-fab-text">Legitimate interest:</strong> operating and improving the Service, preventing abuse</li>
          </ul>
          <p className="mt-2">You may withdraw consent at any time by deleting your account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">4. Public Profiles &amp; Visibility</h2>
          <p>
            When you set your profile to public (the default), the following data becomes visible to all visitors:
            your username, display name, profile photo, and aggregated match statistics (win rate, streaks, heroes played, etc.).
            Opponent names in your match history are hidden from other viewers.
          </p>
          <p className="mt-2">
            You can set your profile to private at any time in{" "}
            <Link href="/settings" className="text-fab-gold hover:underline">Settings</Link>.
            Private profiles are not shown on the leaderboard or in search results.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">5. Data Storage &amp; Third-Party Services</h2>
          <p>
            FaB Stats uses Google Firebase for authentication and data storage. Your data is stored
            in Google Cloud Firestore servers. Please refer to the{" "}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fab-gold hover:underline"
            >
              Google Firebase Privacy Policy
            </a>{" "}
            for details on how Google handles data, including international data transfers.
          </p>
          <p className="mt-2">
            If you are located in the EU/EEA, your data may be transferred to and processed in the
            United States by Google. Google provides Standard Contractual Clauses as a transfer mechanism.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">6. Cookies &amp; Local Storage</h2>
          <p>
            FaB Stats uses the following browser storage mechanisms:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-fab-text">Firebase Auth cookies:</strong> essential for keeping you signed in (session management)</li>
            <li><strong className="text-fab-text">localStorage:</strong> caches non-sensitive data like user count and guest mode match data to reduce server requests</li>
          </ul>
          <p className="mt-2">
            We do not use advertising cookies, third-party tracking pixels, or analytics services.
            All storage is essential to the operation of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">7. Data Retention</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-fab-text">Account &amp; match data:</strong> retained until you delete your account</li>
            <li><strong className="text-fab-text">Notifications:</strong> automatically deleted after 30 days</li>
            <li><strong className="text-fab-text">Feedback submissions:</strong> retained indefinitely for product improvement; contact us to request deletion</li>
            <li><strong className="text-fab-text">Guest mode data:</strong> stored in your browser only; cleared when you clear browser storage</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">8. Your Rights</h2>
          <p>
            Depending on your location, you may have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-fab-text">Access:</strong> you can view all your data within the app (profile, matches, stats)</li>
            <li><strong className="text-fab-text">Export / Portability:</strong> you can download your data in JSON format from the{" "}
              <Link href="/settings" className="text-fab-gold hover:underline">Settings</Link> page</li>
            <li><strong className="text-fab-text">Rectification:</strong> you can edit your profile information and match records at any time</li>
            <li><strong className="text-fab-text">Erasure:</strong> you can delete your account and all associated data from the Settings page; this is immediate and irreversible</li>
            <li><strong className="text-fab-text">Restriction:</strong> you can set your profile to private to restrict public processing of your data</li>
            <li><strong className="text-fab-text">Objection:</strong> you may object to processing by contacting us or deleting your account</li>
          </ul>
          <p className="mt-2">
            We will respond to data subject requests within 30 days. To exercise any of these
            rights, contact us at the email below or use the self-service options in Settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">9. California Privacy Rights (CCPA/CPRA)</h2>
          <p>
            If you are a California resident, you have the right to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Know what personal information we collect and how it is used</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of the sale or sharing of personal information</li>
          </ul>
          <p className="mt-2">
            We do not sell or share your personal information with third parties for advertising or
            marketing purposes. To exercise your rights, contact us at the email below or delete
            your account from Settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">10. Chrome Extension &amp; Userscript</h2>
          <p>
            The FaB Stats GEM Exporter Chrome extension and userscript read match history data from
            your GEM profile page (gem.fabtcg.com) when you initiate an export. This data is
            processed entirely within your browser.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>No data is collected, stored, or transmitted to any external server by the extension</li>
            <li>Match data is passed directly to FaB Stats via your browser clipboard and URL</li>
            <li>The extension does not track browsing activity, analytics, or personal information</li>
            <li>The extension only activates on gem.fabtcg.com pages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">11. Children&apos;s Privacy</h2>
          <p>
            The Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with
            personal data, please contact us so we can delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">12. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. The &quot;last updated&quot; date at the top of this
            page reflects the most recent revision. Continued use of the Service after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">13. Contact</h2>
          <p>
            For questions about this privacy policy or to exercise your data rights, contact{" "}
            <a href="mailto:charltonuw@gmail.com" className="text-fab-gold hover:underline">
              charltonuw@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
