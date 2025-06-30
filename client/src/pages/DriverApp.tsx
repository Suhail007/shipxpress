import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, 
  Package, 
  Route, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Navigation, 
  Camera, 
  CheckCircle,
  AlertTriangle,
  Menu
} from "lucide-react";

export default function DriverApp() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("home");

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

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated && user?.role === "driver",
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-primary-100 text-primary-800";
      case "picked":
        return "bg-warning-100 text-warning-800";
      case "in_transit":
        return "bg-warning-100 text-warning-800";
      case "delivered":
        return "bg-success-100 text-success-800";
      case "failed":
        return "bg-error-100 text-error-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentOrders = orders?.filter((order: any) => 
    ["assigned", "picked", "in_transit"].includes(order.status)
  ) || [];

  const completedOrders = orders?.filter((order: any) => 
    ["delivered", "failed"].includes(order.status)
  ) || [];

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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "D"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {user?.firstName} {user?.lastName} 
              </h3>
              <p className="text-primary-100 text-sm">Driver</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-white">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6">
            {activeTab === "home" && (
              <div>
                {/* Stats Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {orders?.length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-success-600">
                        {completedOrders.length}
                      </p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning-600">
                        {currentOrders.length}
                      </p>
                      <p className="text-sm text-gray-600">Active</p>
                    </div>
                  </div>
                </div>

                {/* Current Delivery */}
                {currentOrders.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Current Delivery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentOrders.slice(0, 1).map((order: any) => (
                        <div key={order.id} className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-800">{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">Customer Order</p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm mb-4">
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{order.deliveryAddress}</span>
                            </div>
                            {order.estimatedDeliveryTime && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>
                                  ETA: {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button size="sm" className="flex-1">
                              <Navigation className="h-4 w-4 mr-1" />
                              Navigate
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Phone className="h-4 w-4 mr-1" />
                              Call
                            </Button>
                          </div>

                          <div className="flex space-x-2 mt-3">
                            {order.status === "assigned" && (
                              <Button 
                                size="sm" 
                                className="flex-1 bg-warning-600 hover:bg-warning-700"
                                onClick={() => updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: "picked" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                Mark as Picked
                              </Button>
                            )}
                            {order.status === "picked" && (
                              <Button 
                                size="sm" 
                                className="flex-1 bg-warning-600 hover:bg-warning-700"
                                onClick={() => updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: "in_transit" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                Start Delivery
                              </Button>
                            )}
                            {order.status === "in_transit" && (
                              <Button 
                                size="sm" 
                                className="flex-1 bg-success-600 hover:bg-success-700"
                                onClick={() => updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: "delivered" 
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Delivered
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Delivery Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full bg-success-600 hover:bg-success-700">
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Delivery Proof
                    </Button>
                    <Button className="w-full bg-error-600 hover:bg-error-700">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">My Orders</h2>
                
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    {currentOrders.map((order: any) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-800">{order.orderNumber}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span className="truncate">{order.deliveryAddress}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              View Details
                            </Button>
                            <Button size="sm" className="flex-1">
                              Update Status
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {currentOrders.length === 0 && (
                      <Card className="text-center py-8">
                        <CardContent>
                          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Active Orders
                          </h3>
                          <p className="text-gray-500">
                            You don't have any active deliveries at the moment.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-50">
            <TabsTrigger value="home" className="flex flex-col items-center py-2">
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex flex-col items-center py-2">
              <Package className="h-5 w-5 mb-1" />
              <span className="text-xs">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex flex-col items-center py-2">
              <Route className="h-5 w-5 mb-1" />
              <span className="text-xs">Routes</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center py-2">
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
