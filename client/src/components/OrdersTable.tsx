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
import { Eye, Route, Edit, Plus, Upload, Phone, MapPin, Clock, FileText, Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateOrderModal from "./CreateOrderModal";
import ShippingLabel from "./ShippingLabel";
import { Order, Driver } from "@shared/schema";

interface OrdersTableProps {
  limit?: number;
  showFilters?: boolean;
  statusFilter?: string;
}

export default function OrdersTable({ limit, showFilters = true, statusFilter: propStatusFilter }: OrdersTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Use propStatusFilter if provided, otherwise use local state
  const activeStatusFilter = propStatusFilter || statusFilter;

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", { status: activeStatusFilter, search: searchQuery }],
  });

  const { data: availableDrivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/available"],
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      await apiRequest(`/api/orders/${orderId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ driverId }),
        headers: { "Content-Type": "application/json" },
      });
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

  const voidOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest(`/api/orders/${orderId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: "Client requested cancellation" }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Voided",
        description: "Order has been voided successfully.",
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
        description: "Failed to void order. Please try again.",
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
      case "voided":
        return "bg-gray-300 text-gray-600";
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

  const displayedOrders = limit ? orders.slice(0, limit) : orders;

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
              {!propStatusFilter && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="picked">Picked</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
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
                    <tr key={order.id} className={`hover:bg-gray-50 ${order.status === 'voided' ? 'opacity-60 bg-gray-50' : ''}`}>
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
                        <Badge className={`${getStatusColor(order.status)} px-2 py-1 rounded-full text-xs font-medium`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                          </span>
                        </Badge>
                        {order.status === 'voided' && (
                          <div className="text-xs text-red-500 mt-1">Order cancelled</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${((order.weight || 0) * 0.75 + (order.distance || 0) * 0.025).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.weight || 0} lbs • {order.distance || 0} mi
                        </div>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="View Order Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Order Details - {order.orderNumber}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h3 className="font-medium text-sm mb-2">Customer Information</h3>
                                    <p className="text-sm">{order.customerName}</p>
                                    <p className="text-sm text-gray-500">{order.customerPhone}</p>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-sm mb-2">Delivery Address</h3>
                                    <p className="text-sm">{order.deliveryLine1}</p>
                                    <p className="text-sm">{order.deliveryCity}, {order.deliveryState} {order.deliveryZip}</p>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-medium text-sm mb-2">Package Details</h3>
                                  {order.packages?.map((pkg: any, index: number) => (
                                    <div key={index} className="text-sm border p-2 rounded mb-2">
                                      <p>Package {index + 1}/{order.packages.length}</p>
                                      <p>Weight: {pkg.weight} lbs</p>
                                      <p>Dimensions: {pkg.dimensions?.length}" × {pkg.dimensions?.width}" × {pkg.dimensions?.height}"</p>
                                      {pkg.description && <p>Description: {pkg.description}</p>}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h3 className="font-medium text-sm mb-2">Billing</h3>
                                    <p className="text-sm">Weight: {order.weight || 0} lbs × $0.75 = ${((order.weight || 0) * 0.75).toFixed(2)}</p>
                                    <p className="text-sm">Distance: {order.distance || 0} mi × $0.025 = ${((order.distance || 0) * 0.025).toFixed(2)}</p>
                                    <p className="text-sm font-medium">Total: ${((order.weight || 0) * 0.75 + (order.distance || 0) * 0.025).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-sm mb-2">Status</h3>
                                    <Badge className={getStatusColor(order.status)}>
                                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="Generate Shipping Labels">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
                              <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl">Shipping Labels - {order.orderNumber}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-8">
                                {order.packages?.map((pkg: any, index: number) => (
                                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                                    <h3 className="font-semibold text-lg mb-4 text-gray-800">
                                      Package {index + 1} of {order.packages.length}
                                    </h3>
                                    <div className="flex justify-center">
                                      <ShippingLabel 
                                        order={{...order, currentPackage: index + 1, totalPackages: order.packages.length, packageDetails: pkg}} 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {order.status !== 'voided' && order.status !== 'delivered' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Void Order"
                              onClick={() => voidOrderMutation.mutate(order.id)}
                              disabled={voidOrderMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
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
                Showing 1 to {displayedOrders.length} of {orders.length} orders
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
