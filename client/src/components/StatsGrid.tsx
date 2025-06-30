import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, CheckCircle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface StatsGridProps {
  stats?: {
    totalOrders: number;
    activeDrivers: number;
    deliveredToday: number;
    pendingOrders: number;
  };
  loading?: boolean;
}

export default function StatsGrid({ stats, loading }: StatsGridProps) {
  const statsCards = [
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: Package,
      color: "text-primary-600",
      bgColor: "bg-primary-50",
      change: "+12%",
      changeType: "increase",
    },
    {
      title: "Active Drivers",
      value: stats?.activeDrivers || 0,
      icon: Users,
      color: "text-success-600",
      bgColor: "bg-success-50",
      change: "+8%",
      changeType: "increase",
    },
    {
      title: "Delivered Today",
      value: stats?.deliveredToday || 0,
      icon: CheckCircle,
      color: "text-success-600",
      bgColor: "bg-success-50",
      change: "-3%",
      changeType: "decrease",
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Package,
      color: "text-warning-600",
      bgColor: "bg-warning-50",
      change: "+15%",
      changeType: "increase",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value.toLocaleString()}</p>
                  <p className={`text-sm mt-1 flex items-center ${
                    stat.changeType === "increase" ? "text-success-600" : "text-warning-600"
                  }`}>
                    {stat.changeType === "increase" ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`h-12 w-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
