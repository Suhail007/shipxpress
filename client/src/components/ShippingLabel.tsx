import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download } from "lucide-react";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Order } from "@shared/schema";

interface ShippingLabelProps {
  order: Order;
  onClose?: () => void;
}

export default function ShippingLabel({ order, onClose }: ShippingLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  // Generate barcode for tracking number
  const generateBarcode = (trackingNumber: string) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, trackingNumber, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      textMargin: 8,
    });
    return canvas.toDataURL();
  };

  // Print label
  const handlePrint = () => {
    if (labelRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Shipping Label - ${order.orderNumber}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .label { width: 4in; height: 6in; border: 2px solid #000; padding: 10px; }
                @media print {
                  body { margin: 0; padding: 0; }
                  .label { border: none; }
                }
              </style>
            </head>
            <body>
              ${labelRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Download as PDF
  const handleDownload = async () => {
    if (labelRef.current) {
      const canvas = await html2canvas(labelRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "white",
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [4, 6], // Standard shipping label size
      });
      
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 4, 6);
      pdf.save(`shipping-label-${order.orderNumber}.pdf`);
    }
  };

  const barcodeDataURL = generateBarcode(order.orderNumber);
  const packages = Array.isArray(order.packages) ? order.packages : [];
  const totalWeight = packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);

  return (
    <div className="max-w-md mx-auto">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Print Label
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
        )}
      </div>

      {/* Shipping Label */}
      <Card className="border-2 border-black">
        <CardContent ref={labelRef} className="p-4 w-96 h-[576px] bg-white text-black">
          {/* Header */}
          <div className="border-b-2 border-black pb-2 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">ShipExpress</h1>
                <p className="text-xs">Express Delivery</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">Order: {order.orderNumber}</p>
                <p>Packages: {packages.length}</p>
                <p>Weight: {totalWeight} lbs</p>
              </div>
            </div>
          </div>

          {/* From Address (Small) */}
          <div className="mb-3">
            <p className="text-xs font-bold mb-1">FROM:</p>
            <div className="text-xs leading-tight">
              <p>ShipExpress Logistics Center</p>
              <p>1234 Warehouse Blvd</p>
              <p>Distribution City, CA 90210</p>
              <p>Phone: (555) 123-4567</p>
            </div>
          </div>

          {/* To Address (Large) */}
          <div className="mb-4 border border-black p-2">
            <p className="text-sm font-bold mb-2">DELIVER TO:</p>
            <div className="text-lg leading-tight">
              <p className="font-bold">{order.customerName || "Customer"}</p>
              <p className="font-bold">{order.customerPhone || ""}</p>
              <div className="mt-2">
                <p>{order.deliveryLine1}</p>
                {order.deliveryLine2 && <p>{order.deliveryLine2}</p>}
                <p>{order.deliveryCity}, {order.deliveryState} {order.deliveryZip}</p>
              </div>
            </div>
          </div>

          {/* Barcode Section (Large) */}
          <div className="text-center mb-4 border border-black p-2">
            <p className="text-xs font-bold mb-1">TRACKING NUMBER</p>
            <img 
              src={barcodeDataURL} 
              alt="Tracking Barcode" 
              className="mx-auto mb-1"
              style={{ maxWidth: "300px" }}
            />
            <p className="text-lg font-bold tracking-wider">{order.orderNumber}</p>
          </div>

          {/* Package Details */}
          <div className="text-xs border-t border-black pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p><strong>Service:</strong> Standard</p>
                <p><strong>Date:</strong> {new Date(order.pickupDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>Status:</strong> {order.status.toUpperCase()}</p>
                <p><strong>Priority:</strong> Normal</p>
              </div>
            </div>
            
            {packages.length > 0 && (
              <div className="mt-2">
                <p className="font-bold">Package Details:</p>
                {packages.map((pkg, index) => (
                  <p key={index} className="text-xs">
                    #{index + 1}: {pkg.length}"×{pkg.width}"×{pkg.height}" - {pkg.weight}lbs
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs mt-2 border-t border-black pt-1">
            <p className="font-bold">Special Instructions:</p>
            <p>{order.specialInstructions || "Handle with care. Signature required."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}