export default function TweetCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fab-bg">
      <div className="relative flex w-[1200px] h-[675px] flex-col items-center justify-center overflow-hidden">
        {/* Top gold line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-fab-gold to-transparent" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(232,184,76,0.08)_0%,transparent_70%)]" />

        <p className="text-sm font-bold uppercase tracking-[3px] text-fab-gold/60 mb-3">FaB Stats</p>
        <h1 className="font-[var(--font-nunito)] text-[52px] font-black text-fab-text tracking-tight mb-2">Hero Shield Badges</h1>
        <p className="text-xl text-fab-dim mb-12">Track your hero data completion. Fill in your heroes to rank up.</p>

        <div className="flex items-end gap-6">
          {/* Bronze */}
          <div className="flex flex-col items-center gap-2.5">
            <svg className="w-14 h-14 drop-shadow-lg" viewBox="0 0 24 24" fill="#cd7f32"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z"/></svg>
            <span className="text-[15px] font-extrabold uppercase tracking-wider text-[#cd7f32]">Bronze</span>
            <span className="text-sm font-bold text-fab-dim">35%+</span>
          </div>
          <div className="w-px h-16 bg-fab-border self-center" />
          {/* Blue */}
          <div className="flex flex-col items-center gap-2.5">
            <svg className="w-14 h-14 drop-shadow-lg" viewBox="0 0 24 24" fill="#60a5fa"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z"/></svg>
            <span className="text-[15px] font-extrabold uppercase tracking-wider text-[#60a5fa]">Blue</span>
            <span className="text-sm font-bold text-fab-dim">50%+</span>
          </div>
          <div className="w-px h-16 bg-fab-border self-center" />
          {/* Red */}
          <div className="flex flex-col items-center gap-2.5">
            <svg className="w-14 h-14 drop-shadow-lg" viewBox="0 0 24 24" fill="#f87171"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z"/></svg>
            <span className="text-[15px] font-extrabold uppercase tracking-wider text-[#f87171]">Red</span>
            <span className="text-sm font-bold text-fab-dim">75%+</span>
          </div>
          <div className="w-px h-16 bg-fab-border self-center" />
          {/* Purple */}
          <div className="flex flex-col items-center gap-2.5">
            <svg className="w-14 h-14 drop-shadow-lg" viewBox="0 0 24 24" fill="#a78bfa"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z"/></svg>
            <span className="text-[15px] font-extrabold uppercase tracking-wider text-[#a78bfa]">Purple</span>
            <span className="text-sm font-bold text-fab-dim">90%+</span>
          </div>
          <div className="w-px h-16 bg-fab-border self-center" />
          {/* Gold */}
          <div className="flex flex-col items-center gap-2.5">
            <svg className="w-[72px] h-[72px] drop-shadow-lg" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 13.5l-3.5-3.5 1.41-1.41L10.5 11.67l5.09-5.09L17 8l-6.5 6.5z"/></svg>
            <span className="text-[15px] font-extrabold uppercase tracking-wider text-[#fbbf24]">Gold</span>
            <span className="text-sm font-bold text-fab-dim">100%</span>
          </div>
        </div>

        <p className="absolute bottom-7 text-base font-bold tracking-wider text-fab-border"><span className="text-fab-gold">fabstats.net</span></p>
      </div>
    </div>
  );
}
