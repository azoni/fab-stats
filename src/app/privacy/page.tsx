import type { Metadata } from "next";

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
          <h2 className="text-lg font-semibold text-fab-text mb-2">FaB Stats Website</h2>
          <p>
            FaB Stats uses Firebase Authentication to manage user accounts. When you sign up, we store your email address,
            display name, username, and profile photo (if provided). Your match history data is stored in Google Cloud Firestore
            and is accessible only to you unless you choose to make your profile public.
          </p>
          <p className="mt-2">
            Guest mode stores all data locally in your browser. No data is sent to any server until you create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">FaB Stats - GEM Exporter (Chrome Extension)</h2>
          <p>
            The Chrome extension reads match history data from your GEM profile page (gem.fabtcg.com) when you click
            the Export button. This data is processed entirely within your browser.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>No data is collected, stored, or transmitted to any external server by the extension</li>
            <li>Match data is passed directly to FaB Stats via your browser clipboard and URL</li>
            <li>The extension does not track browsing activity, analytics, or personal information</li>
            <li>The extension only activates on gem.fabtcg.com pages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">Third-Party Services</h2>
          <p>
            FaB Stats uses Google Firebase for authentication and data storage. Please refer to{" "}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fab-gold hover:underline"
            >
              Google Firebase Privacy Policy
            </a>{" "}
            for details on how Google handles data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">Data Deletion</h2>
          <p>
            You can delete your account and all associated data at any time by contacting us. Guest mode data can be
            cleared by clearing your browser storage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fab-text mb-2">Contact</h2>
          <p>
            For questions about this privacy policy, contact{" "}
            <a href="mailto:charltonuw@gmail.com" className="text-fab-gold hover:underline">
              charltonuw@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
