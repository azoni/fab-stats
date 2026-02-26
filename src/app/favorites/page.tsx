"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesPage() {
  const { user, isGuest } = useAuth();
  const { favorites, isLoaded } = useFavorites();

  if (!user || isGuest) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted mb-4">Sign in to favorite player profiles.</p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-fab-surface rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-4 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Favorites</h1>
        <p className="text-fab-muted text-sm mt-1">Players you&apos;ve starred</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-fab-dim mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <p className="text-fab-muted mb-2">No favorites yet</p>
          <p className="text-fab-dim text-sm">Visit a player&apos;s profile and tap the star to add them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <Link
              key={fav.targetUserId}
              href={`/player/${fav.targetUsername}`}
              className="flex items-center gap-3 bg-fab-surface border border-fab-border rounded-lg p-3 hover:bg-fab-surface-hover transition-colors"
            >
              {fav.targetPhotoUrl ? (
                <img src={fav.targetPhotoUrl} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold">
                  {fav.targetDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium text-fab-text truncate">{fav.targetDisplayName}</div>
                <div className="text-xs text-fab-dim">@{fav.targetUsername}</div>
              </div>
              <svg className="w-4 h-4 text-fab-gold ml-auto shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
