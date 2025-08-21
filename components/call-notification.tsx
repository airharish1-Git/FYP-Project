"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Check,
  X,
  Clock,
  User,
  Video,
} from "lucide-react";

interface CallNotificationProps {
  type:
    | "incoming"
    | "outgoing"
    | "connected"
    | "ended"
    | "missed"
    | "connecting";
  callerName?: string;
  isHost?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  duration?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function CallNotification({
  type,
  callerName = "Unknown",
  isHost = false,
  onAccept,
  onReject,
  onEnd,
  duration = 0,
  autoHide = false,
  autoHideDelay = 5000,
}: CallNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && type !== "incoming") {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, type]);

  if (!isVisible) return null;

  const getNotificationConfig = () => {
    switch (type) {
      case "incoming":
        return {
          icon: <PhoneIncoming className="h-5 w-5" />,
          title: "Incoming Call",
          subtitle: `${callerName} is calling you`,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/50",
          borderColor: "border-green-200 dark:border-green-800",
          accentColor: "bg-green-500",
        };
      case "outgoing":
        return {
          icon: <PhoneOutgoing className="h-5 w-5" />,
          title: "Calling...",
          subtitle: `Calling ${callerName}`,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/50",
          borderColor: "border-blue-200 dark:border-blue-800",
          accentColor: "bg-blue-500",
        };
      case "connecting":
        return {
          icon: <Clock className="h-5 w-5" />,
          title: "Connecting...",
          subtitle: "Establishing connection",
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          accentColor: "bg-yellow-500",
        };
      case "connected":
        return {
          icon: <Phone className="h-5 w-5" />,
          title: "Call Connected",
          subtitle: `Connected with ${callerName}`,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/50",
          borderColor: "border-green-200 dark:border-green-800",
          accentColor: "bg-green-500",
        };
      case "ended":
        return {
          icon: <PhoneOff className="h-5 w-5" />,
          title: "Call Ended",
          subtitle: `Call ended after ${formatDuration(duration)}`,
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950/50",
          borderColor: "border-gray-200 dark:border-gray-800",
          accentColor: "bg-gray-500",
        };
      case "missed":
        return {
          icon: <PhoneMissed className="h-5 w-5" />,
          title: "Missed Call",
          subtitle: `Missed call from ${callerName}`,
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/50",
          borderColor: "border-red-200 dark:border-red-800",
          accentColor: "bg-red-500",
        };
      default:
        return {
          icon: <Phone className="h-5 w-5" />,
          title: "Call",
          subtitle: "Call notification",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950/50",
          borderColor: "border-gray-200 dark:border-gray-800",
          accentColor: "bg-gray-500",
        };
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const config = getNotificationConfig();

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${config.bgColor} ${config.borderColor} shadow-lg hover:shadow-xl transition-all duration-200`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-full ${config.accentColor}/20`}>
        <div className={config.color}>{config.icon}</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold text-sm ${config.color}`}>
            {config.title}
          </h3>
          <Badge
            variant="outline"
            className="text-xs bg-white/90 dark:bg-gray-800/90 text-foreground dark:text-foreground border-foreground/20 dark:border-foreground/20"
          >
            {isHost ? "Host" : "Guest"}
          </Badge>
        </div>
        <p className="text-sm text-foreground dark:text-foreground truncate">
          {config.subtitle}
        </p>
        {type === "connected" && duration > 0 && (
          <p className="text-xs text-foreground/70 dark:text-foreground/70 mt-1">
            Duration: {formatDuration(duration)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {type === "incoming" && (
          <>
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0 rounded-full"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onReject}
              className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {type === "connected" && (
          <Button
            size="sm"
            onClick={onEnd}
            className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 rounded-full"
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            End
          </Button>
        )}

        {type === "outgoing" && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Ringing...</span>
          </div>
        )}

        {type === "connecting" && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-muted-foreground">Connecting...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Call status indicator for messages
export function CallStatusIndicator({
  status,
  isIncoming = false,
  callerName,
  onAccept,
  onReject,
}: {
  status: string;
  isIncoming?: boolean;
  callerName?: string;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case "calling":
        return {
          icon: <PhoneOutgoing className="h-4 w-4" />,
          text: "Calling...",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/50",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "incoming":
        return {
          icon: <PhoneIncoming className="h-4 w-4" />,
          text: "Incoming Call",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/50",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "connected":
        return {
          icon: <Phone className="h-4 w-4" />,
          text: "Call Connected",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/50",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "ended":
        return {
          icon: <PhoneOff className="h-4 w-4" />,
          text: "Call Ended",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950/50",
          borderColor: "border-gray-200 dark:border-gray-800",
        };
      case "missed":
        return {
          icon: <PhoneMissed className="h-4 w-4" />,
          text: "Missed Call",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/50",
          borderColor: "border-red-200 dark:border-red-800",
        };
      case "declined":
        return {
          icon: <PhoneOff className="h-4 w-4" />,
          text: "Call Declined",
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950/50",
          borderColor: "border-orange-200 dark:border-orange-800",
        };
      default:
        return {
          icon: <Phone className="h-4 w-4" />,
          text: "Call",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950/50",
          borderColor: "border-gray-200 dark:border-gray-800",
        };
    }
  };

  const config = getStatusConfig();

  if (isIncoming && onAccept && onReject) {
    return (
      <div
        className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} hover:shadow-md transition-all duration-200`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`${config.color}`}>{config.icon}</div>
          <div>
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
            {callerName && (
              <p className="text-xs text-foreground dark:text-foreground">
                From {callerName}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          <Button
            size="sm"
            onClick={onReject}
            className="bg-red-600 hover:bg-red-700 text-white flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${config.bgColor} ${config.borderColor} hover:shadow-md transition-all duration-200`}
    >
      <div className={`${config.color}`}>{config.icon}</div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}
