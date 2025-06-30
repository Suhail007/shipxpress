import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MapPin, Truck } from "lucide-react";

export default function Drivers() {
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

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ["/api/drivers"],
    enabled: isAuthenticated,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-success-100 text-success-800";
      case "on_delivery":
        return "bg-warning-100 text-warning-800";
      case "break":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return "fas fa-circle text-success-500";
      case "on_delivery":
        return "fas fa-truck text-warning-500";
      case "break":
        return "fas fa-pause text-gray-500";
      default:
        return "fas fa-circle text-gray-500";
    }
  };

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
          title="Driver Management"
          subtitle="Monitor driver status and manage assignments"
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <Button>Add New Driver</Button>
              <Button variant="outline">Import Drivers</Button>
            </div>
          </div>

          {driversLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-16 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers?.map((driver: any) => (
                <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} />
                          <AvatarFallback>
                            {driver.userId?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">Driver #{driver.id}</CardTitle>
                          <p className="text-sm text-gray-500">{driver.userId}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(driver.status)}>
                        <i className={`${getStatusIcon(driver.status)} mr-1 text-xs`}></i>
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {driver.vehicleType && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Truck className="h-4 w-4 mr-2" />
                        {driver.vehicleType} - {driver.vehicleNumber}
                      </div>
                    )}
                    
                    {driver.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {driver.phone}
                      </div>
                    )}
                    
                    {driver.location?.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {driver.location.address}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-4 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Assign Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!driversLoading && (!drivers || drivers.length === 0) && (
            <Card className="text-center py-12">
              <CardContent>
                <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Found</h3>
                <p className="text-gray-500 mb-4">
                  Get started by adding your first driver to the system.
                </p>
                <Button>Add New Driver</Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
