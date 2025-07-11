import { Link, useLocation } from "wouter";
import { Truck, BarChart3, Package, Users, Route, FileText, Settings, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  
  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: location === "/" },
    { name: "Orders", href: "/orders", icon: Package, current: location === "/orders" },
    { name: "Drivers", href: "/drivers", icon: Users, current: location === "/drivers" },
    { name: "Live Tracking", href: "/tracking", icon: Route, current: location === "/tracking" },
  ];

  const management = [
    { name: "Billing & Reports", href: "/billing", icon: FileText, current: location === "/billing" },
    { name: "Settings", href: "/settings", icon: Settings, current: location === "/settings" },
    { name: "User Management", href: "/users", icon: ShieldQuestion, current: location === "/users" },
  ];

  return (
    <div className="hidden lg:flex w-64 bg-white shadow-material">
      <div className="flex flex-col w-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <Truck className="h-6 w-6 text-primary-600 mr-2" />
            LogiTrack
          </h1>
          <p className="text-sm text-gray-500">Logistics Platform</p>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 flex-1">
          <div className="px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Main
          </div>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer",
                      item.current && "bg-primary-50 border-r-2 border-primary-600 text-primary-600"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                    {item.name === "Orders" && (
                      <span className="ml-auto bg-warning-500 text-white text-xs rounded-full px-2 py-1">
                        12
                      </span>
                    )}
                    {item.name === "Drivers" && (
                      <span className="ml-auto bg-success-500 text-white text-xs rounded-full px-2 py-1">
                        5
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          
          <div className="px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide mt-6">
            Management
          </div>
          <div className="space-y-1">
            {management.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer",
                      item.current && "bg-primary-50 border-r-2 border-primary-600 text-primary-600"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
