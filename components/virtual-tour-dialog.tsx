import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface VirtualTourDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  propertyId: string;
  hostId: string;
  isHost: boolean;
  onTourScheduled?: () => void;
}

export function VirtualTourDialog({
  isOpen,
  onClose,
  conversationId,
  propertyId,
  hostId,
  isHost,
  onTourScheduled,
}: VirtualTourDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to schedule a tour",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create virtual tour request
      const { data: virtualTour, error: tourError } = await supabase
        .from("virtual_tours")
        .insert({
          conversation_id: conversationId,
          property_id: propertyId,
          host_id: hostId,
          scheduled_time: scheduledTime,
          status: "pending",
        })
        .select()
        .single();

      if (tourError) throw tourError;

      // Format time in Nepal timezone
      const formattedTime = new Date(scheduledTime).toLocaleString("en-US", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      // Send system message about the virtual tour request
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `Virtual tour requested for ${formattedTime}`,
        metadata: {
          tour_id: virtualTour.id,
          scheduled_time: scheduledTime,
          type: "tour_requested",
          is_host: true,
          is_requester: false,
        },
      });

      if (messageError) throw messageError;

      // Send confirmation message to the requester
      const { error: requesterMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `Virtual tour request sent for ${formattedTime}. Waiting for host approval.`,
          metadata: {
            tour_id: virtualTour.id,
            scheduled_time: scheduledTime,
            type: "tour_requested",
            is_host: false,
            is_requester: true,
          },
        });

      if (requesterMessageError) throw requesterMessageError;

      toast({
        title: "Success",
        description: "Virtual tour request sent successfully",
      });

      // Close dialog and redirect to chat
      onClose();
      onTourScheduled?.();
      router.push(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      console.error("Error scheduling virtual tour:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule virtual tour",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Virtual Tour</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">Preferred Date and Time</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Tour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
