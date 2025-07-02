import { useState, useEffect } from "react";
import { Clock, Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BatchCountdownProps {
  onBatchDeadlineChange?: (isAfterDeadline: boolean) => void;
}

export default function BatchCountdown({ onBatchDeadlineChange }: BatchCountdownProps) {
  const [timeUntilCutoff, setTimeUntilCutoff] = useState("");
  const [isAfterCutoff, setIsAfterCutoff] = useState(false);
  const [currentBatchDate, setCurrentBatchDate] = useState("");
  const [nextBatchDate, setNextBatchDate] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const cutoffTime = new Date();
      cutoffTime.setHours(14, 30, 0, 0); // 2:30 PM

      // If we're past 2:30 PM today, set cutoff for tomorrow
      if (now > cutoffTime) {
        cutoffTime.setDate(cutoffTime.getDate() + 1);
        setIsAfterCutoff(true);
        setCurrentBatchDate(formatDate(getTomorrow()));
        setNextBatchDate(formatDate(getDayAfterTomorrow()));
      } else {
        setIsAfterCutoff(false);
        setCurrentBatchDate(formatDate(now));
        setNextBatchDate(formatDate(getTomorrow()));
      }

      const diff = cutoffTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilCutoff(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      // Notify parent component about batch deadline status
      if (onBatchDeadlineChange) {
        onBatchDeadlineChange(isAfterCutoff);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isAfterCutoff, onBatchDeadlineChange]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const getDayAfterTomorrow = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter;
  };

  return (
    <Card className="bg-gradient-to-r from-primary-50 to-orange-50 border-primary-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Package className="h-5 w-5 mr-2 text-primary-600" />
          Route Batch Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Next Cutoff:</span>
          </div>
          <Badge variant={isAfterCutoff ? "destructive" : "default"} className="text-base font-mono">
            {timeUntilCutoff}
          </Badge>
        </div>

        {isAfterCutoff ? (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">After 2:30 PM Cutoff</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              New orders will be added to tomorrow's batch ({nextBatchDate})
            </p>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-green-800">
              <Package className="h-4 w-4" />
              <span className="font-medium">Current Batch Active</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Orders will be included in today's batch ({currentBatchDate})
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          <p>• Batches are processed daily at 2:30 PM</p>
          <p>• Orders after cutoff go to next day's batch</p>
          <p>• Route optimization happens automatically</p>
        </div>
      </CardContent>
    </Card>
  );
}