import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ClientSidebar from "@/components/ClientSidebar";
import { Package, Clock, Truck, CheckCircle, DollarSign, TrendingUp, MapPin, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ClientDashboard() {
  const { user } = useAuth();

  // Check if this is an impersonated session from super admin
  const isImpersonated = user?.id?.startsWith('client_') && window.location.search.includes('from=admin');

  // Fetch orders for dashboard stats
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  // Calculate dashboard metrics
  const getDashboardStats = () => {
    const allOrders = Array.isArray(orders) ? orders : [];
    
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter((order: any) => order.status === 'pending').length;
    const inTransitOrders = allOrders.filter((order: any) => order.status === 'in_transit').length;
    const deliveredOrders = allOrders.filter((order: any) => order.status === 'delivered').length;
    
    const deliveredOrdersData = allOrders.filter((order: any) => order.status === 'delivered');
    const totalRevenue = deliveredOrdersData.reduce((total: number, order: any) => {
      const weight = parseFloat(order.weight) || 0;
      const distance = parseFloat(order.distance) || 0;
      const weightCharge = weight * 0.75;
      const distanceCharge = distance * 0.025;
      return total + weightCharge + distanceCharge;
    }, 0);

    const avgDeliveryTime = deliveredOrdersData.length > 0 ? 
      Math.round(deliveredOrdersData.reduce((sum: number, order: any) => {
        const created = new Date(order.createdAt);
        const delivered = new Date(order.updatedAt);
        const hours = (delivered.getTime() - created.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0) / deliveredOrdersData.length) : 0;

    return {
      totalOrders,
      pendingOrders,
      inTransitOrders,
      deliveredOrders,
      totalRevenue,
      avgDeliveryTime
    };
  };

  const stats = getDashboardStats();

  // Recent orders for quick view
  const recentOrders = Array.isArray(orders) ? 
    orders
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'picked_up': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ClientSidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Super Admin Impersonation Banner */}
        {isImpersonated && (
          <div className="bg-shippxpress-orange text-white px-4 py-2 text-center text-sm">
            🔄 Super Admin logged in as client - 
            <a href="/" className="underline ml-2">Return to Admin Panel</a>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your logistics operations.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">All time orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
                <p className="text-xs text-muted-foreground">Awaiting pickup</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.inTransitOrders}</div>
                <p className="text-xs text-muted-foreground">Currently shipping</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.deliveredOrders}</div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From delivered orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgDeliveryTime}h</div>
                <p className="text-xs text-muted-foreground">Average completion time</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription>
                Your latest 5 orders and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Package className="h-8 w-8 text-shippxpress-orange" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">{order.orderNumber}</h4>
                          <p className="text-sm text-gray-600">{order.customerName}</p>
                          <p className="text-xs text-gray-500">
                            {order.deliveryCity}, {order.deliveryState}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
                  <p className="text-gray-600">
                    Create your first order to get started with ShippXpress.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}