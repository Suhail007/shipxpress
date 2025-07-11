import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Users, BarChart3, Shield, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">ShipExpress</h1>
          </div>
          <Button onClick={() => window.location.href = "/api/login"}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          ShipExpress Logistics Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Streamline your delivery operations with real-time tracking, automated assignment, 
          and comprehensive management tools. Built for modern logistics teams.
        </p>
        <div className="flex justify-center space-x-4">
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Get Started
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => window.location.href = "/client-login"}
          >
            Client Login
          </Button>
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
            Join thousands of businesses already using ShipExpress to optimize their delivery operations.
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
            <span className="text-xl font-bold">ShipExpress</span>
          </div>
          <p className="text-gray-400">
            © 2024 ShipExpress. All rights reserved. Built for the future of logistics.
          </p>
        </div>
      </footer>
    </div>
  );
}
