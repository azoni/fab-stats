"use client";
import { useState, useRef, useMemo, useEffect } from "react";
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
import { deleteAllFeedEventsForUser, syncFeedEventsVisibility } from "@/lib/feed";
import { SparklesIcon } from "@/components/icons/NavIcons";
import { logActivity } from "@/lib/activity-log";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { useCreators } from "@/hooks/useCreators";
import { platformIcons } from "@/components/layout/Navbar";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_OPTIONS, type ThemeName } from "@/lib/theme-config";
import { Switch } from "@/components/ui/switch";
import { Collapsible } from "@/components/ui/collapsible";
import { BackgroundChooser } from "@/components/profile/BackgroundChooser";
import { Settings, CheckCircle, Camera, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas 2D context not available")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const THEME_PREVIEWS: Record<ThemeName, { bg: string; surface: string; border: string; accent: string; text: string; muted: string; radius: string }> = {
  grimoire: { bg: "#0e0c08", surface: "#1c1812", border: "#3e3528", accent: "#d4a54a", text: "#e6ddd0", muted: "#9a8e7a", radius: "4px" },
  leyline: { bg: "#08080f", surface: "#14142a", border: "#1e2050", accent: "#7b8fff", text: "#e0e4f0", muted: "#6b7094", radius: "10px" },
  rosetta: { bg: "#0a0a0a", surface: "#141414", border: "#262626", accent: "#f0f0f0", text: "#fafafa", muted: "#737373", radius: "2px" },
};

function ThemePicker() {
  const { theme, setTheme, resetTheme, isCustom } = useTheme();

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-fab-text">Appearance</h2>
        {isCustom && (
          <button
            onClick={resetTheme}
            className="text-[11px] text-fab-dim hover:text-fab-muted transition-colors"
          >
            Reset to default
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const p = THEME_PREVIEWS[opt.value];
          const selected = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`relative rounded-lg p-3 text-left transition-all ${
                selected
                  ? "ring-2 ring-fab-gold"
                  : "ring-1 ring-fab-border hover:ring-fab-muted"
              }`}
            >
              {/* Mini preview */}
              <div
                className="overflow-hidden mb-2.5 border"
                style={{ background: p.bg, borderColor: p.border, borderRadius: p.radius }}
              >
                {/* Simulated header bar */}
                <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: `1px solid ${p.border}` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }} />
                  <div className="h-1 flex-1 rounded-full" style={{ background: p.muted, opacity: 0.3 }} />
                </div>
                {/* Simulated content */}
                <div className="p-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    <div className="w-1/2 h-6" style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius }} />
                    <div className="w-1/2 h-6" style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius }} />
                  </div>
                  <div className="h-4" style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius }} />
                  <div className="flex gap-1.5">
                    <div className="h-2 w-8" style={{ background: p.accent, borderRadius: p.radius }} />
                    <div className="h-2 flex-1" style={{ background: p.muted, opacity: 0.2, borderRadius: p.radius }} />
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold text-fab-text">{opt.label}</p>
              <p className="text-[10px] text-fab-dim leading-tight mt-0.5">{opt.description}</p>
              {selected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-4 h-4 text-fab-gold" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearInReview() {
  const { matches } = useMatches();

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
      <Collapsible
        title={
          <h2 className="text-sm font-semibold text-fab-text flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-fab-gold" />
            Year in Review
          </h2>
        }
      >
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
                  <ChevronRight className="w-4 h-4 text-fab-dim group-hover:text-fab-gold transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </Collapsible>
    </div>
  );
}

export default function SettingsPage() {
  const { user, profile, signOut, isGuest, isAdmin, refreshProfile } = useAuth();
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
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends" | "private">(
    profile?.profileVisibility ?? (profile?.isPublic ? "public" : "private")
  );
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showNameOnProfiles, setShowNameOnProfiles] = useState(profile?.showNameOnProfiles ?? false);
  const [togglingName, setTogglingName] = useState(false);
  const [hideFromSpotlight, setHideFromSpotlight] = useState(profile?.hideFromSpotlight ?? false);
  const [togglingSpotlight, setTogglingSpotlight] = useState(false);
  const [hideFromFeed, setHideFromFeed] = useState(profile?.hideFromFeed ?? false);
  const [togglingFeed, setTogglingFeed] = useState(false);
  const [hideFromGuests, setHideFromGuests] = useState(profile?.hideFromGuests ?? false);
  const [togglingGuests, setTogglingGuests] = useState(false);
  const [siteBackgroundId, setSiteBackgroundId] = useState(profile?.siteBackgroundId || "none");
  const [savingBackground, setSavingBackground] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  useEffect(() => {
    setSiteBackgroundId(profile?.siteBackgroundId || "none");
  }, [profile?.siteBackgroundId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setError("");
    setSaving(true);
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
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 200);
      await uploadProfilePhoto(user.uid, dataUrl);
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error("Failed to upload photo. Please try again.");
      setUploading(false);
      return;
    }
    try {
      await refreshProfile();
    } catch {
      // Photo was saved, refresh just didn't pick it up yet
    }
    setUploading(false);
    toast.success("Photo updated");
  }

  async function handleBackgroundChange(nextId: string) {
    if (!user || savingBackground) return;
    const previousId = siteBackgroundId;
    setSiteBackgroundId(nextId);
    setSavingBackground(true);
    try {
      await updateProfile(user.uid, { siteBackgroundId: nextId });
      await refreshProfile();
      logActivity("background_change", nextId);
      toast.success("Background updated");
    } catch {
      setSiteBackgroundId(previousId);
      toast.error("Failed to update background.");
    } finally {
      setSavingBackground(false);
    }
  }

  if (isGuest) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center ring-1 ring-inset ring-slate-500/20">
            <Settings className="w-4 h-4 text-slate-400" />
          </div>
          <h1 className="text-lg font-bold text-fab-text leading-tight">Settings</h1>
        </div>
        <ThemePicker />
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center ring-1 ring-inset ring-slate-500/20">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-fab-text leading-tight">Settings</h1>
      </div>

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
              <Camera className="w-5 h-5 text-white" />
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

      {/* Appearance */}
      <ThemePicker />

      {/* Profile background */}
      <div id="background" className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-fab-text">Profile Background</h2>
          {isAdmin && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-fab-gold/15 text-fab-gold">Admin: full FaB art library</span>
          )}
        </div>
        <p className="text-xs text-fab-dim mb-3">
          This background is shown across your site view and on your public profile. When viewing another player&apos;s profile, their selected background is used.
        </p>
        <BackgroundChooser
          selectedId={siteBackgroundId}
          isAdmin={isAdmin}
          onSelect={handleBackgroundChange}
          disabled={savingBackground}
        />
        <p className="text-[10px] text-fab-dim mt-2">{savingBackground ? "Saving background..." : "Tip: You can also change this directly from your profile page."}</p>
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
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Privacy */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-6 mb-4">
        <Collapsible title={<h2 className="text-sm font-semibold text-fab-text">Privacy</h2>} defaultOpen>
          <div className="mt-4">
            <div>
              <p className="text-sm text-fab-text mb-1">Profile Visibility</p>
              <p className="text-xs text-fab-dim mb-3">
                {profileVisibility === "public"
                  ? "Anyone can view your profile, match history, and stats. Opponent names are hidden from viewers."
                  : profileVisibility === "friends"
                  ? "Only your friends can view your profile. Others will see a private profile page."
                  : "Your profile is private. Only you can see your data."}
              </p>
              <div className={`flex rounded-lg border border-fab-border overflow-hidden ${togglingPublic ? "opacity-50 pointer-events-none" : ""}`}>
                {(["public", "friends", "private"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={async () => {
                      if (!user || profileVisibility === opt) return;
                      setTogglingPublic(true);
                      try {
                        const nextPublic = opt === "public";
                        await updateProfile(user.uid, { isPublic: nextPublic, profileVisibility: opt });
                        setProfileVisibility(opt);
                        // Sync feed events visibility in background
                        if (profile) {
                          const updatedProfile = { ...profile, isPublic: nextPublic };
                          getMatchesByUserId(user.uid)
                            .then((matches) => syncFeedEventsVisibility(updatedProfile, matches))
                            .catch(() => {});
                        }
                      } catch {
                        toast.error("Failed to update privacy setting.");
                      } finally {
                        setTogglingPublic(false);
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                      profileVisibility === opt
                        ? opt === "public"
                          ? "bg-fab-win/20 text-fab-win border-r border-fab-border"
                          : opt === "friends"
                          ? "bg-sky-500/20 text-sky-400 border-r border-fab-border"
                          : "bg-fab-border text-fab-text"
                        : "bg-fab-bg text-fab-dim hover:text-fab-muted border-r border-fab-border last:border-r-0"
                    }`}
                  >
                    {opt === "public" ? "Public" : opt === "friends" ? "Friends" : "Private"}
                  </button>
                ))}
              </div>
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
              <Switch
                checked={showNameOnProfiles}
                onCheckedChange={async (next) => {
                  if (!user) return;
                  setTogglingName(true);
                  try {
                    await updateProfile(user.uid, { showNameOnProfiles: next });
                    setShowNameOnProfiles(next);
                  } catch {
                    toast.error("Failed to update setting.");
                  } finally {
                    setTogglingName(false);
                  }
                }}
                disabled={togglingName}
                label="Show Name on Opponent Profiles"
              />
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
              <Switch
                checked={hideFromSpotlight}
                onCheckedChange={async (next) => {
                  if (!user) return;
                  setTogglingSpotlight(true);
                  try {
                    await updateProfile(user.uid, { hideFromSpotlight: next });
                    setHideFromSpotlight(next);
                  } catch {
                    toast.error("Failed to update setting.");
                  } finally {
                    setTogglingSpotlight(false);
                  }
                }}
                disabled={togglingSpotlight}
                label="Hide from Player Spotlight"
              />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-fab-border">
              <div>
                <p className="text-sm text-fab-text">Hide from Activity Feed</p>
                <p className="text-xs text-fab-dim mt-0.5">
                  {hideFromFeed
                    ? "Your imports, achievements, and placements won't appear in the community feed."
                    : "Your activity (imports, achievements, placements) is shown in the community feed."}
                </p>
              </div>
              <Switch
                checked={hideFromFeed}
                onCheckedChange={async (next) => {
                  if (!user) return;
                  setTogglingFeed(true);
                  try {
                    await updateProfile(user.uid, { hideFromFeed: next });
                    setHideFromFeed(next);
                  } catch {
                    toast.error("Failed to update setting.");
                  } finally {
                    setTogglingFeed(false);
                  }
                }}
                disabled={togglingFeed}
                label="Hide from Activity Feed"
              />
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
              <Switch
                checked={hideFromGuests}
                onCheckedChange={async (next) => {
                  if (!user) return;
                  setTogglingGuests(true);
                  try {
                    await updateProfile(user.uid, { hideFromGuests: next });
                    setHideFromGuests(next);
                  } catch {
                    toast.error("Failed to update setting.");
                  } finally {
                    setTogglingGuests(false);
                  }
                }}
                disabled={togglingGuests}
                label="Hide from Guests"
              />
            </div>
          </div>
        </Collapsible>
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
          <Collapsible title={<h2 className="text-sm font-semibold text-fab-text">Featured Creators</h2>}>
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
                    <ExternalLink className="w-3.5 h-3.5 text-fab-dim shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </Collapsible>
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
          <ChevronRight className="w-4 h-4" />
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
                    siteBackgroundId: profile.siteBackgroundId,
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
                    await deleteAllFeedEventsForUser(user.uid);
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
