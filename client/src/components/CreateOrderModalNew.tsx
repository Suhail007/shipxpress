import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";

type CreateOrderForm = z.infer<typeof insertOrderSchema>;

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function CreateOrderModalNew({ open, onOpenChange }: CreateOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costEstimate, setCostEstimate] = useState({ weight: 1, distance: 25, total: 0 });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(insertOrderSchema.omit({ 
      id: true, 
      orderNumber: true, 
      clientId: true,
      customerId: true,
      driverId: true,
      zoneId: true,
      status: true,
      actualDeliveryTime: true,
      estimatedDeliveryTime: true,
      deliveryCoordinates: true,
      deliveryProofUrl: true,
      createdBy: true,
      voidReason: true,
      voidedAt: true,
      voidedBy: true,
      batchId: true,
      routeSequence: true,
      createdAt: true,
      updatedAt: true,
    }).extend({
      packages: z.array(z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        weight: z.number().optional(),
        dimensions: z.string().optional(),
      })).min(1, "At least one package is required"),
    })),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      deliveryLine1: "",
      deliveryLine2: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryCountry: "US",
      pickupDate: getTodayDate(),
      specialInstructions: "",
      weight: 0,
      distance: 0,
      packages: [{ description: "Package", quantity: 1, weight: 1, dimensions: "12x12x12" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  // Calculate cost estimate
  const calculateCostEstimate = useCallback(() => {
    const weightRate = 0.50; // $0.50 per pound
    const distanceRate = 0.75; // $0.75 per mile
    const baseFee = 5.00; // $5 base fee
    
    const weightCost = costEstimate.weight * weightRate;
    const distanceCost = costEstimate.distance * distanceRate;
    const total = baseFee + weightCost + distanceCost;
    
    setCostEstimate(prev => ({
      ...prev,
      total: Math.round(total * 100) / 100
    }));
  }, [costEstimate.weight, costEstimate.distance]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (open && window.google?.maps?.places) {
      const input = document.getElementById('address-autocomplete') as HTMLInputElement;
      if (input && !autocompleteRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.address_components) {
            const addressComponents = place.address_components;
            
            // Extract address components
            let streetNumber = '';
            let streetName = '';
            let city = '';
            let state = '';
            let zip = '';
            
            addressComponents.forEach(component => {
              const types = component.types;
              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              } else if (types.includes('route')) {
                streetName = component.long_name;
              } else if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (types.includes('postal_code')) {
                zip = component.long_name;
              }
            });
            
            // Update form with address components
            form.setValue('deliveryLine1', `${streetNumber} ${streetName}`.trim());
            form.setValue('deliveryCity', city);
            form.setValue('deliveryState', state);
            form.setValue('deliveryZip', zip);
          }
        });
      }
    }
    
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [open, form]);

  // Calculate cost estimate when weight/distance changes
  useEffect(() => {
    calculateCostEstimate();
  }, [calculateCostEstimate]);

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderForm) => {
      return apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order created successfully!",
      });
      // Invalidate all order-related queries with different parameter combinations
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', { status: undefined, search: undefined }] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', { status: undefined }] });
      queryClient.refetchQueries({ queryKey: ['/api/orders'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CreateOrderForm) => {
    console.log("Form data:", data);
    
    // Transform the data for the API
    const transformedData = {
      ...data,
      packages: data.packages || [{ description: "Package", quantity: 1 }],
      weight: costEstimate.weight || 1,
      distance: costEstimate.distance || 25,
    };
    
    createOrderMutation.mutate(transformedData);
  };

  const watchedValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] h-[85vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* Left Side - Form */}
          <div className="w-1/2 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <DialogTitle className="text-lg font-medium text-gray-800">Create Order</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form Content */}
            <div className="p-6 h-[calc(100%-80px)] overflow-y-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* Customer Name */}
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Customer Name" 
                            className="h-9" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company - using phone field for now */}
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Company</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Company Name" 
                            className="h-9" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Country */}
                  <FormField
                    control={form.control}
                    name="deliveryCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Country *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="MX">Mexico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Address */}
                  <div className="space-y-3">
                    <FormLabel className="text-sm font-medium">Address *</FormLabel>
                    
                    <FormField
                      control={form.control}
                      name="deliveryLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="Address Line 1" 
                                className="h-9" 
                                {...field}
                                id="address-autocomplete"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryLine2"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Address Line 2" 
                              className="h-9" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="deliveryCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="City" 
                                className="h-9" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deliveryState"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="State" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AL">AL</SelectItem>
                                  <SelectItem value="CA">CA</SelectItem>
                                  <SelectItem value="FL">FL</SelectItem>
                                  <SelectItem value="IL">IL</SelectItem>
                                  <SelectItem value="NY">NY</SelectItem>
                                  <SelectItem value="TX">TX</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deliveryZip"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Zip Code" 
                                className="h-9" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Phone - using a different approach */}
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      placeholder="(555) 123-4567" 
                      className="h-9 mt-1" 
                    />
                  </div>

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="customer@example.com" 
                            className="h-9" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Special Instructions */}
                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Special Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any special delivery instructions..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </form>
              </Form>
            </div>
          </div>

          {/* Right Side - Preview Panel */}
          <div className="w-1/2 bg-blue-50 border-l">
            {/* Preview Header */}
            <div className="p-4 border-b bg-blue-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-blue-900">Shipping Details</h3>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply Preset ▼
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-4 space-y-4">
              
              {/* Ship From */}
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Ship From</div>
                <div className="text-sm font-medium">Warehouse</div>
                <div className="text-xs text-gray-600">1049 Industrial Dr, Bensenville, IL 60106</div>
              </div>

              {/* Weight & Service */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-600 mb-1">Weight</div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={costEstimate.weight} 
                      onChange={(e) => setCostEstimate(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-xs">(lbs)</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-600 mb-1">Service</div>
                  <Select defaultValue="ground">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ground">Ground</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="overnight">Overnight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Package & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-600 mb-1">Package</div>
                  <Select defaultValue="package">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="package">Package</SelectItem>
                      <SelectItem value="envelope">Envelope</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-600 mb-1">Size</div>
                  <div className="grid grid-cols-3 gap-1">
                    <Input placeholder="L" className="h-8 text-xs" />
                    <Input placeholder="W" className="h-8 text-xs" />
                    <Input placeholder="H" className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              {/* Rate */}
              <div className="bg-white p-4 rounded border">
                <div className="text-sm font-medium text-green-700 mb-2">Rate</div>
                <div className="text-2xl font-bold text-green-700">${costEstimate.total.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Base: $5.00 + Weight: ${(costEstimate.weight * 0.5).toFixed(2)} + Distance: ${(25 * 0.75).toFixed(2)}
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Delivery</div>
                <div className="text-sm font-medium">Tomorrow by 11:30 PM</div>
              </div>

              {/* Create Button */}
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={createOrderMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                {createOrderMutation.isPending ? "Creating..." : `Create + Print Label`}
                <span className="ml-2">▼</span>
              </Button>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}