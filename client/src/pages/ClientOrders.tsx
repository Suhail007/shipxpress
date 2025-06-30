import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OrdersTable from "@/components/OrdersTable";
import CreateOrderModal from "@/components/CreateOrderModal";
import { Package, AlertCircle, LogOut, DollarSign, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function ClientOrders() {
  const { user } = useAuth();
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  // Check if this is an impersonated session
  const isImpersonated = user?.id?.startsWith('client_');

  // Fetch orders for billing calculations
  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
  });

  // Calculate billing information
  const calculateBilling = () => {
    const deliveredOrders = Array.isArray(orders) ? orders.filter((order: any) => order.status === 'delivered') : [];
    
    const totalWeight = deliveredOrders.reduce((sum: number, order: any) => {
      const weight = parseFloat(order.weight) || 0;
      return sum + weight;
    }, 0);

    const totalDistance = deliveredOrders.reduce((sum: number, order: any) => {
      const distance = parseFloat(order.distance) || 0;
      return sum + distance;
    }, 0);
    
    const totalCharges = deliveredOrders.reduce((total: number, order: any) => {
      const weight = parseFloat(order.weight) || 0;
      const distance = parseFloat(order.distance) || 0;
      const weightCharge = weight * 0.75; // $0.75 per pound
      const distanceCharge = distance * 0.025; // $0.025 per mile
      return total + weightCharge + distanceCharge;
    }, 0);

    return {
      totalOrders: deliveredOrders.length,
      totalWeight: Number(totalWeight) || 0,
      totalDistance: Number(totalDistance) || 0,
      totalCharges: Number(totalCharges) || 0,
      deliveredOrders
    };
  };

  const billingData = calculateBilling();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      {isImpersonated && (
        <div className="bg-orange-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Super Admin logged in as client</span>
            </div>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => window.location.href = "/api/logout"}
              className="bg-white text-orange-500 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                <p className="text-gray-600">Create, track, and manage all delivery orders</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="px-3 py-1">
                {user?.firstName} {user?.lastName}
              </Badge>
              {!isImpersonated && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/api/logout"}
                >
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage your orders efficiently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={() => setCreateOrderOpen(true)}>
                    <Package className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Bulk Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>
                  All your delivery orders in one place
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <OrdersTable showFilters={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Billing Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{billingData.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Delivered orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Number(billingData?.totalWeight || 0).toFixed(1)} lbs</div>
                  <p className="text-xs text-muted-foreground">@$0.75 per pound</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Number(billingData?.totalDistance || 0).toFixed(1)} mi</div>
                  <p className="text-xs text-muted-foreground">@$0.025 per mile</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Charges</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${Number(billingData?.totalCharges || 0).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Current billing period</p>
                </CardContent>
              </Card>
            </div>

            {/* Billing Details */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of charges for delivered orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Pricing Structure</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• Base charge: $0.75 per pound</div>
                    <div>• Distance charge: $0.025 per mile</div>
                    <div>• Billing applies only to delivered orders</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Weight (lbs)</TableHead>
                      <TableHead>Distance (mi)</TableHead>
                      <TableHead>Weight Charge</TableHead>
                      <TableHead>Distance Charge</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData.deliveredOrders.map((order: any) => {
                      const weight = parseFloat(order.weight) || 0;
                      const distance = parseFloat(order.distance) || 0;
                      const weightCharge = weight * 0.75;
                      const distanceCharge = distance * 0.025;
                      const total = weightCharge + distanceCharge;
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{weight.toFixed(1)}</TableCell>
                          <TableCell>{distance.toFixed(1)}</TableCell>
                          <TableCell>${weightCharge.toFixed(2)}</TableCell>
                          <TableCell>${distanceCharge.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">${total.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {billingData.deliveredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No delivered orders found for billing
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal 
        open={createOrderOpen} 
        onOpenChange={setCreateOrderOpen} 
      />
    </div>
  );
}