import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Package, 
  Truck, 
  Users, 
  BarChart3, 
  MapPin,
  FileText,
  Settings,
  Bell,
  Calculator,
  Calendar,
  Camera,
  Search,
  UserCheck,
  Route,
  Clock,
  TrendingUp,
  Shield,
  Database,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import shippxpressLogo from "@/assets/shippxpress-logo.jpg";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  {
    title: "Overview",
    items: [
      { icon: BarChart3, label: "Dashboard", href: "/", active: true },
      { icon: TrendingUp, label: "Analytics", href: "/analytics" },
      { icon: Bell, label: "Notifications", href: "/notifications", badge: "3" },
    ]
  },
  {
    title: "Operations",
    items: [
      { icon: Package, label: "Orders", href: "/orders", badge: "12" },
      { icon: Route, label: "Routes", href: "/routes" },
      { icon: MapPin, label: "Tracking", href: "/tracking" },
      { icon: Calendar, label: "Schedule", href: "/schedule" },
      { icon: Clock, label: "Deliveries", href: "/deliveries" },
    ]
  },
  {
    title: "Management",
    items: [
      { icon: Truck, label: "Drivers", href: "/drivers" },
      { icon: Users, label: "Customers", href: "/customers" },
      { icon: UserCheck, label: "Clients", href: "/clients" },
      { icon: MapPin, label: "Zones", href: "/zones" },
    ]
  },
  {
    title: "Business",
    items: [
      { icon: Calculator, label: "Billing", href: "/billing" },
      { icon: FileText, label: "Reports", href: "/reports" },
      { icon: Camera, label: "Documents", href: "/documents" },
      { icon: Search, label: "Audit Log", href: "/audit" },
    ]
  },
  {
    title: "System",
    items: [
      { icon: Database, label: "Data Export", href: "/export" },
      { icon: Shield, label: "Security", href: "/security" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ]
  },
];

export default function ShippXpressSidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className={cn(
      "shippxpress-sidebar flex flex-col h-screen transition-all duration-300 shadow-2xl",
      collapsed ? "w-16" : "w-72",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <img 
            src={shippxpressLogo} 
            alt="Ship Station" 
            className="w-10 h-10 rounded-lg shadow-lg"
          />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-white">Ship Station</h1>
              <p className="text-xs text-white/70">Logistics Platform</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-white/10 p-1"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.firstName || "Super"} {user?.lastName || "Admin"}
              </p>
              <p className="text-xs text-white/70 capitalize">{user?.role || "administrator"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {!collapsed && (
              <h3 className="px-6 mb-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                {section.title}
              </h3>
            )}
            <nav className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <a
                    key={itemIndex}
                    href={item.href}
                    className={cn(
                      "sidebar-item",
                      isActive && "active"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-secondary text-secondary-foreground text-xs rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="space-y-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full justify-start bg-secondary hover:bg-secondary/90"
            >
              <Package className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start border-white/20 text-white hover:bg-white/10"
            >
              <Truck className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "text-white hover:bg-white/10 transition-colors",
            collapsed ? "w-full justify-center p-2" : "w-full justify-start"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}