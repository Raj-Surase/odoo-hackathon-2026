import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  User,
  LogOut,
  Settings,
  Calendar,
  FolderOpen,
  BarChart3,
  Hammer,
  ClipboardCheck,
  Bell,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/AuthContext";
import { Logo } from "@/components/Logo";

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const menuGroups = [
    {
      category: "",
      items: [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
      ]
    },
    {
      category: "Assets & Operations",
      items: [
        { name: "Asset Directory", path: "/assets", icon: FolderOpen },
        { name: "Allocations & Transfers", path: "/allocations", icon: RefreshCw },
        { name: "Resource Booking", path: "/bookings", icon: Calendar },
        { name: "Maintenance", path: "/maintenance", icon: Hammer },
        { name: "Asset Audits", path: "/audits", icon: ClipboardCheck },
      ]
    },
    {
      category: "System & Management",
      items: [
        // Only show Organization Setup to Admins
        ...(user?.role === 'Admin' ? [{ name: "Organization Setup", path: "/setup", icon: Settings }] : []),
        { name: "Reports & Analytics", path: "/reports", icon: BarChart3 },
        { name: "Notifications & Logs", path: "/notifications", icon: Bell },
      ]
    }
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const getBreadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return [
      { name: "Home", path: "/" },
      ...parts.map((part, index) => {
        const path = "/" + parts.slice(0, index + 1).join("/");
        const name = part.charAt(0).toUpperCase() + part.slice(1).replace("-", " ");
        return { name, path };
      }),
    ];
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full text-sidebar-foreground select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-center h-16 border-b border-sidebar-border w-full shrink-0 bg-sidebar-accent/10">
        <Logo className="h-16 w-full object-contain" />
      </div>

      {/* Menu Links */}
      <nav ref={navRef} className="flex-1 overflow-y-auto space-y-1 py-4 no-scrollbar">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-0.5">
            {group.category && (
              <h3 className="px-6 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase pt-3 pb-1 font-sans">
                {group.category}
              </h3>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-6 py-2.5 transition-all duration-200 border-l-4",
                    active
                      ? "bg-primary/10 text-primary border-primary font-semibold"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40 border-transparent"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")} />
                  <span className="text-sm font-sans">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Profile */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/15 mt-auto flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border shrink-0">
            <User className="h-5 w-5 text-sidebar-foreground/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-sidebar-foreground/50 font-sans uppercase tracking-wider font-bold leading-none">Role</p>
            <p className="text-sm font-semibold text-sidebar-foreground font-sans mt-0.5 leading-none truncate max-w-[110px]" title={user?.name || "Superadmin"}>
              {user?.name || "Superadmin"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-2xl shrink-0"
          onClick={logout}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground font-sans flex flex-col">
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-card/80 backdrop-blur-xl rounded-full shadow-glass border border-border/50 text-foreground hover:bg-accent/50 transition-all duration-300"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform duration-300 md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {renderSidebarContent()}
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop/Tablet Flat Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border/40 px-6 md:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            {/* Spacer for mobile menu button when menu is closed */}
            {isMobile && <div className="w-12 h-10" />}

            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground font-sans select-none">
              {getBreadcrumbs().map((crumb, index, arr) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                  {index === arr.length - 1 ? (
                    <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-foreground transition-all duration-200">
                      {crumb.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </header>

        {/* Content Body */}
        <main ref={mainRef} className="flex-1 p-6 md:p-10 pt-4 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

