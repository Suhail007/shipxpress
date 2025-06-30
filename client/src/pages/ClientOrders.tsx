import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OrdersTable from "@/components/OrdersTable";
import CreateOrderModal from "@/components/CreateOrderModal";
import { Package, AlertCircle, LogOut } from "lucide-react";
import { useState } from "react";

export default function ClientOrders() {
  const { user } = useAuth();
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  // Check if this is an impersonated session
  const isImpersonated = user?.id?.startsWith('client_');

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
        <div className="space-y-6">
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
        </div>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal 
        open={createOrderOpen} 
        onOpenChange={setCreateOrderOpen} 
      />
    </div>
  );
}