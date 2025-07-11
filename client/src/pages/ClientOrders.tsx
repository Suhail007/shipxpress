import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OrdersTable from "@/components/OrdersTable";
import { CreateOrderModalSplit } from "@/components/CreateOrderModalSplit";
import ClientSidebar from "@/components/ClientSidebar";
import BatchCountdown from "@/components/BatchCountdown";
import { Package, AlertCircle, LogOut, DollarSign, FileText, X, Check, Printer, Upload, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function ClientOrders() {
  const { user } = useAuth();
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [location] = useLocation();

  // Check if this is an impersonated session from super admin (not direct client login)
  const isImpersonated = user?.id?.startsWith('client_') && window.location.search.includes('from=admin');

  // Determine current filter based on route
  const getCurrentFilter = () => {
    if (location.includes('/pending')) return 'pending';
    if (location.includes('/in-transit')) return 'in_transit';
    return undefined; // Show all orders
  };

  const currentFilter = getCurrentFilter();

  // Fetch orders for billing calculations
  const { data: orders = [] } = useQuery<any[]>({
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

  // Print all delivered orders labels
  const handlePrintAllLabels = () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    const deliveredOrders = ordersArray.filter((order: any) => order.status === 'delivered');
    
    if (deliveredOrders.length === 0) {
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>All Shipping Labels - ${deliveredOrders.length} Orders</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .page-break { page-break-after: always; }
              .label-container { margin: 20px; display: flex; justify-content: center; }
              @media print {
                body { margin: 0; padding: 0; }
                .page-break:last-child { page-break-after: avoid; }
              }
            </style>
          </head>
          <body>
            ${deliveredOrders.map((order: any, index: number) => `
              <div class="label-container ${index < deliveredOrders.length - 1 ? 'page-break' : ''}">
                <div style="text-align: center;">
                  <h2>Order: ${order.orderNumber}</h2>
                  <p>Customer: ${order.customerName}</p>
                  <p>Address: ${order.deliveryLine1}, ${order.deliveryCity}, ${order.deliveryState} ${order.deliveryZip}</p>
                  <p>Weight: ${order.weight || 0} lbs | Distance: ${order.distance || 0} mi</p>
                </div>
              </div>
            `).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <ClientSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Impersonation Banner */}
          {isImpersonated && (
            <div className="bg-orange-500 text-white px-4 py-2">
              <div className="flex justify-between items-center">
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
          <div className="bg-white shadow-sm border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Package className="h-8 w-8 text-shippxpress-navy" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentFilter === 'pending' ? 'Pending Orders' : 
                       currentFilter === 'in_transit' ? 'Orders In Transit' : 
                       'Order Management'}
                    </h1>
                    <p className="text-gray-600">Create, track, and manage all delivery orders</p>
                  </div>
                </div>
                
                {/* Action Buttons in Header */}
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setCreateOrderOpen(true)}
                    className="bg-shippxpress-orange hover:bg-shippxpress-orange/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Order
                  </Button>
                  <Button
                    variant="outline"
                    className="border-shippxpress-navy text-shippxpress-navy hover:bg-shippxpress-navy hover:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {/* Batch Management Section */}
            <div className="mb-6">
              <BatchCountdown />
            </div>
            
            {/* Orders Table - Simplified Layout */}
            <Card>
              <CardContent className="p-0">
                <OrdersTable 
                  showFilters={true} 
                  statusFilter={currentFilter}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModalSplit 
        open={createOrderOpen} 
        onOpenChange={setCreateOrderOpen} 
      />
    </>
  );
}