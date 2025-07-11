import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Package, Truck, MapPin, CheckCircle, Clock, AlertCircle } from "lucide-react";
import logoPath from "@assets/logo_ship_1751420016110.jpg";

interface OrderStatusStep {
  status: string;
  timestamp: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

export default function TrackOrder() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchInitiated, setSearchInitiated] = useState(false);

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['/api/orders/track', trackingNumber],
    enabled: searchInitiated && trackingNumber.length > 0,
    retry: false,
  });

  const handleSearch = () => {
    if (trackingNumber.trim()) {
      setSearchInitiated(true);
    }
  };

  const getOrderStatusSteps = (order: any): OrderStatusStep[] => {
    const steps = [
      {
        status: 'pending',
        description: 'Order Created & Label Generated',
        icon: Package,
        completed: true
      },
      {
        status: 'confirmed',
        description: 'Order Confirmed & Ready for Pickup',
        icon: CheckCircle,
        completed: ['confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(order?.status)
      },
      {
        status: 'picked_up',
        description: 'Package Picked Up',
        icon: Truck,
        completed: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(order?.status)
      },
      {
        status: 'in_transit',
        description: 'In Transit to Destination',
        icon: MapPin,
        completed: ['in_transit', 'out_for_delivery', 'delivered'].includes(order?.status)
      },
      {
        status: 'out_for_delivery',
        description: 'Out for Delivery',
        icon: Truck,
        completed: ['out_for_delivery', 'delivered'].includes(order?.status)
      },
      {
        status: 'delivered',
        description: 'Package Delivered',
        icon: CheckCircle,
        completed: order?.status === 'delivered'
      }
    ];

    return steps;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'out_for_delivery': return 'bg-blue-500';
      case 'in_transit': return 'bg-orange-500';
      case 'picked_up': return 'bg-yellow-500';
      case 'confirmed': return 'bg-purple-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <img src={logoPath} alt="ShippXpress" className="h-12 w-12 rounded-lg object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-shippxpress-navy">ShippXpress</h1>
              <p className="text-gray-600">Track Your Package</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Track Your Order
            </CardTitle>
            <CardDescription>
              Enter your order number to get real-time tracking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter order number (e.g., ORD-2025-123456)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                className="bg-shippxpress-orange hover:bg-shippxpress-orange/90"
                disabled={!trackingNumber.trim() || isLoading}
              >
                {isLoading ? 'Searching...' : 'Track'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchInitiated && (
          <>
            {isLoading && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shippxpress-orange mx-auto mb-4"></div>
                    <p className="text-gray-600">Searching for your order...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h3>
                    <p className="text-gray-600">
                      We couldn't find an order with the number "{trackingNumber}". 
                      Please check the order number and try again.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {orderData && (
              <>
                {/* Order Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Order #{orderData.orderNumber}
                        </CardTitle>
                        <CardDescription>
                          Created on {new Date(orderData.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(orderData.status)} text-white`}>
                        {orderData.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Delivery Details</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Customer:</strong> {orderData.customerName}</p>
                          <p><strong>Phone:</strong> {orderData.customerPhone}</p>
                          <p><strong>Address:</strong> {orderData.deliveryLine1}</p>
                          <p>{orderData.deliveryCity}, {orderData.deliveryState} {orderData.deliveryZip}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Package Information</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Weight:</strong> {orderData.weight || 'N/A'} lbs</p>
                          <p><strong>Distance:</strong> {orderData.distance || 'N/A'} miles</p>
                          <p><strong>Pickup Date:</strong> {new Date(orderData.pickupDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking Timeline</CardTitle>
                    <CardDescription>
                      Follow your package journey from pickup to delivery
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getOrderStatusSteps(orderData).map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <div key={index} className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              step.completed 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                step.completed ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                {step.description}
                              </p>
                              {step.completed && orderData.status === step.status && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Updated {new Date(orderData.updatedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {step.completed && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Info Section */}
        {!searchInitiated && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center max-w-md mx-auto">
                <Package className="h-16 w-16 text-shippxpress-orange mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Track Your Package
                </h3>
                <p className="text-gray-600">
                  Enter your order number above to get real-time updates on your package delivery status.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}