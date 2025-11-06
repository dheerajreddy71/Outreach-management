"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, BarChart3, Settings, Calendar, Users, FileText, LogOut, Menu, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/NotificationBell";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface TeamMembership {
  id: string;
  role: string;
  team: {
    id: string;
    name: string;
    slug?: string;
  };
}

interface UserData {
  user: User;
  teamMemberships?: TeamMembership[];
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch current user
  const { data: userData } = useQuery<UserData>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !pathname?.startsWith("/auth"),
  });

  // Get user's team role (takes precedence over platform role)
  const userRole = userData?.teamMemberships?.[0]?.role || userData?.user?.role || "GUEST";

  const handleLogout = async () => {
    try {
      // Custom signout endpoint
      const res = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      
      if (res.ok) {
        // Best-effort client-side cleanup: expire cookie and clear storages.
        // This complements the server-side Set-Cookie expiration and helps
        // in environments (mobile WebView / older browsers) where the cookie
        // may not be removed immediately.
        try {
          // Expire the session cookie in the browser
          document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        } catch (e) {
          // ignore - may fail in SSR or constrained environments
        }
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          // ignore storage access errors (e.g., in private modes)
        }

        router.push("/auth/signin");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    {
      label: "Inbox",
      href: "/inbox",
      icon: MessageSquare,
      hideForGuest: true,
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      hideForGuest: true,
    },
    {
      label: "Schedule",
      href: "/schedule",
      icon: Calendar,
      hideForGuest: true,
    },
    {
      label: "Contacts",
      href: "/contacts",
      icon: Users,
      hideForGuest: true,
    },
    {
      label: "Templates",
      href: "/templates",
      icon: FileText,
      hideForGuest: true,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      hideForGuest: false, // Settings available for all users
    },
  ];

  // Add admin-only items (check both platform role and team role)
  if (userRole === "ADMIN") {
    navItems.push({
      label: "Error Logs",
      href: "/admin/errors",
      icon: AlertTriangle,
      hideForGuest: false,
    });
  }

  // Filter nav items for GUEST users
  const filteredNavItems = navItems.filter(
    (item) => !(userRole === "GUEST" && item.hideForGuest)
  );

  if (pathname?.startsWith("/auth") || pathname?.startsWith("/onboarding")) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Unified Inbox</h1>
          <p className="text-xs text-gray-500">Multi-Channel Outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <nav
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 z-40 transition-transform duration-300",
          "w-64 lg:w-64",
          "top-0 lg:top-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Unified Inbox</h1>
            <p className="text-xs text-gray-500 mt-1">Multi-Channel Outreach</p>
          </div>
          <NotificationBell />
        </div>

        {/* Mobile Header (in sidebar) */}
        <div className="lg:hidden p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Menu</h1>
        </div>

        <div className="flex-1 py-6 px-3 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200">
          {userData?.user && (
            <div className="mb-3 px-3 py-2">
              <div className="flex items-center gap-3 mb-2">
                {userData.user.image ? (
                  <img
                    src={userData.user.image}
                    alt={userData.user.name || userData.user.email}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {userData.user.name
                      ? userData.user.name[0].toUpperCase()
                      : userData.user.email[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {userData.user.name || "No name set"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {userData.user.email}
                  </div>
                </div>
              </div>
              {userRole && (
                <Badge
                  variant={
                    userRole === "ADMIN"
                      ? "success"
                      : userRole === "EDITOR"
                      ? "warning"
                      : "default"
                  }
                  className="text-xs w-full justify-center"
                >
                  {userRole}
                </Badge>
              )}
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
