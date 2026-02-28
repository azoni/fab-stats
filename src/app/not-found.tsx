import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-4xl font-bold text-fab-gold mb-2">404</h2>
      <p className="text-fab-muted mb-6">This page doesn't exist.</p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-fab-gold text-fab-bg font-semibold rounded-lg hover:bg-fab-gold-light transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
