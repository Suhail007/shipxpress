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
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState('');
  const [addressValidationStatus, setAddressValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'error'>('idle');
  
  // Google Places autocomplete refs
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(insertOrderSchema.extend({
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
      serviceType: "standard",
      priority: "normal",
      packages: [{ description: "", quantity: 1, weight: 0, dimensions: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  // Calculate total weight from packages
  const calculateTotalWeight = useCallback(() => {
    const packages = form.getValues('packages');
    const totalWeight = packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
    return totalWeight;
  }, [form]);

  // Calculate cost estimate
  const calculateCostEstimate = useCallback(() => {
    const totalWeight = calculateTotalWeight();
    const distance = estimatedDistance;
    
    // Base rate calculation
    const weightRate = 0.50; // $0.50 per pound
    const distanceRate = 0.75; // $0.75 per mile
    const baseFee = 5.00; // $5 base fee
    
    const weightCost = totalWeight * weightRate;
    const distanceCost = distance * distanceRate;
    const total = baseFee + weightCost + distanceCost;
    
    setCostEstimate({
      weight: totalWeight,
      distance,
      total: Math.round(total * 100) / 100
    });
  }, [calculateTotalWeight, estimatedDistance]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClientLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
          // Default to Chicago area
          setClientLocation({ lat: 41.8781, lng: -87.6298 });
        }
      );
    } else {
      // Default to Chicago area
      setClientLocation({ lat: 41.8781, lng: -87.6298 });
    }
  }, []);

  // Calculate real-time distance
  const calculateRealTimeDistance = useCallback((destinationLat: number, destinationLng: number) => {
    if (!clientLocation) return;

    const origin = new google.maps.LatLng(clientLocation.lat, clientLocation.lng);
    const destination = new google.maps.LatLng(destinationLat, destinationLng);
    
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
      avoidHighways: false,
      avoidTolls: false
    }, (response, status) => {
      if (status === google.maps.DistanceMatrixStatus.OK && response) {
        const distance = response.rows[0].elements[0];
        if (distance.status === 'OK') {
          const distanceInMiles = Math.round(distance.distance.value * 0.000621371);
          setEstimatedDistance(distanceInMiles);
        }
      }
    });
  }, [clientLocation]);

  // Address validation
  const validateAddress = useCallback(async () => {
    const line1 = form.getValues('deliveryLine1');
    const city = form.getValues('deliveryCity');
    const state = form.getValues('deliveryState');
    const zip = form.getValues('deliveryZip');

    if (!line1 || !city || !state || !zip) {
      setAddressValidationStatus('idle');
      setAddressValidationMessage('Please fill in all address fields');
      setIsAddressValidated(false);
      return;
    }

    setAddressValidationStatus('validating');
    setAddressValidationMessage('Validating address...');

    try {
      const geocoder = new google.maps.Geocoder();
      const fullAddress = `${line1}, ${city}, ${state} ${zip}, US`;
      
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          calculateRealTimeDistance(location.lat(), location.lng());
          
          setAddressValidationStatus('valid');
          setAddressValidationMessage('Address validated successfully');
          setIsAddressValidated(true);
        } else {
          setAddressValidationStatus('invalid');
          setAddressValidationMessage('Unable to validate address. Please check and try again.');
          setIsAddressValidated(false);
        }
      });
    } catch (error) {
      console.error('Address validation error:', error);
      setAddressValidationStatus('error');
      setAddressValidationMessage('Error validating address. Please try again.');
      setIsAddressValidated(false);
    }
  }, [form, calculateRealTimeDistance]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.log('Google Maps not loaded, retrying...');
        setTimeout(loadGoogleMaps, 1000);
        return;
      }

      if (!addressInputRef.current || autocompleteRef.current) {
        return;
      }

      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['place_id', 'formatted_address', 'address_components', 'geometry']
        }
      );

      // Handle place selection
      autocompleteRef.current.addListener('place_changed', () => {
        console.log('Google Places: place_changed event fired');
        
        try {
          const place = autocompleteRef.current?.getPlace();
          console.log('Google Places: selected place:', place);
          
          if (!place || !place.place_id) {
            console.log('Invalid place selection');
            return;
          }

          // Process the place data
          if (place.address_components) {
            let street = '';
            let city = '';
            let state = '';
            let zip = '';

            place.address_components.forEach((component) => {
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

            const streetAddress = street.trim();
            console.log('Setting form values:', { streetAddress, city, state, zip });
            
            // Update form values
            form.setValue('deliveryLine1', streetAddress, { shouldValidate: true });
            form.setValue('deliveryCity', city, { shouldValidate: true });
            form.setValue('deliveryState', state, { shouldValidate: true });
            form.setValue('deliveryZip', zip, { shouldValidate: true });

            // Calculate distance if we have coordinates
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              calculateRealTimeDistance(lat, lng);
            }

            // Update address input value
            if (addressInputRef.current) {
              addressInputRef.current.value = streetAddress;
            }
          }
        } catch (error) {
          console.error('Error processing place selection:', error);
        }
      });
    };

    if (open) {
      loadGoogleMaps();
    }
  }, [open, form, calculateRealTimeDistance]);

  // Get location when modal opens
  useEffect(() => {
    if (open && !clientLocation) {
      getCurrentLocation();
    }
  }, [open, clientLocation, getCurrentLocation]);

  // Recalculate cost when packages or distance change
  useEffect(() => {
    calculateCostEstimate();
  }, [calculateCostEstimate, estimatedDistance, form.watch('packages')]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderForm) => {
      const orderData = {
        ...data,
        estimatedDistance,
        costEstimate: costEstimate.total,
      };
      
      const response = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to create order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Created",
        description: "Your order has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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
    createOrderMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new shipping order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                    <FormLabel>Customer Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
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
                  <FormLabel>Customer Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Delivery Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Address</h3>
              
              <FormField
                control={form.control}
                name="deliveryLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St"
                        {...field}
                        ref={addressInputRef}
                        onChange={(e) => {
                          field.onChange(e);
                          setAddressValidationStatus('idle');
                          setIsAddressValidated(false);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Chicago" {...field} />
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
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="IL" {...field} />
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
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="60601" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address Validation */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={validateAddress}
                  disabled={addressValidationStatus === 'validating'}
                >
                  {addressValidationStatus === 'validating' ? 'Validating...' : 'Validate Address'}
                </Button>
                {addressValidationMessage && (
                  <span className={`text-sm ${
                    addressValidationStatus === 'valid' 
                      ? 'text-green-600' 
                      : addressValidationStatus === 'invalid' || addressValidationStatus === 'error'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {addressValidationMessage}
                  </span>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="overnight">Overnight</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Package Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Package Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, weight: 0, dimensions: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Package {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`packages.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Package contents" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`packages.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`packages.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (lbs)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`packages.${index}.dimensions`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions (L x W x H)</FormLabel>
                          <FormControl>
                            <Input placeholder="12 x 8 x 6 inches" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special delivery instructions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost Estimate */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4" />
                <h3 className="font-semibold">Cost Estimate</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Weight:</span>
                  <span>{costEstimate.weight} lbs</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Distance:</span>
                  <span>{costEstimate.distance} miles</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Estimated Total:</span>
                  <span>${costEstimate.total}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}