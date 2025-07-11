import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Drivers from "@/pages/Drivers";
import DriverApp from "@/pages/DriverApp";
import SuperAdminNew from "@/pages/SuperAdminNew";
import ClientLogin from "@/pages/ClientLogin";
import ClientOrders from "@/pages/ClientOrders";
import ClientDashboard from "@/pages/ClientDashboard";
import TrackOrder from "@/pages/TrackOrder";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/client-login" component={ClientLogin} />
        <Route path="/track" component={TrackOrder} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Role-based routing
  if (user?.role === "super_admin") {
    return (
      <Switch>
        <Route path="/" component={SuperAdminNew} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/drivers" component={Drivers} />
        <Route path="/driver-app" component={DriverApp} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user?.role === "driver") {
    return <Route path="/" component={DriverApp} />;
  }

  if (user?.role === "client") {
    return (
      <Switch>
        <Route path="/" component={ClientDashboard} />
        <Route path="/dashboard" component={ClientDashboard} />
        <Route path="/orders" component={ClientOrders} />
        <Route path="/orders/all" component={ClientOrders} />
        <Route path="/orders/pending" component={ClientOrders} />
        <Route path="/orders/in-transit" component={ClientOrders} />
        <Route path="/track" component={TrackOrder} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Default admin interface with client login option
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={Orders} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/driver-app" component={DriverApp} />
      <Route path="/client-login" component={ClientLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
