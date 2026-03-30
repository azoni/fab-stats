"use client";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getGroupByName, getGroupMembers, joinGroup, leaveGroup } from "@/lib/groups";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GroupHeader } from "@/components/group/GroupHeader";
import { GroupAggregateStats } from "@/components/group/GroupAggregateStats";
import { GroupRoster } from "@/components/group/GroupRoster";
import type { Group, GroupMember, LeaderboardEntry } from "@/types";
import { toast } from "sonner";
import Link from "next/link";

type PageState = "loading" | "not_found" | "loaded";

export default function GroupPage() {
  const pathname = usePathname();
  const groupname = decodeURIComponent(pathname.split("/").pop() || "");
  const { user, profile, isAdmin: isSiteAdmin } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [leaderboardMap, setLeaderboardMap] = useState<Map<string, LeaderboardEntry>>(new Map());

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const viewerRole = useMemo(() => {
    if (!user) return null;
    const m = members.find((m) => m.uid === user.uid);
    return m?.role ?? null;
  }, [user, members]);

  const canJoin = !!user && !!profile && !viewerRole;
  const accent = group?.accentColor || "#d4a843";

  // ── Load group + members + leaderboard data ──
  useEffect(() => {
    if (!groupname) { setState("not_found"); return; }
    let cancelled = false;

    (async () => {
      try {
        const g = await getGroupByName(groupname);
        if (!g || cancelled) { if (!cancelled) setState("not_found"); return; }

        const m = await getGroupMembers(g.id);
        if (cancelled) return;

        // Fetch leaderboard entries for all members
        const lbEntries = await Promise.all(
          m.map(async (member) => {
            try {
              const snap = await getDoc(doc(db, "leaderboard", member.uid));
              if (snap.exists()) return [member.uid, snap.data() as LeaderboardEntry] as const;
            } catch { /* skip private profiles */ }
            return null;
          })
        );

        if (cancelled) return;

        const lbMap = new Map<string, LeaderboardEntry>();
        for (const entry of lbEntries) {
          if (entry) lbMap.set(entry[0], entry[1]);
        }

        setGroup(g);
        setMembers(m);
        setLeaderboardMap(lbMap);
        setState("loaded");
      } catch {
        if (!cancelled) setState("not_found");
      }
    })();

    return () => { cancelled = true; };
  }, [groupname]);

  async function handleJoin() {
    if (!group || !profile) return;
    setJoining(true);
    try {
      await joinGroup(group.id, profile);
      toast.success("You joined the group!");
      const m = await getGroupMembers(group.id);
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!group || !user) return;
    setLeaving(true);
    try {
      await leaveGroup(group.id, user.uid);
      toast.success("You left the group.");
      const m = await getGroupMembers(group.id);
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
    setLeaving(false);
  }

  const lbEntries = [...leaderboardMap.values()];

  if (state === "loading") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-fab-surface rounded-2xl" />
          <div className="grid grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-fab-surface rounded-xl" />)}
          </div>
          <div className="h-48 bg-fab-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-fab-text mb-2">Group Not Found</h1>
        <p className="text-sm text-fab-muted mb-4">This group doesn&apos;t exist or has been disbanded.</p>
        <Link href="/" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <GroupHeader
        group={group!}
        members={members}
        viewerRole={viewerRole}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onShare={() => {}}
        joining={joining}
        leaving={leaving}
        canJoin={canJoin}
        isSiteAdmin={isSiteAdmin}
      />

      {/* Group Stats */}
      <GroupAggregateStats entries={lbEntries} accentColor={accent} />

      {/* Roster */}
      <GroupRoster
        members={members}
        leaderboardMap={leaderboardMap}
        accentColor={accent}
        groupId={group?.id}
        viewerRole={viewerRole}
        viewerUid={user?.uid}
        onMemberUpdated={async () => { if (group) { const m = await getGroupMembers(group.id); setMembers(m); } }}
      />
    </div>
  );
}
