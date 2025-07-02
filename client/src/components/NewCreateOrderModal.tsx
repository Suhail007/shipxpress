import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertOrderSchema } from "@shared/schema";

// Simple, working address autocomplete
const SimpleAddressAutocomplete = ({ 
  onAddressSelect, 
  placeholder = "Start typing address..." 
}: {
  onAddressSelect: (data: { street: string; city: string; state: string; zip: string }) => void;
  placeholder?: string;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const loadGoogleMaps = async () => {
      // Check if Google Maps is already loaded
      if (window.google?.maps?.places) {
        if (isMounted) setIsLoaded(true);
        return;
      }

      // Wait for it to load
      let attempts = 0;
      const checkLoaded = () => {
        attempts++;
        if (window.google?.maps?.places) {
          if (isMounted) setIsLoaded(true);
        } else if (attempts < 50) {
          setTimeout(checkLoaded, 200);
        }
      };
      checkLoaded();
    };

    loadGoogleMaps();

    return () => {
      isMounted = false;
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (place?.address_components) {
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

          const addressData = {
            street: street.trim(),
            city,
            state,
            zip
          };

          setInputValue(addressData.street);
          onAddressSelect(addressData);
        }
      });
    } catch (error) {
      console.error('Autocomplete initialization error:', error);
    }
  }, [isLoaded, onAddressSelect]);

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder={placeholder}
      className="h-8"
    />
  );
};

const createOrderFormSchema = insertOrderSchema.extend({
  packages: z.array(z.object({
    description: z.string().min(1, "Description required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    weight: z.number().min(0, "Weight must be non-negative").optional(),
    dimensions: z.string().optional()
  })).min(1, "At least one package required")
});

type CreateOrderForm = z.infer<typeof createOrderFormSchema>;

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCreateOrderModal({ open, onOpenChange }: CreateOrderModalProps) {
  const queryClient = useQueryClient();
  const [costEstimate, setCostEstimate] = useState({ weight: 0, distance: 0, total: "0.00" });

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      deliveryLine1: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryCountry: "United States",
      pickupDate: new Date().toISOString().split('T')[0],
      serviceType: "standard",
      specialInstructions: "",
      packages: [{ description: "", quantity: 1, weight: 0, dimensions: "" }],
      status: "pending",
      weight: 0,
      distance: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages"
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderForm) => apiRequest("/api/orders", {
      method: "POST",
      body: data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      form.reset();
      onOpenChange(false);
    }
  });

  const handleAddressSelect = (addressData: { street: string; city: string; state: string; zip: string }) => {
    form.setValue('deliveryLine1', addressData.street);
    form.setValue('deliveryCity', addressData.city);
    form.setValue('deliveryState', addressData.state);
    form.setValue('deliveryZip', addressData.zip);
  };

  const calculateCostEstimate = () => {
    const packages = form.watch("packages");
    const totalWeight = packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
    const distance = Math.floor(Math.random() * 50) + 10; // Placeholder
    const total = (totalWeight * 2.5 + distance * 1.2).toFixed(2);
    
    setCostEstimate({ weight: totalWeight, distance, total });
    form.setValue('weight', totalWeight);
    form.setValue('distance', distance);
  };

  useEffect(() => {
    calculateCostEstimate();
  }, [form.watch("packages")]);

  const onSubmit = async (data: CreateOrderForm) => {
    try {
      await createOrderMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Customer Information - Right to Left Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" className="h-8" {...field} />
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
                      <FormLabel className="text-sm">Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" className="h-8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="h-8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">Delivery Address</h3>
              
              <FormField
                control={form.control}
                name="deliveryLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Street Address (Start typing for suggestions)</FormLabel>
                    <FormControl>
                      <SimpleAddressAutocomplete 
                        onAddressSelect={handleAddressSelect}
                        placeholder="123 Main Street"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="deliveryZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="60601" className="h-8" {...field} />
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
                        <FormLabel className="text-sm">State</FormLabel>
                        <FormControl>
                          <Input placeholder="IL" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="deliveryCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">City</FormLabel>
                        <FormControl>
                          <Input placeholder="Chicago" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Order Details - Right to Left Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Service Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select service" />
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
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Pickup Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Package Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">Package Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, weight: 0, dimensions: "" })}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Package
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Package {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <FormField
                      control={form.control}
                      name={`packages.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-sm">Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Package contents" className="h-8" {...field} />
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
                          <FormLabel className="text-sm">Qty</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              className="h-8"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`packages.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Weight (lbs)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="0"
                              className="h-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`packages.${index}.dimensions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Dimensions (L x W x H)</FormLabel>
                        <FormControl>
                          <Input placeholder="12 x 8 x 6 inches" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special delivery instructions..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost Estimate */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4" />
                <h3 className="text-sm font-medium">Cost Estimate</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Weight</div>
                  <div className="font-medium">{costEstimate.weight} lbs</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Distance</div>
                  <div className="font-medium">{costEstimate.distance} mi</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Total</div>
                  <div className="font-semibold text-lg">${costEstimate.total}</div>
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