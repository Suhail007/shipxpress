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
  const [addressValidation, setAddressValidation] = useState({
    isValid: false,
    isValidating: false,
    error: '',
    suggestion: ''
  });
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



  // Simple distance calculation using Haversine formula (fallback)
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

  // Helper function to provide friendly error messages for incomplete addresses
  const getIncompleteAddressMessage = useCallback((address: string, city: string, state: string, zip: string) => {
    const missing = [];
    if (!address.trim()) missing.push('street address');
    if (!city.trim()) missing.push('city');
    if (!state.trim()) missing.push('state');
    
    if (missing.length > 0) {
      return {
        error: `Please enter the ${missing.join(', ')} to validate this address.`,
        suggestion: 'Complete address helps ensure accurate delivery.'
      };
    }
    
    if (!zip.trim()) {
      return {
        error: '',
        suggestion: 'Adding a ZIP code improves address accuracy.'
      };
    }
    
    return { error: '', suggestion: '' };
  }, []);

  // Real-time address validation function
  const validateAddressInRealTime = useCallback(async (address: string, city: string, state: string, zip: string) => {
    // Check for incomplete addresses first
    const incompleteCheck = getIncompleteAddressMessage(address, city, state, zip);
    if (incompleteCheck.error) {
      setAddressValidation({
        isValid: false,
        isValidating: false,
        error: incompleteCheck.error,
        suggestion: incompleteCheck.suggestion
      });
      return;
    }

    if (!address || !city || !state) {
      setAddressValidation({
        isValid: false,
        isValidating: false,
        error: '',
        suggestion: incompleteCheck.suggestion
      });
      return;
    }

    setAddressValidation(prev => ({ ...prev, isValidating: true, error: '' }));

    try {
      const fullAddress = `${address}, ${city}, ${state} ${zip || ''}`.trim();
      
      // Use Google Geocoding API for validation
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setAddressValidation({
          isValid: false,
          isValidating: false,
          error: 'Address validation temporarily unavailable',
          suggestion: ''
        });
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Validation service unavailable');
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const isExactMatch = result.types.includes('street_address') || result.types.includes('premise');
        const isSubpremise = result.types.includes('subpremise');
        const isRoute = result.types.includes('route');
        const isNeighborhood = result.types.includes('neighborhood');
        
        if (isExactMatch || isSubpremise) {
          setAddressValidation({
            isValid: true,
            isValidating: false,
            error: '',
            suggestion: ''
          });
        } else if (isRoute) {
          setAddressValidation({
            isValid: false,
            isValidating: false,
            error: 'Please include a house or building number',
            suggestion: `Try: [Number] ${result.formatted_address}`
          });
        } else if (isNeighborhood) {
          setAddressValidation({
            isValid: false,
            isValidating: false,
            error: 'Address is too general - needs a specific street address',
            suggestion: 'Include the complete street address for accurate delivery.'
          });
        } else {
          // For other types like establishment, locality, etc.
          const partialMatch = result.partial_match;
          setAddressValidation({
            isValid: false,
            isValidating: false,
            error: partialMatch ? 'Address partially found - please verify' : 'Address could be more specific',
            suggestion: `Suggested: ${result.formatted_address}`
          });
        }
      } else if (data.status === 'ZERO_RESULTS') {
        setAddressValidation({
          isValid: false,
          isValidating: false,
          error: 'Address not found. Please check the spelling and try again.',
          suggestion: 'Verify the street name, city, and state are correct.'
        });
      } else if (data.status === 'REQUEST_DENIED') {
        setAddressValidation({
          isValid: false,
          isValidating: false,
          error: 'Address validation service temporarily unavailable',
          suggestion: 'Please verify the address manually.'
        });
      } else {
        setAddressValidation({
          isValid: false,
          isValidating: false,
          error: 'Unable to verify this address',
          suggestion: 'Please double-check the address details.'
        });
      }
    } catch (error) {
      console.warn('Address validation error:', error);
      setAddressValidation({
        isValid: false,
        isValidating: false,
        error: 'Address validation temporarily unavailable',
        suggestion: ''
      });
    }
  }, []);

  // Debounced address validation
  const debouncedValidateAddress = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (address: string, city: string, state: string, zip: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          validateAddressInRealTime(address, city, state, zip);
        }, 800); // Wait 800ms after user stops typing
      };
    })(),
    [validateAddressInRealTime]
  );

  // Real-time distance calculation using Google Maps Distance Matrix API
  const calculateRealTimeDistance = useCallback(async (destinationLat: number, destinationLng: number) => {
    try {
      const pickup = clientLocation 
        ? `${clientLocation.lat},${clientLocation.lng}`
        : "1049 Industrial Dr, Bensenville, IL 60106";
      const delivery = `${destinationLat},${destinationLng}`;
      
      const response = await fetch('/api/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, delivery })
      });
      
      if (response.ok) {
        const data = await response.json();
        const distance = data.distance || 25;
        setEstimatedDistance(distance);
        
        // Update cost estimate immediately
        const totalWeight = packages.reduce((sum, pkg) => sum + (Number(pkg?.weight) || 0), 0);
        const weightCost = totalWeight * 0.75;
        const distanceCost = distance * 0.025;
        const total = weightCost + distanceCost;
        
        setCostEstimate({
          weight: totalWeight,
          distance: distance,
          total: total
        });
      }
    } catch (error) {
      console.warn('Real-time distance calculation failed:', error);
      // Fallback to straight-line distance
      const fallbackDistance = calculateStraightLineDistance(
        clientLocation?.lat || 41.96, 
        clientLocation?.lng || -87.93,
        destinationLat, 
        destinationLng
      );
      setEstimatedDistance(Math.round(fallbackDistance));
    }
  }, [clientLocation, packages, calculateStraightLineDistance]);

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

  // Trigger real-time address validation when address fields change
  useEffect(() => {
    if (deliveryAddress || deliveryCity || deliveryState || deliveryZip) {
      debouncedValidateAddress(deliveryAddress, deliveryCity, deliveryState, deliveryZip);
    }
  }, [deliveryAddress, deliveryCity, deliveryState, deliveryZip, debouncedValidateAddress]);

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

      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry']
        }
      );

      // Style dropdown for better visibility
      const styleDropdown = () => {
        const dropdown = document.querySelector('.pac-container');
        if (dropdown) {
          dropdown.setAttribute('style', 'z-index: 9999 !important;');
        }
      };

      // Monitor for dropdown appearance
      const observer = new MutationObserver(styleDropdown);
      observer.observe(document.body, { childList: true, subtree: true });

      // Handle place selection with improved logic
      autocompleteRef.current.addListener('place_changed', () => {
        console.log('Google Places: place_changed event fired');
        
        try {
          const place = autocompleteRef.current?.getPlace();
          console.log('Google Places: selected place:', place);
          
          // Enhanced place validation - check if we have meaningful data
          if (!place) {
            console.log('No place object returned');
            return;
          }

          // Check for place_id as the most reliable indicator of a valid selection
          if (!place.place_id && !place.address_components && !place.formatted_address) {
            console.log('Invalid place selection - no identifying data');
            return;
          }

          // If we only have name but no address data, try to get more details
          if (place.name && !place.address_components && !place.formatted_address) {
            console.log('Place has name but no address - might be incomplete selection');
            return;
          }

          // Log place object for debugging
          console.log('Place object:', {
            hasComponents: !!place.address_components,
            hasFormatted: !!place.formatted_address,
            hasGeometry: !!place.geometry,
            placeId: place.place_id,
            name: place.name
          });

          // Process the place data
          if (place && (place.address_components || place.formatted_address)) {
          let street = '';
          let city = '';
          let state = '';
          let zip = '';

          // Use address_components if available for parsing
          if (place.address_components && place.address_components.length > 0) {
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
          } else if (place.formatted_address) {
            // Fallback: parse formatted_address if address_components is not available
            console.log('Using formatted_address fallback:', place.formatted_address);
            const addressParts = place.formatted_address.split(', ');
            if (addressParts.length >= 3) {
              street = addressParts[0] || '';
              city = addressParts[1] || '';
              const stateZip = addressParts[2]?.split(' ');
              state = stateZip?.[0] || '';
              zip = stateZip?.[1] || '';
            }
          }

          // Update form values with proper options to trigger updates
          const streetAddress = street.trim();
          console.log('Setting form values:', { streetAddress, city, state, zip });
          
          // Use setTimeout to ensure proper DOM updates
          setTimeout(() => {
            form.setValue('deliveryLine1', streetAddress, { 
              shouldValidate: true, 
              shouldDirty: true, 
              shouldTouch: true 
            });
            form.setValue('deliveryCity', city, { 
              shouldValidate: true, 
              shouldDirty: true, 
              shouldTouch: true 
            });
            form.setValue('deliveryState', state, { 
              shouldValidate: true, 
              shouldDirty: true, 
              shouldTouch: true 
            });
            form.setValue('deliveryZip', zip, { 
              shouldValidate: true, 
              shouldDirty: true, 
              shouldTouch: true 
            });

            // Force update the input field value and trigger React events
            if (addressInputRef.current) {
              const input = addressInputRef.current;
              input.value = streetAddress;
              
              // Create and dispatch events to ensure React Hook Form detects changes
              const inputEvent = new Event('input', { bubbles: true });
              const changeEvent = new Event('change', { bubbles: true });
              
              input.dispatchEvent(inputEvent);
              input.dispatchEvent(changeEvent);
            }

            // Force form to re-validate and update
            form.trigger();

            // Calculate distance immediately if we have coordinates
            if (place.geometry && place.geometry.location) {
              const lat = typeof place.geometry.location.lat === 'function' 
                ? place.geometry.location.lat() 
                : place.geometry.location.lat;
              const lng = typeof place.geometry.location.lng === 'function' 
                ? place.geometry.location.lng() 
                : place.geometry.location.lng;
              
              calculateRealTimeDistance(lat, lng);
            }

            // Hide the dropdown properly
            const dropdown = document.querySelector('.pac-container');
            if (dropdown) {
              dropdown.style.display = 'none';
            }
            
            // Blur the input to dismiss focus
            if (addressInputRef.current) {
              addressInputRef.current.blur();
            }
          }, 50);
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

  const onSubmit = async (data: CreateOrderForm) => {
    // Calculate final distance for accurate billing
    const finalDistance = await calculateDistance(
      data.deliveryLine1,
      data.deliveryCity,
      data.deliveryState,
      data.deliveryZip
    );

    // Calculate total weight from packages
    const totalWeight = data.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);

    // Include weight and distance in the order data for billing
    const orderData = {
      ...data,
      weight: totalWeight,
      distance: finalDistance
    };

    createOrderMutation.mutate(orderData);
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
                        <FormLabel className="text-xs flex items-center gap-2">
                          Address *
                          {addressValidation.isValidating && (
                            <div className="h-3 w-3 border border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          )}
                          {addressValidation.isValid && !addressValidation.isValidating && (
                            <span className="text-green-600 text-xs">✓ Valid</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Start typing address..." 
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e);
                              // Clear autocomplete selection when user types manually
                              if (autocompleteRef.current) {
                                autocompleteRef.current.set('place', null);
                              }
                            }}
                            onBlur={field.onBlur}
                            ref={addressInputRef}
                            className={`h-8 ${
                              addressValidation.error ? 'border-red-500 focus:border-red-500' : 
                              addressValidation.isValid ? 'border-green-500 focus:border-green-500' : ''
                            }`}
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                        {addressValidation.error && (
                          <div className="text-xs text-red-600 mt-1">
                            <p>{addressValidation.error}</p>
                            {addressValidation.suggestion && (
                              <p className="text-gray-600 italic">{addressValidation.suggestion}</p>
                            )}
                          </div>
                        )}
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
                  
                  {/* Address Validation Summary */}
                  {(deliveryAddress || deliveryCity || deliveryState) && (
                    <div className={`p-3 rounded-lg border-l-4 ${
                      addressValidation.isValid 
                        ? 'bg-green-50 border-green-500' 
                        : addressValidation.error 
                        ? 'bg-red-50 border-red-500' 
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-start gap-2">
                        {addressValidation.isValidating ? (
                          <div className="h-4 w-4 border border-orange-500 border-t-transparent rounded-full animate-spin mt-0.5"></div>
                        ) : addressValidation.isValid ? (
                          <span className="text-green-600 text-sm mt-0.5">✓</span>
                        ) : addressValidation.error ? (
                          <span className="text-red-600 text-sm mt-0.5">⚠</span>
                        ) : (
                          <span className="text-yellow-600 text-sm mt-0.5">?</span>
                        )}
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${
                            addressValidation.isValid 
                              ? 'text-green-800' 
                              : addressValidation.error 
                              ? 'text-red-800' 
                              : 'text-yellow-800'
                          }`}>
                            {addressValidation.isValidating 
                              ? 'Validating address...' 
                              : addressValidation.isValid 
                              ? 'Address verified and ready for delivery' 
                              : addressValidation.error 
                              ? 'Address needs attention' 
                              : 'Enter complete address for validation'
                            }
                          </p>
                          {addressValidation.suggestion && (
                            <p className="text-xs text-gray-600 mt-1">{addressValidation.suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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