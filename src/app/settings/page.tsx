"use client";
import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { updateProfile, uploadProfilePhoto, deleteAccountData, getMatchesByUserId, clearAllMatchesFirestore, registerGemId, deleteGemId } from "@/lib/firestore-storage";
import {
  deleteUser,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { SparklesIcon } from "@/components/icons/NavIcons";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { useCreators } from "@/hooks/useCreators";
import { platformIcons } from "@/components/layout/Navbar";

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 text-fab-dim transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function YearInReview() {
  const { matches } = useMatches();
  const [open, setOpen] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearSet = new Set<string>();
    for (const m of matches) {
      const y = m.date?.split("-")[0];
      if (y && y.length === 4 && y !== currentYear) yearSet.add(y);
    }
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [matches]);

  if (years.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <h2 className="text-sm font-semibold text-fab-text flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-fab-gold" />
          Year in Review
        </h2>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="space-y-2 mt-4">
          {years.map((year) => {
            const count = matches.filter((m) => m.date.startsWith(year)).length;
            return (
              <Link
                key={year}
                href={`/wrapped?year=${year}`}
                className="flex items-center justify-between p-3 rounded-lg bg-fab-bg hover:bg-fab-gold/10 border border-fab-border hover:border-fab-gold/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-fab-gold">{year}</span>
                  <span className="text-sm text-fab-muted">Wrapped</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fab-dim">{count} matches</span>
                  <svg className="w-4 h-4 text-fab-dim group-hover:text-fab-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, profile, signOut, isGuest, refreshProfile } = useAuth();
  const { refreshMatches } = useMatches();
  const creators = useCreators();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [earnings, setEarnings] = useState(profile?.earnings?.toString() || "");
  const [gemId, setGemId] = useState(profile?.gemId || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showNameOnProfiles, setShowNameOnProfiles] = useState(profile?.showNameOnProfiles ?? false);
  const [togglingName, setTogglingName] = useState(false);
  const [hideFromSpotlight, setHideFromSpotlight] = useState(profile?.hideFromSpotlight ?? false);
  const [togglingSpotlight, setTogglingSpotlight] = useState(false);
  const [hideFromGuests, setHideFromGuests] = useState(profile?.hideFromGuests ?? false);
  const [togglingGuests, setTogglingGuests] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [creatorsOpen, setCreatorsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const searchName = [firstName, lastName, displayName].filter(Boolean).join(" ").toLowerCase();
      const trimmedGemId = gemId.trim();
      const oldGemId = profile?.gemId;

      await updateProfile(user.uid, {
        displayName: displayName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        searchName: searchName || undefined,
        earnings: earnings ? parseFloat(earnings) : undefined,
        gemId: trimmedGemId || undefined,
      });

      // Update gemIds lookup collection if GEM ID changed
      if (trimmedGemId !== (oldGemId || "")) {
        if (oldGemId) deleteGemId(oldGemId).catch(() => {});
        if (trimmedGemId) registerGemId(user.uid, trimmedGemId).catch(() => {});
      }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 200);
      await uploadProfilePhoto(user.uid, dataUrl);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setError("Failed to upload photo. Please try again.");
      setUploading(false);
      return;
    }
    try {
      await refreshProfile();
    } catch {
      // Photo was saved, refresh just didn't pick it up yet
    }
    setUploading(false);
  }

  if (isGuest) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-fab-gold mb-4">Settings</h1>
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 text-center mb-4">
          <p className="text-fab-muted mb-4">Sign up to customize your profile, set a display name, and upload a profile photo.</p>
          <a href="/login" className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
            Sign Up
          </a>
        </div>
        <YearInReview />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-fab-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-fab-gold mb-6">Settings</h1>

      {/* Profile photo */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-4">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-fab-bg border-2 border-fab-border hover:border-fab-gold transition-colors group shrink-0"
          >
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-fab-gold font-bold text-xl">
                {initials}
              </span>
            )}
            <span className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            {uploading && (
              <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xs animate-pulse">...</span>
              </span>
            )}
          </button>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
            <p className="text-xs text-fab-dim mt-1">JPG or PNG, auto-resized</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Profile info */}
      <form onSubmit={handleSave} className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-4">Profile Info</h2>

        <div className="mb-4">
          <label className="block text-sm text-fab-muted mb-1">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-fab-dim text-sm">@{profile.username}</span>
            <span className="text-xs text-fab-dim bg-fab-bg px-2 py-0.5 rounded">Cannot be changed</span>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="displayName" className="block text-sm text-fab-muted mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
            maxLength={50}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm text-fab-muted mb-1">
              First Name <span className="text-fab-dim">(optional)</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
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
              className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
              maxLength={30}
            />
          </div>
        </div>
        <p className="text-xs text-fab-dim mb-4">
          Your real name helps opponents find your profile from match results.
        </p>

        <div className="mb-4">
          <label htmlFor="earnings" className="block text-sm text-fab-muted mb-1">
            Lifetime Earnings ($) <span className="text-fab-dim">(optional)</span>
          </label>
          <input
            id="earnings"
            type="number"
            min="0"
            step="0.01"
            value={earnings}
            onChange={(e) => setEarnings(e.target.value)}
            placeholder="0.00"
            className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
          />
          <p className="text-xs text-fab-dim mt-1">
            Total prize money earned from FaB tournaments.{" "}
            <a href="https://www.fabboards.com/leaderboard/players" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">Look up your earnings on FabBoards</a>
            {(firstName || lastName) && (
              <span> — search for &quot;{[firstName, lastName].filter(Boolean).join(" ")}&quot;</span>
            )}
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="gemId" className="block text-sm text-fab-muted mb-1">
            GEM ID <span className="text-fab-dim">(optional)</span>
          </label>
          <input
            id="gemId"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={gemId}
            onChange={(e) => setGemId(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 12345678"
            className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
          />
          <p className="text-xs text-fab-dim mt-1">Your GEM player ID. Used to link matches with opponents on the platform.</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-fab-muted mb-1">Email</label>
          <span className="text-fab-dim text-sm">{user.email}</span>
        </div>

        {error && <p className="text-fab-loss text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving || !displayName.trim()}
          className="px-6 py-2 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </form>

      {/* Privacy */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <button onClick={() => setPrivacyOpen(!privacyOpen)} className="flex items-center justify-between w-full text-left">
          <h2 className="text-sm font-semibold text-fab-text">Privacy</h2>
          <ChevronIcon open={privacyOpen} />
        </button>
        {privacyOpen && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-fab-text">Public Profile</p>
                <p className="text-xs text-fab-dim mt-0.5">
                  {isPublic
                    ? "Anyone can view your profile, match history, and stats. Opponent names are hidden from viewers."
                    : "Your profile is private. Only you can see your data."}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  setTogglingPublic(true);
                  try {
                    const next = !isPublic;
                    await updateProfile(user.uid, { isPublic: next });
                    setIsPublic(next);
                  } catch {
                    setError("Failed to update privacy setting.");
                  } finally {
                    setTogglingPublic(false);
                  }
                }}
                disabled={togglingPublic}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  isPublic ? "bg-fab-win" : "bg-fab-border"
                } ${togglingPublic ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-fab-border">
              <div>
                <p className="text-sm text-fab-text">Show Name on Opponent Profiles</p>
                <p className="text-xs text-fab-dim mt-0.5">
                  {showNameOnProfiles
                    ? "Your display name is visible when you appear as an opponent on other players' profiles."
                    : "Your name is hidden when you appear as an opponent on other players' profiles."}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  setTogglingName(true);
                  try {
                    const next = !showNameOnProfiles;
                    await updateProfile(user.uid, { showNameOnProfiles: next });
                    setShowNameOnProfiles(next);
                  } catch {
                    setError("Failed to update name visibility setting.");
                  } finally {
                    setTogglingName(false);
                  }
                }}
                disabled={togglingName}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  showNameOnProfiles ? "bg-fab-win" : "bg-fab-border"
                } ${togglingName ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    showNameOnProfiles ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-fab-border">
              <div>
                <p className="text-sm text-fab-text">Hide from Player Spotlight</p>
                <p className="text-xs text-fab-dim mt-0.5">
                  {hideFromSpotlight
                    ? "You won't appear in the Player Spotlight section on the homepage."
                    : "You may be featured in the Player Spotlight on the homepage based on your activity."}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  setTogglingSpotlight(true);
                  try {
                    const next = !hideFromSpotlight;
                    await updateProfile(user.uid, { hideFromSpotlight: next });
                    setHideFromSpotlight(next);
                  } catch {
                    setError("Failed to update spotlight setting.");
                  } finally {
                    setTogglingSpotlight(false);
                  }
                }}
                disabled={togglingSpotlight}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  hideFromSpotlight ? "bg-fab-win" : "bg-fab-border"
                } ${togglingSpotlight ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    hideFromSpotlight ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-fab-border">
              <div>
                <p className="text-sm text-fab-text">Hide from Guests</p>
                <p className="text-xs text-fab-dim mt-0.5">
                  {hideFromGuests
                    ? "Users who are not logged in cannot see your profile, stats, or leaderboard entry."
                    : "Anyone — even without an account — can view your profile and stats."}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  setTogglingGuests(true);
                  try {
                    const next = !hideFromGuests;
                    await updateProfile(user.uid, { hideFromGuests: next });
                    setHideFromGuests(next);
                  } catch {
                    setError("Failed to update guest visibility setting.");
                  } finally {
                    setTogglingGuests(false);
                  }
                }}
                disabled={togglingGuests}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  hideFromGuests ? "bg-fab-win" : "bg-fab-border"
                } ${togglingGuests ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    hideFromGuests ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <YearInReview />

      {/* Feedback */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-2">Feedback</h2>
        <p className="text-xs text-fab-dim mb-3">Found a bug or have a feature idea? Let us know.</p>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Send Feedback
        </button>
      </div>

      {/* Creators */}
      {creators.length > 0 && (
        <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
          <button onClick={() => setCreatorsOpen(!creatorsOpen)} className="flex items-center justify-between w-full text-left">
            <h2 className="text-sm font-semibold text-fab-text">Featured Creators</h2>
            <ChevronIcon open={creatorsOpen} />
          </button>
          {creatorsOpen && (
            <div className="mt-4">
              <p className="text-xs text-fab-dim mb-3">Check out these FaB content creators.</p>
              <div className="space-y-2">
                {creators.map((c) => (
                  <a
                    key={c.name}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-fab-bg hover:bg-fab-gold/10 border border-fab-border hover:border-fab-gold/30 transition-colors group"
                  >
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="shrink-0">{platformIcons[c.platform]}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">{c.name}</p>
                      <p className="text-xs text-fab-dim truncate">{c.description}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-fab-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-2">Changelog</h2>
        <p className="text-xs text-fab-dim mb-3">See what&apos;s new, improved, and fixed.</p>
        <Link
          href="/changelog"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
        >
          View Changelog
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Your Data */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-2">Your Data</h2>
        <p className="text-xs text-fab-dim mb-3">Download all your data in JSON format (profile, matches, statistics).</p>
        <button
          onClick={async () => {
            if (!user) return;
            setExporting(true);
            try {
              const allMatches = await getMatchesByUserId(user.uid);
              const exportData = {
                exportedAt: new Date().toISOString(),
                profile: {
                  uid: profile.uid,
                  username: profile.username,
                  displayName: profile.displayName,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  isPublic: profile.isPublic,
                  createdAt: profile.createdAt,
                },
                matches: allMatches.map(({ id, ...m }) => ({ id, ...m })),
                totalMatches: allMatches.length,
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fabstats-${profile.username}-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              setError("Failed to export data. Please try again.");
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Download My Data"}
        </button>
      </div>

      {/* Clear All Data */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <h2 className="text-sm font-semibold text-fab-text mb-2">Clear All Match Data</h2>
        <p className="text-xs text-fab-dim mb-3">
          Delete all your match history. Your profile and account will be kept. You can re-import afterwards.
        </p>
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-loss/30 text-fab-loss hover:bg-fab-loss/10 transition-colors"
          >
            Clear All Matches...
          </button>
        ) : (
          <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-4">
            <p className="text-sm text-fab-loss font-semibold mb-2">
              This will permanently delete all your match history.
            </p>
            <p className="text-xs text-fab-muted mb-2">
              Type <strong className="text-fab-loss">clear</strong> to confirm:
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="clear"
              className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-fab-loss text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!user) return;
                  setClearing(true);
                  setError("");
                  try {
                    await clearAllMatchesFirestore(user.uid);
                    await refreshMatches();
                    setConfirmClear(false);
                    setClearConfirmText("");
                  } catch {
                    setError("Failed to clear data. Please try again.");
                  } finally {
                    setClearing(false);
                  }
                }}
                disabled={clearing || clearConfirmText !== "clear"}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-loss text-white hover:bg-fab-loss/80 transition-colors disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear All Matches"}
              </button>
              <button
                onClick={() => {
                  setConfirmClear(false);
                  setClearConfirmText("");
                }}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-fab-text mb-4">Account</h2>
        <div className="space-y-4">
          <button
            onClick={() => signOut()}
            className="px-6 py-2 rounded-lg font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
          >
            Sign Out
          </button>

          <div className="pt-4 border-t border-fab-border">
            <h3 className="text-sm font-semibold text-fab-loss mb-2">Delete Account</h3>
            <p className="text-xs text-fab-dim mb-3">
              Permanently delete your account and all data. This cannot be undone.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-surface border border-fab-loss/30 text-fab-loss hover:bg-fab-loss/10 transition-colors"
              >
                Delete My Account...
              </button>
            ) : (
              <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-4">
                <p className="text-sm text-fab-loss font-semibold mb-2">
                  This will permanently delete:
                </p>
                <ul className="text-xs text-fab-muted mb-3 space-y-1 list-disc list-inside">
                  <li>All your match history</li>
                  <li>Your profile and username</li>
                  <li>Your leaderboard entry</li>
                  <li>Your account login</li>
                </ul>
                <p className="text-xs text-fab-muted mb-2">
                  Type <strong className="text-fab-loss">delete</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete"
                  className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-fab-loss text-sm"
                />
                {needsPassword && (
                  <div className="mb-3">
                    <p className="text-xs text-fab-muted mb-1">
                      Enter your password to confirm:
                    </p>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full bg-fab-bg border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-loss text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setDeleting(true);
                      setError("");
                      const isGoogle = user.providerData.some(
                        (p) => p.providerId === "google.com"
                      );
                      try {
                        // Step 1: Re-authenticate to get a fresh token
                        if (isGoogle) {
                          await reauthenticateWithPopup(user, new GoogleAuthProvider());
                        } else if (user.email && deletePassword) {
                          const credential = EmailAuthProvider.credential(
                            user.email,
                            deletePassword
                          );
                          await reauthenticateWithCredential(user, credential);
                        } else if (!isGoogle && !deletePassword) {
                          setNeedsPassword(true);
                          setDeleting(false);
                          setError("Please enter your password to confirm deletion.");
                          return;
                        }

                        // Step 2: Delete Firestore data (while auth is still valid)
                        await deleteAccountData(user.uid);

                        // Step 3: Delete Firebase Auth account
                        await deleteUser(user);
                      } catch (err: unknown) {
                        const code = (err as { code?: string })?.code;
                        if (code === "auth/requires-recent-login") {
                          if (isGoogle) {
                            setError("Please allow the Google sign-in popup to confirm deletion.");
                          } else {
                            setNeedsPassword(true);
                            setError("Please enter your password to confirm deletion.");
                          }
                        } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
                          setError("Incorrect password. Please try again.");
                        } else {
                          setError("Failed to delete account. Please try again.");
                        }
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting || deleteConfirmText !== "delete" || (needsPassword && !deletePassword)}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-loss text-white hover:bg-fab-loss/80 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteConfirmText("");
                      setDeletePassword("");
                      setNeedsPassword(false);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
