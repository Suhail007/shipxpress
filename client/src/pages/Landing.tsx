import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  Package, 
  Users, 
  BarChart3, 
  Shield, 
  Zap, 
  Route,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star
} from "lucide-react";
import shippxpressLogo from "@/assets/shippxpress-logo.jpg";

export default function Landing() {
  const features = [
    {
      icon: Package,
      title: "Smart Order Management",
      description: "Streamline your order processing with automated tracking and real-time updates."
    },
    {
      icon: Route,
      title: "Optimized Routing",
      description: "AI-powered route optimization to reduce delivery times and fuel costs."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive insights and reporting to drive business decisions."
    },
    {
      icon: Users,
      title: "Driver Management",
      description: "Complete driver oversight with performance tracking and communication tools."
    },
    {
      icon: MapPin,
      title: "Real-time Tracking",
      description: "Live GPS tracking for all deliveries with customer notifications."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with role-based access and audit trails."
    }
  ];

  const stats = [
    { value: "99.8%", label: "Delivery Success Rate" },
    { value: "45%", label: "Cost Reduction" },
    { value: "2M+", label: "Packages Delivered" },
    { value: "500+", label: "Happy Clients" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={shippxpressLogo} alt="ShippXpress" className="h-10 w-10 rounded-lg shadow-md" />
            <div>
              <h1 className="text-2xl font-bold text-shippxpress-navy">ShippXpress</h1>
              <p className="text-xs text-gray-600">Logistics Excellence</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost"
              onClick={() => window.location.href = "/client-login"}
              className="text-shippxpress-navy hover:bg-blue-50"
            >
              Client Portal
            </Button>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-shippxpress-navy hover:bg-shippxpress-navy/90 text-white shadow-lg"
            >
              Admin Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center bg-blue-50 text-shippxpress-navy px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Star className="h-4 w-4 mr-2 fill-current" />
                #1 Logistics Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Revolutionize Your 
                <span className="text-shippxpress-orange"> Logistics</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Powered by AI and built for scale, ShippXpress delivers unmatched efficiency in order management, 
                route optimization, and real-time tracking for modern businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-shippxpress-navy hover:bg-shippxpress-navy/90 text-white shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-shippxpress-navy text-shippxpress-navy hover:bg-blue-50"
                  onClick={() => window.location.href = "/client-login"}
                >
                  Client Portal
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-shippxpress-navy">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-shippxpress-navy to-blue-600 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Live Dashboard</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Deliveries</span>
                      <span className="font-semibold text-green-600">127</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">On-Time Rate</span>
                      <span className="font-semibold text-blue-600">98.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fuel Savings</span>
                      <span className="font-semibold text-shippxpress-orange">32%</span>
                    </div>
                    <div className="h-32 bg-gradient-to-r from-blue-100 to-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-shippxpress-navy" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Powerful Features for Logistics Excellence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Package className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                Create, track, and manage orders with automated workflows and real-time updates.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-success-600 mb-4" />
              <CardTitle>Driver Assignment</CardTitle>
              <CardDescription>
                Intelligent driver matching based on location, availability, and delivery requirements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-warning-600 mb-4" />
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>
                Live location updates and delivery status monitoring for complete transparency.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive insights into delivery performance and operational metrics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-success-600 mb-4" />
              <CardTitle>Secure Platform</CardTitle>
              <CardDescription>
                Enterprise-grade security with role-based access controls and data protection.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Truck className="h-12 w-12 text-warning-600 mb-4" />
              <CardTitle>Mobile Driver App</CardTitle>
              <CardDescription>
                Dedicated mobile interface for drivers with navigation, proof capture, and communication.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Logistics?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of businesses already using LogiTrack to optimize their delivery operations.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = "/api/login"}
          >
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Truck className="h-6 w-6" />
            <span className="text-xl font-bold">LogiTrack</span>
          </div>
          <p className="text-gray-400">
            © 2024 LogiTrack. All rights reserved. Built for the future of logistics.
          </p>
        </div>
      </footer>
    </div>
  );
}
