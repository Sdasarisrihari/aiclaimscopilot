import { Link, useRouterState } from "@tanstack/react-router";
import { FileUp, ListChecks, MessagesSquare, Car, ClipboardCheck, ShieldHalf } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Intake", icon: FileUp },
  { to: "/extraction", label: "Extraction", icon: ListChecks },
  { to: "/assistant", label: "Policy assistant", icon: MessagesSquare },
  { to: "/review", label: "Review queue", icon: ClipboardCheck },
  { to: "/vin", label: "VIN lookup", icon: Car },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { reviewItems, resolutions } = useStore();
  const open = reviewItems.filter((i) => !resolutions[i.id]).length;
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-rail text-rail-foreground md:w-60 md:min-h-screen md:sticky md:top-0 shrink-0">
        <div className="flex items-center gap-2 px-5 py-4 md:py-6">
          <ShieldHalf className="h-6 w-6 text-sidebar-primary" />
          <div>
            <div className="font-display text-lg leading-none">Claims Copilot</div>
            <div className="text-[11px] uppercase tracking-widest opacity-60 mt-1">Synthetic demo</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 px-2 pb-3 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-sidebar-accent", path === to && "bg-sidebar-accent text-sidebar-accent-foreground")}>
              <Icon className="h-4 w-4" />
              {label}
              {to === "/review" && open > 0 && <span className="ml-auto rounded-full bg-sidebar-primary px-2 text-xs font-semibold text-sidebar-primary-foreground">{open}</span>}
            </Link>
          ))}
        </nav>
        <p className="hidden md:block px-5 pt-6 text-xs opacity-60 leading-relaxed">AI output is decision support only. No coverage decisions, approvals or settlement amounts are produced.</p>
      </aside>
      <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10 max-w-6xl">{children}</main>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">{sub}</p>
    </header>
  );
}
