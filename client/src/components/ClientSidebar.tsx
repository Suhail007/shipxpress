import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Package, 
  MapPin, 
  FileText,
  Bell,
  Calculator,
  Calendar,
  Camera,
  Search,
  Clock,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  BarChart3,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import shippxpressLogo from "@assets/logo_ship_1751420016110.jpg";

interface ClientSidebarProps {
  className?: string;
}

const clientMenuItems = [
  {
    title: "Overview",
    items: [
      { icon: BarChart3, label: "Dashboard", href: "/", active: true },
      { icon: TrendingUp, label: "Analytics", href: "/analytics" },
      { icon: Bell, label: "Notifications", href: "/notifications", badge: "2" },
    ]
  },
  {
    title: "Orders",
    items: [
      { icon: Package, label: "All Orders", href: "/orders", badge: "12" },
      { icon: Clock, label: "Pending", href: "/orders?status=pending", badge: "3" },
      { icon: Truck, label: "In Transit", href: "/orders?status=in-transit", badge: "7" },
      { icon: MapPin, label: "Track Orders", href: "/tracking" },
    ]
  },
  {
    title: "Management",
    items: [
      { icon: Calendar, label: "Schedule Pickup", href: "/schedule" },
      { icon: Calculator, label: "Billing", href: "/billing" },
      { icon: FileText, label: "Reports", href: "/reports" },
      { icon: Camera, label: "Documents", href: "/documents" },
    ]
  },
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", href: "/profile" },
      { icon: Search, label: "Order History", href: "/history" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ]
  },
];

export default function ClientSidebar({ className }: ClientSidebarProps) {
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
            alt="ShippXpress" 
            className="w-10 h-10 rounded-lg shadow-lg"
          />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-white">ShippXpress</h1>
              <p className="text-xs text-white/70">Client Portal</p>
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
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Client User"}
              </p>
              <p className="text-xs text-white/70">Client Account</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {clientMenuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {!collapsed && (
              <h3 className="px-6 mb-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                {section.title}
              </h3>
            )}
            <nav className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href === "/" && location === "/");
                
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
                          <Badge variant="secondary" className="ml-auto bg-shippxpress-orange text-white text-xs">
                            {item.badge}
                          </Badge>
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
              className="w-full justify-start bg-shippxpress-orange hover:bg-shippxpress-orange/90 text-white border-none"
            >
              <Package className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start border-white/20 text-white hover:bg-white/10"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Track Package
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