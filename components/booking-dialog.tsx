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

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  propertyId: string;
  hostId: string;
  userProfile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  onBookingSubmitted?: () => void;
}

export function BookingDialog({
  isOpen,
  onClose,
  conversationId,
  propertyId,
  hostId,
  userProfile,
  onBookingSubmitted,
}: BookingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moveInDate, setMoveInDate] = useState("");
  const [duration, setDuration] = useState("1");
  const [name, setName] = useState(userProfile?.full_name || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");

  // Only show dialog if user is not the host
  if (!user || user.id === hostId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to book a property",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          conversation_id: conversationId,
          property_id: propertyId,
          host_id: hostId,
          tenant_id: user.id,
          move_in_date: moveInDate,
          duration_months: parseInt(duration),
          tenant_name: name,
          tenant_phone: phone,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Send message to the host
      const { error: hostMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `Booking request for ${format(
            new Date(moveInDate),
            "MMMM d, yyyy"
          )} for ${duration} months.`,
          metadata: {
            booking_id: booking.id,
            type: "booking_requested",
            is_host: true,
          },
        });

      if (hostMessageError) throw hostMessageError;

      // Send confirmation message to the tenant
      const { error: tenantMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `Booking request sent for ${format(
            new Date(moveInDate),
            "MMMM d, yyyy"
          )} for ${duration} months. Waiting for host approval.`,
          metadata: {
            booking_id: booking.id,
            type: "booking_requested",
            is_requester: true,
          },
        });

      if (tenantMessageError) throw tenantMessageError;

      toast({
        title: "Success",
        description: "Booking request sent successfully",
      });
      onClose();
      if (onBookingSubmitted) {
        onBookingSubmitted();
      }
    } catch (error: any) {
      console.error("Error handling booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moveInDate">Move-in Date</Label>
            <Input
              id="moveInDate"
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">Submit Booking</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
