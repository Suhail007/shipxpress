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
import { Plus, Trash2, Calculator, Package, MapPin, User, Clock } from "lucide-react";

type CreateOrderForm = z.infer<typeof insertOrderSchema>;

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function CreateOrderModalSplit({ open, onOpenChange }: CreateOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costEstimate, setCostEstimate] = useState({ weight: 0, distance: 25, total: 0 });

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
      packages: [{ description: "", quantity: 1, weight: 0, dimensions: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  // Calculate cost estimate
  const calculateCostEstimate = useCallback(() => {
    const packages = form.getValues('packages');
    const totalWeight = packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
    const distance = 25; // Default distance
    
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
  }, [form]);

  // Watch form changes to update cost estimate
  useEffect(() => {
    const subscription = form.watch(() => {
      calculateCostEstimate();
    });
    return () => subscription.unsubscribe();
  }, [form, calculateCostEstimate]);

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderForm) => {
      return apiRequest("/api/orders", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order created successfully!",
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

  const watchedValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new shipping order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
              
              {/* Left Side - Form */}
              <div className="space-y-4 overflow-y-auto pr-4">
                
                {/* Customer Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Customer Information</h3>
                  </div>
                  
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Delivery Address</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="deliveryLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" className="h-8" {...field} />
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
                        <FormLabel className="text-sm">Apt/Suite (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Apt 2B" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  </div>
                </div>

                {/* Pickup Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Pickup Date</h3>
                  </div>
                  
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

                {/* Packages */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Packages</h3>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Package {index + 1}</span>
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
                      
                      <FormField
                        control={form.control}
                        name={`packages.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Package contents" className="h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`packages.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1" 
                                  className="h-8" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                                  step="0.1"
                                  placeholder="1.0" 
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
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", quantity: 1, weight: 0, dimensions: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Package
                  </Button>
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
              </div>

              {/* Right Side - Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                <h3 className="font-semibold text-lg">Order Summary</h3>
                
                {/* Customer Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Customer</h4>
                  <div className="bg-white p-3 rounded border text-sm">
                    <div className="font-medium">{watchedValues.customerName || "Customer Name"}</div>
                    <div className="text-gray-600">{watchedValues.customerEmail || "Email not provided"}</div>
                    <div className="text-gray-600">{watchedValues.customerPhone || "Phone not provided"}</div>
                  </div>
                </div>
                
                {/* Delivery Address Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Delivery Address</h4>
                  <div className="bg-white p-3 rounded border text-sm">
                    <div>{watchedValues.deliveryLine1 || "Street Address"}</div>
                    {watchedValues.deliveryLine2 && <div>{watchedValues.deliveryLine2}</div>}
                    <div>
                      {watchedValues.deliveryCity || "City"}, {watchedValues.deliveryState || "State"} {watchedValues.deliveryZip || "ZIP"}
                    </div>
                  </div>
                </div>
                
                {/* Packages Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Packages</h4>
                  <div className="bg-white p-3 rounded border text-sm space-y-2">
                    {watchedValues.packages?.map((pkg, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                          <div className="font-medium">{pkg.description || `Package ${index + 1}`}</div>
                          <div className="text-gray-600">Qty: {pkg.quantity || 1} • {pkg.weight || 0} lbs</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Cost Estimate */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Cost Estimate</h4>
                  <div className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Base Fee</span>
                      <span>$5.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Weight ({costEstimate.weight} lbs × $0.50)</span>
                      <span>${(costEstimate.weight * 0.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Distance ({costEstimate.distance} miles × $0.75)</span>
                      <span>${(costEstimate.distance * 0.75).toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total</span>
                      <span className="text-lg">${costEstimate.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Submit Buttons */}
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}