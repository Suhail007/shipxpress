import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, Scan, CheckCircle, AlertCircle, Keyboard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanSuccess?: (orderNumber: string, action: "pickup" | "delivery") => void;
  action: "pickup" | "delivery";
  driverId?: number;
}

export default function BarcodeScanner({ onScanSuccess, action, driverId }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanMethod, setScanMethod] = useState<"camera" | "manual">("manual");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderNumber, status }: { orderNumber: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderNumber}/status`, {
        status,
        updatedBy: driverId ? `Driver ${driverId}` : "Driver",
        notes: `${action === "pickup" ? "Picked up" : "Delivered"} - Barcode scanned`
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `Order ${variables.orderNumber} ${action === "pickup" ? "picked up" : "delivered"} successfully`,
      });
      setLastScanned(variables.orderNumber);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      onScanSuccess?.(variables.orderNumber, action);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to update order status`,
        variant: "destructive",
      });
    },
  });

  // Start camera for scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setScanMethod("camera");
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Use manual input instead.",
        variant: "destructive",
      });
      setScanMethod("manual");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Process scanned/entered order number
  const processOrderNumber = (orderNumber: string) => {
    if (!orderNumber.trim()) return;
    
    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    
    // Validate order number format (ORD-YYYY-XXXXXX)
    if (!/^ORD-\d{4}-\d{6}$/.test(cleanOrderNumber)) {
      toast({
        title: "Invalid Format",
        description: "Order number should be in format: ORD-YYYY-XXXXXX",
        variant: "destructive",
      });
      return;
    }

    // Update order status based on action
    const newStatus = action === "pickup" ? "picked_up" : "delivered";
    updateOrderMutation.mutate({ orderNumber: cleanOrderNumber, status: newStatus });
  };

  // Handle manual input submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processOrderNumber(manualInput);
    setManualInput("");
  };

  // Simulate barcode detection (in real implementation, you'd use a barcode scanning library)
  useEffect(() => {
    if (isScanning && scanMethod === "camera") {
      // This would be replaced with actual barcode scanning logic
      // For demo purposes, we'll show instructions
      const interval = setInterval(() => {
        // In a real implementation, this would process video frames for barcodes
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isScanning, scanMethod]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const actionTitle = action === "pickup" ? "Pickup Scan" : "Delivery Scan";
  const actionColor = action === "pickup" ? "bg-blue-500" : "bg-green-500";

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          {actionTitle}
          <Badge className={`${actionColor} text-white ml-auto`}>
            {action.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Method Selection */}
        <div className="flex gap-2">
          <Button
            variant={scanMethod === "camera" ? "default" : "outline"}
            size="sm"
            onClick={() => setScanMethod("camera")}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-1" />
            Camera
          </Button>
          <Button
            variant={scanMethod === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setScanMethod("manual")}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 mr-1" />
            Manual
          </Button>
        </div>

        {/* Camera Scanning */}
        {scanMethod === "camera" && (
          <div className="space-y-3">
            {!isScanning ? (
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 bg-black rounded-lg"
                />
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Position barcode in the camera view
                  </p>
                  <Button onClick={stopCamera} variant="outline">
                    Stop Camera
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Input */}
        {scanMethod === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Order Number:</label>
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="ORD-2025-123456"
                className="mt-1"
                disabled={updateOrderMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={!manualInput.trim() || updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  {action === "pickup" ? "Confirm Pickup" : "Confirm Delivery"}
                </>
              )}
            </Button>
          </form>
        )}

        {/* Last Scanned */}
        {lastScanned && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Last Scanned:</p>
              <p className="text-sm text-green-700">{lastScanned}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium">Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Scan the barcode on the shipping label</li>
            <li>Or manually enter the order number</li>
            <li>This will automatically update the order status</li>
            <li>Ensure you scan at the correct location</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}