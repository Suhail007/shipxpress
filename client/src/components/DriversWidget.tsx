import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DriversWidget() {
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["/api/drivers"],
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

  return (
    <Card className="shadow-material">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">Active Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {drivers?.slice(0, 5).map((driver: any) => (
              <div key={driver.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} />
                    <AvatarFallback>D{driver.id}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Driver #{driver.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {driver.vehicleType} - {driver.vehicleNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(driver.status)}>
                    <i className={`${getStatusIcon(driver.status)} mr-1 text-xs`}></i>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {driver.location?.address || "Unknown"}
                  </p>
                </div>
              </div>
            ))}
            
            {(!drivers || drivers.length === 0) && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No drivers available</p>
              </div>
            )}
          </div>
        )}
        
        <Button className="w-full mt-4" variant="outline">
          View All Drivers
        </Button>
      </CardContent>
    </Card>
  );
}
