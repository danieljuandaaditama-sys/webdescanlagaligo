import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Map, LayoutDashboard, Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/smart-map", label: "Smart Map", icon: Map },
    { href: "/data", label: "Data Perumahan", icon: Database },
    { href: "/metadata", label: "Metadata", icon: FileText },
  ];

  const BASE = import.meta.env.BASE_URL;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{
        backgroundImage: `url(${BASE}assets/bg-village.png)`,
        backgroundSize: "cover",
        backgroundPosition: "bottom center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundColor: "#ddeeff",
      }}
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/40 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-md">
              <Map className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight">TAPO</span>
              <span className="text-xs text-muted-foreground leading-none font-medium">
                Kelurahan Lagaligo
              </span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-transparent">
        {children}
      </main>
    </div>
  );
}
