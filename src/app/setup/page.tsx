"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isUsernameTaken, createProfile } from "@/lib/firestore-storage";

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export default function SetupPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Navigate to dashboard once profile subscription confirms creation
  useEffect(() => {
    if (profile) router.replace("/");
  }, [profile, router]);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split("@")[0] || ""
  );
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function checkUsername(value: string) {
    const lower = value.toLowerCase();
    if (!USERNAME_REGEX.test(lower)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const taken = await isUsernameTaken(lower);
    setAvailable(!taken);
    setChecking(false);
  }

  function handleUsernameChange(value: string) {
    const lower = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setUsername(lower);
    setAvailable(null);
    setError("");

    // Debounce check
    if (USERNAME_REGEX.test(lower)) {
      const timeout = setTimeout(() => checkUsername(lower), 400);
      return () => clearTimeout(timeout);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!USERNAME_REGEX.test(username)) {
      setError("Username must be 3-20 characters: letters, numbers, hyphens, underscores.");
      return;
    }

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (!user) return;

    setSubmitting(true);
    try {
      const searchName = [firstName, lastName, displayName].filter(Boolean).join(" ").toLowerCase();
      await createProfile(user.uid, {
        username,
        displayName: displayName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        searchName: searchName || undefined,
        photoUrl: user.photoURL || undefined,
        isPublic,
      });
      // Navigation handled by useEffect watching profile
    } catch (err) {
      if (err instanceof Error && err.message.includes("already taken")) {
        setError("That username is taken. Try another.");
        setAvailable(false);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-fab-gold mb-2">Set Up Your Profile</h1>
          <p className="text-fab-muted text-sm">
            Pick a username so other players can find you.
          </p>
          <button
            type="button"
            onClick={async () => {
              const { signOut } = await import("firebase/auth");
              const { auth } = await import("@/lib/firebase");
              await signOut(auth);
              router.push("/login");
            }}
            className="text-xs text-fab-gold/70 hover:text-fab-gold mt-2 transition-colors"
          >
            &larr; Back to sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm text-fab-muted mb-1">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                placeholder="azoni"
                maxLength={20}
              />
              {checking && (
                <span className="absolute right-3 top-2.5 text-fab-dim text-sm">...</span>
              )}
              {!checking && available === true && (
                <span className="absolute right-3 top-2.5 text-fab-win text-sm">Available</span>
              )}
              {!checking && available === false && (
                <span className="absolute right-3 top-2.5 text-fab-loss text-sm">Taken</span>
              )}
            </div>
            <p className="text-xs text-fab-dim mt-1">
              3-20 characters. Letters, numbers, hyphens, underscores.
            </p>
            <p className="text-xs text-fab-dim mt-0.5">
              Your profile will be at <span className="text-fab-gold">/player/{username || "..."}</span>
            </p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm text-fab-muted mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm text-fab-muted mb-1">
                First Name <span className="text-fab-dim">(optional)</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                placeholder="Charlie"
                maxLength={30}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm text-fab-muted mb-1">
                Last Name <span className="text-fab-dim">(optional)</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                placeholder="Smith"
                maxLength={30}
              />
            </div>
          </div>
          <p className="text-xs text-fab-dim -mt-3">
            Your real name helps opponents find your profile from match results.
          </p>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between bg-fab-surface border border-fab-border rounded-lg px-3 py-3">
            <div>
              <p className="text-sm font-medium text-fab-text">Public Profile</p>
              <p className="text-xs text-fab-dim mt-0.5">
                {isPublic
                  ? "Visible on leaderboard, search, and activity feed."
                  : "Only you can see your profile, stats, and matches."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isPublic ? "bg-fab-gold" : "bg-fab-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 accent-fab-gold"
            />
            <span className="text-xs text-fab-muted">
              I agree to the{" "}
              <Link href="/terms" className="text-fab-gold hover:underline" target="_blank">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-fab-gold hover:underline" target="_blank">Privacy Policy</Link>
            </span>
          </label>

          {error && (
            <p className="text-fab-loss text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || available === false || !USERNAME_REGEX.test(username) || !acceptedTerms}
            className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
