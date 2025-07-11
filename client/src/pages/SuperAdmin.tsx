import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Users, 
  MapPin, 
  Route, 
  Calendar, 
  Settings,
  Package,
  Truck,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  MapPinPlus
} from "lucide-react";
import ShippXpressSidebar from "@/components/ShippXpressSidebar";

// Type definitions
interface SuperAdminStats {
  totalClients: number;
  totalDrivers: number;
  totalZones: number;
  todayBatches: number;
}

interface Client {
  id: number;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  created_at: string;
}

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  assigned_zone_id?: number;
}

interface Zone {
  id: number;
  name: string;
  direction: string;
  max_distance: number;
  base_address: string;
  is_active: boolean;
}

interface RouteBatch {
  id: number;
  batch_date: string;
  cutoff_time: string;
  status: string;
  order_count: number;
}

// Form schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  address: z.string().min(1, "Address is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().min(10, "Valid phone number is required"),
});

const assignZoneSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  zoneId: z.string().min(1, "Zone is required"),
});

const routeBatchSchema = z.object({
  batch_date: z.string().min(1, "Date is required"),
  cutoff_time: z.string().default("14:30"),
});

type CreateClientForm = z.infer<typeof createClientSchema>;
type AssignZoneForm = z.infer<typeof assignZoneSchema>;
type RouteBatchForm = z.infer<typeof routeBatchSchema>;

export default function SuperAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [assignZoneOpen, setAssignZoneOpen] = useState(false);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);

  // Redirect if not super admin
  if (!isLoading && (!isAuthenticated || user?.role !== "super_admin")) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  // Queries with proper typing
  const { data: stats = {} as SuperAdminStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/super-admin/stats"],
    retry: false,
  });

  const { data: clients = [] as Client[], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: drivers = [] as Driver[], isLoading: driversLoading } = useQuery({
    queryKey: ["/api/drivers"],
    retry: false,
  });

  const { data: zones = [] as Zone[], isLoading: zonesLoading } = useQuery({
    queryKey: ["/api/zones"],
    retry: false,
  });

  const { data: batches = [] as RouteBatch[], isLoading: batchesLoading } = useQuery({
    queryKey: ["/api/route-batches"],
    retry: false,
  });

  // Forms
  const createClientForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      address: "",
      contact_email: "",
      contact_phone: "",
    },
  });

  const assignZoneForm = useForm<AssignZoneForm>({
    resolver: zodResolver(assignZoneSchema),
    defaultValues: {
      driverId: "",
      zoneId: "",
    },
  });

  const routeBatchForm = useForm<RouteBatchForm>({
    resolver: zodResolver(routeBatchSchema),
    defaultValues: {
      batch_date: new Date().toISOString().split('T')[0],
      cutoff_time: "14:30",
    },
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientForm) => {
      await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Client Created",
        description: "New client has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setCreateClientOpen(false);
      createClientForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const assignZoneMutation = useMutation({
    mutationFn: async (data: AssignZoneForm) => {
      await apiRequest(`/api/drivers/${data.driverId}/assign-zone`, {
        method: "POST",
        body: JSON.stringify({ zoneId: parseInt(data.zoneId) }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Zone Assigned",
        description: "Driver has been assigned to the zone successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setAssignZoneOpen(false);
      assignZoneForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to assign zone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: RouteBatchForm) => {
      await apiRequest("/api/route-batches", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Batch Created",
        description: "Route batch has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/route-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setCreateBatchOpen(false);
      routeBatchForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to create batch. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onCreateClient = (data: CreateClientForm) => {
    createClientMutation.mutate(data);
  };

  const onAssignZone = (data: AssignZoneForm) => {
    assignZoneMutation.mutate(data);
  };

  const onCreateBatch = (data: RouteBatchForm) => {
    createBatchMutation.mutate(data);
  };

  const handleLoginAsClient = async (clientId: number) => {
    try {
      await apiRequest(`/api/impersonate-client/${clientId}`, {
        method: 'POST',
      });
      
      toast({
        title: "Success",
        description: "Switching to client view...",
      });
      
      // Clear the query cache and redirect to force re-authentication
      queryClient.clear();
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login as client",
        variant: "destructive",
      });
    }
  };

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ShippXpressSidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage all clients, drivers, zones, and route optimization</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
            >
              Logout
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-shippxpress-navy" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{(stats as any)?.totalClients || (clients as any)?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Clients</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Truck className="h-6 w-6 text-shippxpress-orange" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{(stats as any)?.totalDrivers || (drivers as any)?.length || 0}</div>
              <div className="text-sm text-gray-600">Active Drivers</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{(stats as any)?.totalZones || (zones as any)?.length || 0}</div>
              <div className="text-sm text-gray-600">Delivery Zones</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Route className="h-6 w-6 text-purple-600" />
                </div>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{(stats as any)?.todayBatches || (batches as any)?.length || 0}</div>
              <div className="text-sm text-gray-600">Today's Batches</div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="batches">Route Batches</TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Client Management</h2>
              <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Building2 className="mr-2 h-4 w-4" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                    <DialogDescription>
                      Add a new client to the logistics platform
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...createClientForm}>
                    <form onSubmit={createClientForm.handleSubmit(onCreateClient)} className="space-y-4">
                      <FormField
                        control={createClientForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter client name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createClientForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createClientForm.control}
                        name="contact_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createClientForm.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateClientOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createClientMutation.isPending}>
                          {createClientMutation.isPending ? "Creating..." : "Create Client"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading clients...
                        </TableCell>
                      </TableRow>
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No clients found
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client: any) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.address}</TableCell>
                          <TableCell>{client.contactEmail}</TableCell>
                          <TableCell>{client.contactPhone}</TableCell>
                          <TableCell>
                            <Badge variant={client.isActive ? "default" : "secondary"}>
                              {client.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(client.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleLoginAsClient(client.id)}
                            >
                              Login as Client
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Driver Management</h2>
              <Dialog open={assignZoneOpen} onOpenChange={setAssignZoneOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <MapPin className="mr-2 h-4 w-4" />
                    Assign Zone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Driver to Zone</DialogTitle>
                    <DialogDescription>
                      Assign a driver to a specific delivery zone
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...assignZoneForm}>
                    <form onSubmit={assignZoneForm.handleSubmit(onAssignZone)} className="space-y-4">
                      <FormField
                        control={assignZoneForm.control}
                        name="driverId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Driver</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a driver" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {drivers.map((driver: Driver) => (
                                  <SelectItem key={driver.id} value={driver.id.toString()}>
                                    {driver.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={assignZoneForm.control}
                        name="zoneId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a zone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {zones.map((zone: Zone) => (
                                  <SelectItem key={zone.id} value={zone.id.toString()}>
                                    {zone.name} ({zone.direction})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAssignZoneOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={assignZoneMutation.isPending}>
                          {assignZoneMutation.isPending ? "Assigning..." : "Assign Zone"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Zone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driversLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading drivers...
                        </TableCell>
                      </TableRow>
                    ) : drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No drivers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver: Driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.email}</TableCell>
                          <TableCell>{driver.phone}</TableCell>
                          <TableCell>
                            <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                              {driver.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {driver.assigned_zone_id ? (
                              zones.find(z => z.id === driver.assigned_zone_id)?.name || "Unknown"
                            ) : (
                              <span className="text-gray-500">No zone assigned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Zone Management</h2>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Max Distance</TableHead>
                      <TableHead>Base Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zonesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading zones...
                        </TableCell>
                      </TableRow>
                    ) : zones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No zones found
                        </TableCell>
                      </TableRow>
                    ) : (
                      zones.map((zone: Zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell>{zone.direction}</TableCell>
                          <TableCell>{zone.max_distance} miles</TableCell>
                          <TableCell>{zone.base_address}</TableCell>
                          <TableCell>
                            <Badge variant={zone.is_active ? "default" : "secondary"}>
                              {zone.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Route Batches Tab */}
          <TabsContent value="batches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Route Batch Management</h2>
              <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Route Batch</DialogTitle>
                    <DialogDescription>
                      Create a new route batch for optimization (cutoff time: 2:30 PM)
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...routeBatchForm}>
                    <form onSubmit={routeBatchForm.handleSubmit(onCreateBatch)} className="space-y-4">
                      <FormField
                        control={routeBatchForm.control}
                        name="batch_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routeBatchForm.control}
                        name="cutoff_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cutoff Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateBatchOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createBatchMutation.isPending}>
                          {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Date</TableHead>
                      <TableHead>Cutoff Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading batches...
                        </TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          No batches found
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch: RouteBatch) => (
                        <TableRow key={batch.id}>
                          <TableCell>{new Date(batch.batch_date).toLocaleDateString()}</TableCell>
                          <TableCell>{batch.cutoff_time}</TableCell>
                          <TableCell>
                            <Badge variant="default">{batch.status}</Badge>
                          </TableCell>
                          <TableCell>{batch.order_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}