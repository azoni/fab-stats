"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ImportIcon } from "@/components/icons/NavIcons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { trackSupportClick } from "@/lib/analytics";
import { useNotifications } from "@/hooks/useNotifications";
import { useFriends } from "@/hooks/useFriends";
import {
  ChevronRight, LogIn, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { navLinks, moreLinks, userMenuLinks, exploreLinks, resourceLinks } from "./nav-data";
import type { NavLink } from "./nav-data";


// Local icon function definitions removed — using Lucide imports above


export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isGuest, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const { incomingCount: friendRequestCount } = useFriends();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setExpandedSection(null);
  }, [pathname]);

  // Body scroll lock when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isAuthenticated = user && !isGuest;

  const handleCategoryTap = useCallback((link: NavLink) => {
    if (!link.subItems || link.subItems.length === 0) {
      router.push(link.href);
      setMenuOpen(false);
      return;
    }
    if (expandedSection === link.href) {
      // Already expanded — navigate to the category page
      router.push(link.href);
      setMenuOpen(false);
    } else {
      setExpandedSection(link.href);
    }
  }, [expandedSection, router]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (!mounted) return null;

  const isExternal = (href: string) => href.startsWith("http");

  return (
    <>
      {/* Fixed top bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 md:hidden bg-fab-surface/95 backdrop-blur-md border-b border-fab-border pt-[env(safe-area-inset-top)]"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
              <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
              <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
              <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
            </svg>
            <span className="text-xl font-bold text-fab-gold tracking-tight">FaB Stats</span>
          </Link>

          {/* Right: notification bell + hamburger */}
          <div className="flex items-center gap-1">
            {isAuthenticated && <NotificationBell />}
            <button
              ref={hamburgerRef}
              onClick={() => setMenuOpen((v) => !v)}
              className="relative p-2 rounded-md text-fab-muted"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <div className="w-5 h-5 flex flex-col justify-center items-center gap-[5px]">
                <span className={`block w-5 h-[2px] bg-current transition-transform duration-200 ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`block w-5 h-[2px] bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-[2px] bg-current transition-transform duration-200 ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
              </div>
              {/* Unread indicator dot */}
              {!menuOpen && (unreadCount > 0 || friendRequestCount > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-fab-loss" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-out menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-hidden="true"
              onClick={closeMenu}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-sm bg-fab-surface border-l border-fab-border md:hidden overflow-y-auto overscroll-contain"
              style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
              role="dialog"
              aria-label="Navigation menu"
            >
              <div className="p-3 space-y-1">
                {/* Profile card */}
                {isAuthenticated && profile?.username && (
                  <div className="border-b border-fab-border/50 pb-2 mb-2">
                    <Link
                      href={`/player/${profile.username}`}
                      onClick={closeMenu}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors active:bg-fab-surface-hover"
                    >
                      {profile.photoUrl ? (
                        <img src={profile.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-fab-border" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold text-sm">
                          {profile.displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fab-text truncate">{profile.displayName || profile.username}</p>
                        <p className="text-xs text-fab-muted truncate">@{profile.username}</p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Primary nav links */}
                {navLinks
                  .filter((link) => !link.authOnly || isAuthenticated)
                  .map((link) => {
                    const hasSubItems = link.subItems && link.subItems.length > 0;
                    const isExpanded = expandedSection === link.href;
                    const visibleSubItems = link.subItems?.filter((sub) => !sub.adminOnly || isAdmin) || [];

                    return (
                      <div key={link.href}>
                        <button
                          onClick={() => handleCategoryTap(link)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:bg-fab-surface-hover ${
                            pathname === link.href || pathname.startsWith(link.href + "/")
                              ? `${link.color} ${link.bg}`
                              : "text-fab-text"
                          }`}
                          aria-expanded={hasSubItems ? isExpanded : undefined}
                        >
                          <span className={pathname === link.href || pathname.startsWith(link.href + "/") ? link.color : "text-fab-muted"}>
                            {link.icon}
                          </span>
                          <span className="flex-1 text-left">{link.label}</span>
                          {hasSubItems && visibleSubItems.length > 0 && (
                            <ChevronRight className={`w-4 h-4 text-fab-dim transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                          )}
                        </button>

                        {/* Sub-items */}
                        <AnimatePresence>
                          {isExpanded && visibleSubItems.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-6 pb-1">
                                {visibleSubItems.map((sub) => {
                                  const external = isExternal(sub.href);
                                  const SubTag = external ? "a" : Link;
                                  const extraProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
                                  return (
                                    <SubTag
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={() => {
                                        if (external && sub.label.includes("Shop")) trackSupportClick(sub.label.toLowerCase().replace(/\s/g, "_"));
                                        closeMenu();
                                      }}
                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors active:bg-fab-surface-hover ${
                                        pathname === sub.href ? "text-fab-gold bg-fab-gold/10" : "text-fab-muted"
                                      }`}
                                      {...extraProps}
                                    >
                                      {sub.icon && <span className="text-fab-dim">{sub.icon}</span>}
                                      <span className="flex-1">{sub.label}</span>
                                      {sub.badge && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-fab-gold/20 text-fab-gold">{sub.badge}</span>
                                      )}
                                      {external && <ExternalLink className="w-3 h-3 text-fab-dim" />}
                                    </SubTag>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                {/* Import button */}
                {isAuthenticated && (
                  <Link
                    href="/import"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-fab-gold bg-fab-gold/10 active:bg-fab-gold/20 transition-colors"
                  >
                    <ImportIcon className="w-4 h-4" />
                    Import Matches
                  </Link>
                )}

                {/* Divider + Your Stats section */}
                {isAuthenticated && (
                  <div className="border-t border-fab-border/50 mt-2 pt-2">
                    <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">Your Stats</p>
                    {moreLinks
                      .filter((l) => !l.divider && (!l.authOnly || isAuthenticated) && (!l.adminOnly || isAdmin))
                      .map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={closeMenu}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:bg-fab-surface-hover ${
                            pathname === link.href ? "text-fab-gold bg-fab-gold/10" : "text-fab-text"
                          }`}
                        >
                          <span className={pathname === link.href ? "text-fab-gold" : "text-fab-muted"}>{link.icon}</span>
                          {link.label}
                        </Link>
                      ))}
                  </div>
                )}

                {/* Explore section */}
                <div className="border-t border-fab-border/50 mt-2 pt-2">
                  <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">Explore</p>
                  {exploreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:bg-fab-surface-hover ${
                        pathname === link.href ? "text-fab-gold bg-fab-gold/10" : "text-fab-text"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Account section */}
                {isAuthenticated && (
                  <div className="border-t border-fab-border/50 mt-2 pt-2">
                    <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">Account</p>
                    {userMenuLinks
                      .filter((l) => !l.adminOnly || isAdmin)
                      .map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={closeMenu}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:bg-fab-surface-hover ${
                            pathname === link.href ? "text-fab-gold bg-fab-gold/10" : "text-fab-text"
                          }`}
                        >
                          <span className={pathname === link.href ? "text-fab-gold" : "text-fab-muted"}>{link.icon}</span>
                          <span className="flex-1">{link.label}</span>
                          {link.href === "/friends" && friendRequestCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                              {friendRequestCount}
                            </span>
                          )}
                          {link.href === "/inbox" && unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-fab-loss text-white">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      ))}
                  </div>
                )}

                {/* Resources */}
                <div className="border-t border-fab-border/50 mt-2 pt-2">
                  <p className="px-3 py-1.5 text-xs text-fab-dim font-medium uppercase tracking-wider">Resources</p>
                  {resourceLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:bg-fab-surface-hover ${
                        pathname === link.href ? "text-fab-gold bg-fab-gold/10" : "text-fab-text"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Sign in */}
                {!isAuthenticated && (
                  <div className="border-t border-fab-border/50 mt-2 pt-2">
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-fab-gold/20 text-fab-gold active:bg-fab-gold/30 transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  </div>
                )}

                {/* Social links */}
                <div className="border-t border-fab-border/50 mt-2 pt-2 pb-4 flex items-center justify-center gap-4">
                  <a
                    href="https://discord.gg/WPP5aqCUHY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-fab-muted active:bg-fab-surface-hover transition-colors"
                    onClick={closeMenu}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                    </svg>
                  </a>
                  <a
                    href="https://x.com/FabStats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-fab-muted active:bg-fab-surface-hover transition-colors"
                    onClick={closeMenu}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
