import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Trash2, Calculator } from "lucide-react";

type CreateOrderForm = z.infer<typeof insertOrderSchema>;

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function CreateOrderModal({ open, onOpenChange }: CreateOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [estimatedDistance, setEstimatedDistance] = useState<number>(25);
  const [costEstimate, setCostEstimate] = useState({ weight: 0, distance: 25, total: 0 });
  const [clientLocation, setClientLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Get client's current location
  const getCurrentLocation = useCallback(() => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClientLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoadingLocation(false);
          toast({
            title: "Location Found",
            description: "Using your current location for distance calculation",
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setIsLoadingLocation(false);
          toast({
            title: "Location Access Denied",
            description: "Using default pickup location for distance calculation",
            variant: "destructive"
          });
        }
      );
    } else {
      setIsLoadingLocation(false);
      toast({
        title: "Location Not Supported",
        description: "Using default pickup location for distance calculation",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Simple distance calculation using Haversine formula
  const calculateStraightLineDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Google Maps Distance calculation
  const calculateDistance = useCallback(async (deliveryAddress: string, city: string, state: string, zip: string) => {
    if (!deliveryAddress || !city || !state) return 25; // Default distance
    
    // Use client location if available, otherwise use default pickup
    const pickupLocation = clientLocation 
      ? `${clientLocation.lat},${clientLocation.lng}`
      : "1049 Industrial Dr, Bensenville, IL 60106";
    const fullDeliveryAddress = `${deliveryAddress}, ${city}, ${state} ${zip}`;
    
    try {
      const response = await fetch('/api/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLocation,
          delivery: fullDeliveryAddress
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.distance || 25;
      }
    } catch (error) {
      console.warn('Distance calculation failed, using default:', error);
    }
    
    return 25; // Fallback to default
  }, [clientLocation]);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      deliveryLine1: "",
      deliveryLine2: "" as string,
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryCountry: "US",
      pickupDate: getTodayDate(),
      packages: [
        {
          type: "package",
          weight: 1,
          dimensions: {
            length: 10,
            width: 10,
            height: 10
          }
        }
      ],
      specialInstructions: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages"
  });

  // Watch form values for real-time calculations
  const watchedValues = form.watch();
  const packages = watchedValues.packages || [];
  const deliveryAddress = watchedValues.deliveryLine1 || "";
  const deliveryCity = watchedValues.deliveryCity || "";
  const deliveryState = watchedValues.deliveryState || "";
  const deliveryZip = watchedValues.deliveryZip || "";

  // Calculate total weight from packages in real-time
  useEffect(() => {
    const totalWeight = packages.reduce((sum, pkg) => {
      return sum + (Number(pkg?.weight) || 0);
    }, 0);
    
    const weightCost = totalWeight * 0.75;
    const distanceCost = estimatedDistance * 0.025;
    const total = weightCost + distanceCost;
    
    setCostEstimate({
      weight: totalWeight,
      distance: estimatedDistance,
      total: total
    });
  }, [packages, estimatedDistance]);

  // Calculate distance when address changes
  useEffect(() => {
    if (deliveryAddress && deliveryCity && deliveryState) {
      calculateDistance(deliveryAddress, deliveryCity, deliveryState, deliveryZip)
        .then(distance => {
          setEstimatedDistance(distance);
        });
    }
  }, [deliveryAddress, deliveryCity, deliveryState, deliveryZip, calculateDistance]);

  // Load Google Maps script and initialize autocomplete
  useEffect(() => {
    const loadGoogleMaps = () => {
      if ((window as any).google && (window as any).google.maps) {
        initializeAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeAutocomplete;
      document.head.appendChild(script);
    };

    const initializeAutocomplete = () => {
      if (!addressInputRef.current || !(window as any).google) return;

      autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_component', 'formatted_address', 'geometry']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.address_components) {
          let street = '';
          let city = '';
          let state = '';
          let zip = '';

          place.address_components.forEach((component: any) => {
            const types = component.types;
            if (types.includes('street_number')) {
              street = component.long_name + ' ';
            } else if (types.includes('route')) {
              street += component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('postal_code')) {
              zip = component.long_name;
            }
          });



          // Update form values immediately and trigger validation
          form.setValue('deliveryLine1', street.trim(), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          form.setValue('deliveryCity', city, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          form.setValue('deliveryState', state, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          form.setValue('deliveryZip', zip, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

          // Force form re-render and validation
          setTimeout(() => {
            form.trigger(['deliveryLine1', 'deliveryCity', 'deliveryState', 'deliveryZip']);
          }, 0);

          // Calculate distance if we have coordinates
          if (place.geometry && place.geometry.location) {
            const destinationLat = typeof place.geometry.location.lat === 'function' 
              ? place.geometry.location.lat() 
              : place.geometry.location.lat;
            const destinationLng = typeof place.geometry.location.lng === 'function' 
              ? place.geometry.location.lng() 
              : place.geometry.location.lng;
            
            if (clientLocation) {
              const distance = calculateStraightLineDistance(
                clientLocation.lat,
                clientLocation.lng,
                destinationLat,
                destinationLng
              );
              setEstimatedDistance(Math.round(distance));
            } else {
              // Use default pickup location (Bensenville, IL)
              const distance = calculateStraightLineDistance(
                41.96, -87.93,
                destinationLat,
                destinationLng
              );
              setEstimatedDistance(Math.round(distance));
            }
          }

          // Blur the input to dismiss the dropdown
          if (addressInputRef.current) {
            addressInputRef.current.blur();
          }
        }
      });
    };

    if (open) {
      loadGoogleMaps();
    }
  }, [open, form]);

  // Get location when modal opens
  useEffect(() => {
    if (open && !clientLocation) {
      getCurrentLocation();
    }
  }, [open, clientLocation, getCurrentLocation]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderForm) => {
      await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Created",
        description: "The order has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
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
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateOrderForm) => {
    createOrderMutation.mutate(data);
  };

  const addPackage = () => {
    append({
      type: "package",
      weight: 1,
      dimensions: {
        length: 10,
        width: 10,
        height: 10
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Fill in the order details to create a new delivery order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
            <div className="grid grid-cols-2 gap-6 min-h-[500px]">
              {/* Left Side - Order Details */}
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Customer Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm border-b pb-1">Customer Details</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Customer name" {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="555-0123" {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="customer@email.com" {...field} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm border-b pb-1">Delivery Address</h3>
                  <FormField
                    control={form.control}
                    name="deliveryLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Start typing address..." 
                            {...field}
                            ref={addressInputRef}
                            className="h-8" 
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="deliveryCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Chicago" {...field} className="h-8" />
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
                          <FormLabel className="text-xs">State *</FormLabel>
                          <FormControl>
                            <Input placeholder="IL" {...field} className="h-8" />
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
                          <FormLabel className="text-xs">ZIP *</FormLabel>
                          <FormControl>
                            <Input placeholder="60601" {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Package Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm border-b pb-1">Package Details</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPackage}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border rounded p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Package {index + 1}</span>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-4 w-4 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <FormField
                            control={form.control}
                            name={`packages.${index}.weight`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Weight (lbs)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="0" 
                                    type="number" 
                                    step="0.1"
                                    {...field} 
                                    className="h-8 text-sm"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`packages.${index}.dimensions.length`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Length</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="0" 
                                    type="number" 
                                    {...field} 
                                    className="h-8 text-sm"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`packages.${index}.dimensions.width`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Width</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="0" 
                                    type="number" 
                                    {...field} 
                                    className="h-8 text-sm"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`packages.${index}.dimensions.height`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Height</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="0" 
                                    type="number" 
                                    {...field} 
                                    className="h-8 text-sm"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pickup Date */}
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pickup Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right Side - Cost Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Cost Estimate
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Total Weight:</span>
                      <span className="font-medium">{costEstimate.weight.toFixed(2)} lbs</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Estimated Distance:</span>
                        {!clientLocation && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={getCurrentLocation}
                            disabled={isLoadingLocation}
                          >
                            {isLoadingLocation ? "..." : "📍"}
                          </Button>
                        )}
                      </div>
                      <span className="font-medium">
                        {costEstimate.distance} miles
                        {clientLocation && <span className="text-xs text-green-600 ml-1">(from your location)</span>}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Weight Charge:</span>
                        <span className="text-sm">${(costEstimate.weight * 0.75).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {costEstimate.weight.toFixed(2)} lbs × $0.75/lb
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Distance Charge:</span>
                        <span className="text-sm">${(costEstimate.distance * 0.025).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {costEstimate.distance} miles × $0.025/mile
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-lg">Total Estimated Cost:</span>
                        <span className="font-bold text-xl text-green-600">
                          ${costEstimate.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <p className="text-blue-800 font-medium mb-1">Pricing Information:</p>
                    <p className="text-blue-700 text-xs">
                      • Weight: $0.75 per pound<br/>
                      • Distance: $0.025 per mile<br/>
                      • Distance calculated after address verification
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Special Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special delivery instructions..." 
                            {...field} 
                            className="min-h-16 text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2 pt-4">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending ? "Creating..." : `Create Order - $${costEstimate.total.toFixed(2)}`}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}