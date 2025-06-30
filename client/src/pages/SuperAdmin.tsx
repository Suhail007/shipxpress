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
import { Building2, Users, MapPin, Route, Calendar, Settings } from "lucide-react";

const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  address: z.string().min(1, "Address is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().min(10, "Valid phone number is required"),
});

const assignZoneSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  zoneId: z.string().min(1, "Zone is required"),
});

const routeBatchSchema = z.object({
  batchDate: z.string().min(1, "Date is required"),
  cutoffTime: z.string().default("14:30"),
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
      title: "Access Denied",
      description: "You need super admin privileges to access this page.",
      variant: "destructive",
    });
    window.location.href = "/";
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ["/api/super-admin/stats"],
    enabled: isAuthenticated && user?.role === "super_admin",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated && user?.role === "super_admin",
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["/api/zones"],
    enabled: isAuthenticated && user?.role === "super_admin",
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/drivers"],
    enabled: isAuthenticated && user?.role === "super_admin",
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["/api/route-batches"],
    enabled: isAuthenticated && user?.role === "super_admin",
  });

  const createClientForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const assignZoneForm = useForm<AssignZoneForm>({
    resolver: zodResolver(assignZoneSchema),
    defaultValues: {
      driverId: "",
      zoneId: "",
    },
  });

  const createBatchForm = useForm<RouteBatchForm>({
    resolver: zodResolver(routeBatchSchema),
    defaultValues: {
      batchDate: new Date().toISOString().split('T')[0],
      cutoffTime: "14:30",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientForm) => {
      await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({
        title: "Success",
        description: "Client created successfully.",
      });
      setCreateClientOpen(false);
      createClientForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      await apiRequest("POST", `/api/drivers/${data.driverId}/assign-zone`, {
        zoneId: parseInt(data.zoneId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "Success",
        description: "Zone assigned to driver successfully.",
      });
      setAssignZoneOpen(false);
      assignZoneForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      await apiRequest("POST", "/api/route-batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-batches"] });
      toast({
        title: "Success",
        description: "Route batch created successfully.",
      });
      setCreateBatchOpen(false);
      createBatchForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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

  const optimizeBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      await apiRequest("POST", `/api/route-batches/${batchId}/optimize`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-batches"] });
      toast({
        title: "Success",
        description: "Route batch optimized successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to optimize batch. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage clients, drivers, zones, and route optimization
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
            <DialogTrigger asChild>
              <Button>
                <Building2 className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to the logistics platform.
                </DialogDescription>
              </DialogHeader>
              <Form {...createClientForm}>
                <form onSubmit={createClientForm.handleSubmit((data) => createClientMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={createClientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name LLC" {...field} />
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
                          <Input placeholder="123 Business St, City, State 12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createClientForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createClientForm.control}
                    name="contactPhone"
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
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Creating..." : "Create Client"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDrivers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalZones || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Batches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayBatches || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="drivers">Drivers & Zones</TabsTrigger>
          <TabsTrigger value="batches">Route Batches</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                Manage all clients and their access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.address}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{client.contactEmail}</div>
                          <div className="text-gray-500">{client.contactPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Driver Zone Assignments
                  <Dialog open={assignZoneOpen} onOpenChange={setAssignZoneOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <MapPin className="h-4 w-4 mr-2" />
                        Assign Zone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Driver to Zone</DialogTitle>
                        <DialogDescription>
                          Assign a driver to a specific delivery zone.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...assignZoneForm}>
                        <form onSubmit={assignZoneForm.handleSubmit((data) => assignZoneMutation.mutate(data))} className="space-y-4">
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
                                    {drivers.map((driver: any) => (
                                      <SelectItem key={driver.id} value={driver.id.toString()}>
                                        {driver.user?.firstName} {driver.user?.lastName} - {driver.vehicleType}
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
                                    {zones.map((zone: any) => (
                                      <SelectItem key={zone.id} value={zone.id.toString()}>
                                        Zone {zone.name} - {zone.direction} ({zone.maxDistance} miles)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={assignZoneMutation.isPending}>
                            {assignZoneMutation.isPending ? "Assigning..." : "Assign Zone"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Manage driver assignments to delivery zones (A, B, C, D)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Assigned Zone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver: any) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          {driver.user?.firstName} {driver.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{driver.vehicleType}</div>
                            <div className="text-gray-500">{driver.vehicleNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.assignedZone ? (
                            <Badge>
                              Zone {driver.assignedZone.name} - {driver.assignedZone.direction}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.status === "online" ? "default" : "secondary"}>
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Route Batch Management
                <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Route className="h-4 w-4 mr-2" />
                      Create Batch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Route Batch</DialogTitle>
                      <DialogDescription>
                        Create a new batch for route optimization with cutoff time.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createBatchForm}>
                      <form onSubmit={createBatchForm.handleSubmit((data) => createBatchMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={createBatchForm.control}
                          name="batchDate"
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
                          control={createBatchForm.control}
                          name="cutoffTime"
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
                        <Button type="submit" disabled={createBatchMutation.isPending}>
                          {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Manage route batches with 2:30 PM cutoff time for optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Date</TableHead>
                    <TableHead>Cutoff Time</TableHead>
                    <TableHead>Order Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch: any) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchDate}</TableCell>
                      <TableCell>{batch.cutoffTime}</TableCell>
                      <TableCell>{batch.orderCount}</TableCell>
                      <TableCell>
                        <Badge variant={batch.status === "optimized" ? "default" : "secondary"}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {batch.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => optimizeBatchMutation.mutate(batch.id)}
                            disabled={optimizeBatchMutation.isPending}
                          >
                            <Route className="h-4 w-4 mr-2" />
                            Optimize
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure global system settings for logistics operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Base Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Pickup Point:</strong> 1049 Industrial Dr, Bensenville, IL 60106</div>
                    <div><strong>Default Cutoff:</strong> 2:30 PM</div>
                    <div><strong>Zone Radius:</strong> 300 miles</div>
                    <div><strong>Zone Count:</strong> 4 (A, B, C, D)</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Zone Directions</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Zone A:</strong> North</div>
                    <div><strong>Zone B:</strong> South</div>
                    <div><strong>Zone C:</strong> East</div>
                    <div><strong>Zone D:</strong> West</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}