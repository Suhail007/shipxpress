import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Route, Edit, Plus, Upload, Phone, MapPin, Clock } from "lucide-react";
import CreateOrderModal from "./CreateOrderModal";

interface OrdersTableProps {
  limit?: number;
  showFilters?: boolean;
}

export default function OrdersTable({ limit, showFilters = true }: OrdersTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders", { status: statusFilter, search: searchQuery }],
  });

  const { data: availableDrivers } = useQuery({
    queryKey: ["/api/drivers/available"],
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/assign`, { driverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Driver Assigned",
        description: "Driver has been assigned to the order successfully.",
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
        description: "Failed to assign driver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-error-100 text-error-800";
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "fas fa-clock";
      case "assigned":
        return "fas fa-user-check";
      case "picked":
        return "fas fa-hand-paper";
      case "in_transit":
        return "fas fa-truck";
      case "delivered":
        return "fas fa-check-circle";
      case "failed":
        return "fas fa-times-circle";
      default:
        return "fas fa-question-circle";
    }
  };

  const displayedOrders = limit ? orders?.slice(0, limit) : orders;

  return (
    <>
      <Card className="shadow-material">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {limit ? "Recent Orders" : "Orders"}
            </CardTitle>
            {showFilters && (
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            )}
          </div>
          
          {showFilters && (
            <div className="flex space-x-2 mt-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="picked">Picked</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-40"
              />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-20 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Customer #{order.customerId}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Delivery Location
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.driverId ? (
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.driverId}`} />
                              <AvatarFallback>D{order.driverId}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Driver #{order.driverId}
                              </div>
                              <div className="text-sm text-gray-500">
                                Active
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-gray-100 text-gray-800">
                              Unassigned
                            </Badge>
                            {availableDrivers && availableDrivers.length > 0 && (
                              <Select
                                onValueChange={(driverId) => 
                                  assignDriverMutation.mutate({ 
                                    orderId: order.id, 
                                    driverId: parseInt(driverId) 
                                  })
                                }
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDrivers.map((driver: any) => (
                                    <SelectItem key={driver.id} value={driver.id.toString()}>
                                      Driver #{driver.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(order.status)}>
                          <i className={`${getStatusIcon(order.status)} mr-1`}></i>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.estimatedDeliveryTime ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                          </div>
                        ) : (
                          "Not set"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Route className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && (!displayedOrders || displayedOrders.length === 0) && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No orders found</div>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Order
              </Button>
            </div>
          )}

          {!limit && displayedOrders && displayedOrders.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing 1 to {displayedOrders.length} of {orders?.length || 0} orders
              </div>
              <div className="flex space-x-1">
                <Button size="sm" variant="outline">Previous</Button>
                <Button size="sm" className="bg-primary-600 text-white">1</Button>
                <Button size="sm" variant="outline">2</Button>
                <Button size="sm" variant="outline">3</Button>
                <Button size="sm" variant="outline">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrderModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
