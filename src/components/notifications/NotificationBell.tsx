"use client";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export function NotificationBell() {
  const { user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user || isGuest) return null;

  const tooltipText = unreadCount > 0
    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    : "Notifications";

  return (
    <Tooltip content={tooltipText} side="top">
      <Link
        href="/notifications"
        className="relative p-1 rounded text-fab-muted hover:text-fab-text transition-colors"
        aria-label={tooltipText}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-fab-loss text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}
