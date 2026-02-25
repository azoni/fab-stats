import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "FaB Stats terms of service — rules and guidelines for using the platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Terms of Service</h1>
      <div className="space-y-6 text-sm text-fab-muted leading-relaxed">
        <p className="text-fab-text">Last updated: February 2026</p>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using FaB Stats (&quot;the Service&quot;), you agree to be bound by these Terms of
            Service and our{" "}
            <Link href="/privacy" className="text-fab-gold hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">2. Description of Service</h2>
          <p>
            FaB Stats is a free, fan-made tool for tracking Flesh and Blood TCG match history,
            statistics, and tournament performance. The Service includes a web application, a Chrome
            extension (GEM Exporter), and a userscript for importing match data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">3. User Accounts</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must not impersonate other players or create accounts for fraudulent purposes.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Submit false or misleading match data.</li>
            <li>Scrape, harvest, or programmatically access the Service beyond normal use.</li>
            <li>Attempt to access other users&apos; private data.</li>
            <li>Use the Service to harass, abuse, or harm other users.</li>
            <li>Post offensive, threatening, or inappropriate content in comments or profiles.</li>
            <li>Interfere with or disrupt the Service or its infrastructure.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">5. User Content</h2>
          <p>
            You retain ownership of the match data and content you submit. By making your profile
            public, you grant FaB Stats a non-exclusive, royalty-free license to display your
            public data (username, display name, match statistics, and profile photo) on the
            Service, including the leaderboard and activity feed.
          </p>
          <p className="mt-2">
            You can revoke this license at any time by setting your profile to private or deleting
            your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">6. Public Profiles &amp; Leaderboard</h2>
          <p>
            When you set your profile to public, your display name, username, profile photo, and
            aggregated match statistics (win rate, streaks, etc.) become visible to all visitors.
            Opponent names in your match history are hidden from other viewers. You can change your
            profile to private at any time in Settings.
          </p>
          <p className="mt-2">
            Match import activity may appear in the public activity feed. The leaderboard displays
            aggregated stats for public profiles only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">7. Data &amp; Privacy</h2>
          <p>
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy" className="text-fab-gold hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your data. By using the Service, you
            consent to the data practices described in the Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">8. Intellectual Property</h2>
          <p>
            Flesh and Blood is a registered trademark of Legend Story Studios (LSS). FaB Stats is a
            fan-made tool and is not produced, endorsed, supported, or affiliated with Legend Story
            Studios. All card names, images, and game mechanics are the property of LSS.
          </p>
          <p className="mt-2">
            The FaB Stats application, its design, and original code are the property of the
            developer. You may not copy, modify, or distribute the application without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
            whether express or implied. We do not guarantee that the Service will be uninterrupted,
            error-free, or secure. Match data accuracy depends on the data you import.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, FaB Stats and its developer shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages arising from
            your use of the Service, including but not limited to loss of data or loss of
            tournament standings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">11. Account Termination</h2>
          <p>
            You may delete your account at any time from the Settings page. Upon deletion, all your
            data (matches, profile, leaderboard entry) is permanently removed. We may also
            terminate or suspend accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">12. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. The &quot;last updated&quot; date at the top of this
            page reflects the most recent revision. Continued use of the Service after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">13. Contact</h2>
          <p>
            For questions about these terms, contact{" "}
            <a href="mailto:charltonuw@gmail.com" className="text-fab-gold hover:underline">
              charltonuw@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
