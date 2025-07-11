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

// Zod schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  address: z.string().min(1, "Address is required"),
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().min(1, "Phone number is required"),
});

const assignZoneSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  zoneId: z.string().min(1, "Zone is required"),
});

const routeBatchSchema = z.object({
  batch_date: z.string().min(1, "Date is required"),
  cutoff_time: z.string().min(1, "Cutoff time is required"),
});

type CreateClientForm = z.infer<typeof createClientSchema>;
type AssignZoneForm = z.infer<typeof assignZoneSchema>;
type RouteBatchForm = z.infer<typeof routeBatchSchema>;

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Dialog states
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [assignZoneOpen, setAssignZoneOpen] = useState(false);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/super-admin/stats"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign zone",
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create batch",
        variant: "destructive",
      });
    },
  });

  // Form handlers
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

  const statsData = stats as SuperAdminStats | undefined;
  const clientsData = clients as Client[];
  const driversData = drivers as Driver[];
  const zonesData = zones as Zone[];
  const batchesData = batches as RouteBatch[];

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
              <div className="text-2xl font-bold text-gray-900">{statsData?.totalClients || clientsData?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Clients</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Truck className="h-6 w-6 text-shippxpress-orange" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.totalDrivers || driversData?.length || 0}</div>
              <div className="text-sm text-gray-600">Active Drivers</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.totalZones || zonesData?.length || 0}</div>
              <div className="text-sm text-gray-600">Delivery Zones</div>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Route className="h-6 w-6 text-purple-600" />
                </div>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.todayBatches || batchesData?.length || 0}</div>
              <div className="text-sm text-gray-600">Today's Batches</div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="clients" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="zones">Zones</TabsTrigger>
              <TabsTrigger value="batches">Route Batches</TabsTrigger>
            </TabsList>

            {/* Clients Tab */}
            <TabsContent value="clients" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Client Management</h2>
                <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-shippxpress-navy hover:bg-shippxpress-navy/90">
                      <Plus className="mr-2 h-4 w-4" />
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
                                <Input placeholder="Enter client address" {...field} />
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
                                <Input type="email" placeholder="Enter contact email" {...field} />
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
                                <Input placeholder="Enter contact phone" {...field} />
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
                <CardHeader>
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>Manage client accounts and access</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : clientsData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No clients found</TableCell>
                        </TableRow>
                      ) : (
                        clientsData.map((client: Client) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>{client.contact_email}</TableCell>
                            <TableCell>{client.contact_phone}</TableCell>
                            <TableCell>
                              <Badge variant={client.is_active ? "default" : "secondary"}>
                                {client.is_active ? "Active" : "Inactive"}
                              </Badge>
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
                <h2 className="text-xl font-semibold">Driver Management</h2>
                <Dialog open={assignZoneOpen} onOpenChange={setAssignZoneOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-shippxpress-orange hover:bg-shippxpress-orange/90">
                      <UserPlus className="mr-2 h-4 w-4" />
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select driver" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {driversData.map((driver: Driver) => (
                                    <SelectItem key={driver.id} value={driver.id.toString()}>
                                      {driver.name} - {driver.email}
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select zone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {zonesData.map((zone: Zone) => (
                                    <SelectItem key={zone.id} value={zone.id.toString()}>
                                      {zone.name} - {zone.direction}
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
                <CardHeader>
                  <CardTitle>Drivers</CardTitle>
                  <CardDescription>Manage driver accounts and zone assignments</CardDescription>
                </CardHeader>
                <CardContent>
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
                          <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : driversData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No drivers found</TableCell>
                        </TableRow>
                      ) : (
                        driversData.map((driver: Driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>{driver.email}</TableCell>
                            <TableCell>{driver.phone}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={driver.status === 'available' ? "default" : "secondary"}
                              >
                                {driver.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {driver.assigned_zone_id ? 
                                `Zone ${driver.assigned_zone_id}` : 
                                "Not assigned"
                              }
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
                <h2 className="text-xl font-semibold">Zone Management</h2>
                <Button className="bg-green-600 hover:bg-green-700">
                  <MapPinPlus className="mr-2 h-4 w-4" />
                  Add Zone
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Zones</CardTitle>
                  <CardDescription>Manage delivery zones and coverage areas</CardDescription>
                </CardHeader>
                <CardContent>
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
                          <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : zonesData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No zones found</TableCell>
                        </TableRow>
                      ) : (
                        zonesData.map((zone: Zone) => (
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
                <h2 className="text-xl font-semibold">Route Batch Management</h2>
                <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      Create Batch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Route Batch</DialogTitle>
                      <DialogDescription>
                        Create a new route batch for order optimization
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
                <CardHeader>
                  <CardTitle>Route Batches</CardTitle>
                  <CardDescription>Manage daily route batches and optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Date</TableHead>
                        <TableHead>Cutoff Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order Count</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchesLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : batchesData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No batches found</TableCell>
                        </TableRow>
                      ) : (
                        batchesData.map((batch: RouteBatch) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                              {new Date(batch.batch_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{batch.cutoff_time}</TableCell>
                            <TableCell>
                              <Badge variant="default">{batch.status}</Badge>
                            </TableCell>
                            <TableCell>{batch.order_count || 0}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}