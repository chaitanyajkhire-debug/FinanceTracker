import Link from "next/link";
import { logout } from "@/app/login/actions";
import { RefreshButton } from "@/components/refresh-button";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/mutual-funds", label: "Mutual Funds" },
  { href: "/stocks", label: "Stocks" },
  { href: "/nps", label: "NPS" },
];

export function NavBar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="text-lg">📈</span> FinanceTracker
          </span>
          <nav className="flex gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
