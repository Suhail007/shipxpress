import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatsGrid from "@/components/StatsGrid";
import OrdersTable from "@/components/OrdersTable";
import DriversWidget from "@/components/DriversWidget";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="Dashboard Overview"
          subtitle="Monitor your logistics operations in real-time"
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <StatsGrid stats={stats} loading={statsLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <OrdersTable limit={10} showFilters={false} />
            </div>
            
            <div className="space-y-6">
              <DriversWidget />
              
              {/* Quick Actions Widget */}
              <div className="bg-white rounded-lg shadow-material p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
                    <i className="fas fa-plus mr-3"></i>
                    Create New Order
                  </button>
                  <button className="w-full flex items-center px-4 py-3 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 transition-colors">
                    <i className="fas fa-user-plus mr-3"></i>
                    Assign Driver
                  </button>
                  <button className="w-full flex items-center px-4 py-3 bg-warning-50 text-warning-700 rounded-lg hover:bg-warning-100 transition-colors">
                    <i className="fas fa-chart-bar mr-3"></i>
                    Generate Report
                  </button>
                  <button className="w-full flex items-center px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    <i className="fas fa-upload mr-3"></i>
                    Bulk Upload CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
