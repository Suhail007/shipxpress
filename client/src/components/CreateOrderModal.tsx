import { useState, useEffect } from "react";
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
  const [costEstimate, setCostEstimate] = useState({ weight: 0, distance: 25, total: 0 });

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

  // Calculate cost in real-time
  useEffect(() => {
    const packages = form.watch("packages");
    const totalWeight = packages?.reduce((sum, pkg) => sum + (pkg.weight || 0), 0) || 0;
    const estimatedDistance = 25; // Default distance estimate
    const total = (totalWeight * 0.75) + (estimatedDistance * 0.025);
    
    setCostEstimate({
      weight: totalWeight,
      distance: estimatedDistance,
      total: total
    });
  }, [form.watch("packages")]);

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
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Fill in the order details to create a new delivery order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
            <div className="grid grid-cols-2 gap-6 h-[450px]">
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
                          <Input placeholder="123 Main St" {...field} className="h-8" />
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
                      <span className="text-sm text-gray-600">Estimated Distance:</span>
                      <span className="font-medium">{costEstimate.distance} miles</span>
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