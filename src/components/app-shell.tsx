import { Link, NavLink, Outlet } from "react-router-dom"

import { cn } from "@/lib/utils"
import { MorningsideLogo } from "@/components/morningside-logo"

const navItems = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Executive Dashboard" },
  { to: "/roster", label: "Team Roster" },
  { to: "/scope-guard", label: "Scope Guard" },
  { to: "/audit", label: "Data Audit" },
] as const

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(65,156,115,0.18),transparent_55%),radial-gradient(700px_circle_at_85%_0%,rgba(65,156,115,0.12),transparent_55%),radial-gradient(900px_circle_at_50%_120%,rgba(255,255,255,0.06),transparent_60%)]" />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <Link
            to="/"
            aria-label="Home"
            className="rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <MorningsideLogo className="h-13 w-auto" />
          </Link>

          <nav className="ml-auto flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "text-sm transition-colors",
                    isActive
                      ? "text-white underline decoration-primary decoration-2 underline-offset-[14px]"
                      : "text-foreground/80 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
