"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { use } from "react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video,
  Send,
  Loader2,
  Home,
  Calendar,
  Check,
  Phone,
  Clock,
  X,
  PhoneOff,
  Info,
  ArrowLeft,
  MessageCircle,
  User,
  Building2,
  Bell,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { setupRealtimeSubscription } from "@/lib/supabase/realtime";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Database } from "@/types/supabase";
import { VirtualTourDialog } from "@/components/virtual-tour-dialog";
import {
  VideoCallWrapper,
  useVideoCallManager,
} from "@/components/video-call-manager";
import { BookingDialog } from "@/components/booking-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CallNotification,
  CallStatusIndicator,
} from "@/components/call-notification";

type MessageWithSender = Database["public"]["Tables"]["messages"]["Row"] & {
  sender?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
  conversation?: {
    property: {
      title: string;
      images: string[];
      host_id: string;
    };
  };
  metadata?: {
    tour_id?: string;
    scheduled_time?: string;
    is_host?: boolean;
    type?:
      | "tour_requested"
      | "tour_approved"
      | "tour_started"
      | "call_initiated"
      | "call_accepted"
      | "call_rejected"
      | "call_ended"
      | "call_missed"
      | "booking_requested"
      | "booking_approved"
      | "booking_rejected"
      | "tour_response"
      | "booking_response";
    is_requester?: boolean;
    booking_id?: string;
    message_type?: string;
    status?: "approved" | "rejected";
  };
};

type Conversation = {
  id: string;
  property_id: string;
  property: {
    id: string;
    title: string;
    images: string[];
    host_id: string;
    status?: string;
    sold_to?: string;
  };
  participants: Database["public"]["Tables"]["profiles"]["Row"][];
  other_participant: Database["public"]["Tables"]["profiles"]["Row"];
  last_message: MessageWithSender | null;
  updated_at: string;
  unreadCount: number;
};

type ConversationData = Database["public"]["Tables"]["conversations"]["Row"] & {
  property: {
    id: string;
    title: string;
    images: string[];
    host_id: string;
  };
  participant1: Database["public"]["Tables"]["profiles"]["Row"];
  participant2: Database["public"]["Tables"]["profiles"]["Row"];
  messages: MessageWithSender[];
};

type MessagePayload = {
  new: MessageWithSender;
  old: MessageWithSender;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export default function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { endCall: endVideoCall } = useVideoCallManager();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  // Filter out duplicate and obsolete call messages
  const filteredMessages = useMemo(() => {
    const seenTourIds = new Set();
    const seenCallStatuses = new Map(); // tourId -> latest status

    return messages.filter((message) => {
      const tourId = message.metadata?.tour_id;
      const messageType = message.metadata?.type;

      // If it's not a call-related message, keep it
      if (
        !tourId ||
        !messageType ||
        ![
          "call_initiated",
          "call_accepted",
          "call_rejected",
          "call_ended",
        ].includes(messageType)
      ) {
        return true;
      }

      // Track the latest status for each tour
      if (
        !seenCallStatuses.has(tourId) ||
        message.created_at > seenCallStatuses.get(tourId).created_at
      ) {
        seenCallStatuses.set(tourId, {
          type: messageType,
          created_at: message.created_at,
        });
      }

      // Only keep the latest status message for each tour
      const latestStatus = seenCallStatuses.get(tourId);
      if (
        latestStatus.type === messageType &&
        latestStatus.created_at === message.created_at
      ) {
        return true;
      }

      return false;
    });
  }, [messages]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Find the chat scroll area container
      const chatScrollArea = messagesEndRef.current.closest(
        "[data-radix-scroll-area-viewport]"
      );
      if (chatScrollArea) {
        chatScrollArea.scrollTo({
          top: chatScrollArea.scrollHeight,
          behavior: "smooth",
        });
      } else {
        // Fallback to the original method
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);
  const [isVirtualTourDialogOpen, setIsVirtualTourDialogOpen] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [activeCallTourId, setActiveCallTourId] = useState<string | null>(null);
  const [isCallInitiating, setIsCallInitiating] = useState(false);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [incomingCallTimeouts, setIncomingCallTimeouts] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const [missedCalls, setMissedCalls] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const resolvedSearchParams = use(searchParams);
  const conversationId = resolvedSearchParams.conversation || null;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<{
    tourId: string;
    scheduledTime: string;
  } | null>(null);

  const { register, handleSubmit, reset } = useForm<{ message: string }>();

  // Force reset call states when they should be false
  useEffect(() => {
    if (!isInCall && !isCallInitiating && activeCallTourId) {
      console.log(
        "Force resetting call states - activeCallTourId should be null"
      );
      setActiveCallTourId(null);
    }
  }, [isInCall, isCallInitiating, activeCallTourId]);

  // Reset call states when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setIsInCall(false);
      setIsCallInitiating(false);
      setIsCallInitiator(false);
      setActiveCallTourId(null);
    }
  }, [selectedConversation?.id]);

  // Force reset call states on component mount and when user changes
  useEffect(() => {
    setIsInCall(false);
    setIsCallInitiating(false);
    setIsCallInitiator(false);
    setActiveCallTourId(null);
  }, [user?.id]);

  // Reset call states periodically to prevent stuck states
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isInCall && !isCallInitiating && activeCallTourId) {
        console.log("Periodic reset of stuck call states");
        setActiveCallTourId(null);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isInCall, isCallInitiating, activeCallTourId]);

  // Cleanup timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      incomingCallTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Separate effect to clear timeouts when conversation changes
  useEffect(() => {
    if (selectedConversation?.id) {
      // Clear all pending timeouts when conversation changes
      incomingCallTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      setIncomingCallTimeouts(new Map());
      setMissedCalls(new Set());
    }
  }, [selectedConversation?.id]);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log("Call state changed:", {
      isInCall,
      isCallInitiating,
      activeCallTourId,
      messagesLength: messages.length,
    });
  }, [isInCall, isCallInitiating, activeCallTourId, messages.length]);

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setLoading(true);
    await fetchMessages(conversation.id);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user?.id) return;

    setLoadingMessages(true);
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(messages as MessageWithSender[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchConversations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          property:properties (
            id,
            title,
            images,
            host_id
          ),
          participant1:profiles!conversations_participant1_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          ),
          participant2:profiles!conversations_participant2_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          ),
          messages:messages (
            id,
            content,
            created_at,
            sender_id
          )
        `
        )
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedConversations = conversations.map(
        (conv: ConversationData) => {
          const otherParticipant =
            conv.participant1.id === user.id
              ? conv.participant2
              : conv.participant1;

          const lastMessage = conv.messages?.[conv.messages.length - 1];
          const unreadCount =
            conv.messages?.filter(
              (msg: MessageWithSender) => msg.sender_id !== user.id
            ).length || 0;

          return {
            id: conv.id,
            property_id: conv.property_id,
            property: conv.property,
            participants: [conv.participant1, conv.participant2],
            other_participant: otherParticipant,
            last_message: lastMessage || null,
            updated_at: conv.updated_at,
            unreadCount,
          };
        }
      );

      setConversations(formattedConversations);
      setRetryCount(0);

      // Set selected conversation if conversationId is in URL
      if (conversationId) {
        const conversation = formattedConversations.find(
          (c: Conversation) => c.id === conversationId
        );
        if (conversation) {
          setSelectedConversation(conversation);
          fetchMessages(conversation.id);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        setTimeout(fetchConversations, 1000 * (retryCount + 1));
      } else {
        toast({
          title: "Error",
          description:
            "Failed to load conversations. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversations when user is present
  useEffect(() => {
    let mounted = true;
    fetchConversations();

    // Set up real-time subscription for conversations
    const conversationsChannel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `participant1_id=eq.${user?.id},participant2_id=eq.${user?.id}`,
        },
        async (payload) => {
          if (!mounted) return;

          if (payload.eventType === "DELETE") {
            setConversations((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          } else {
            // For INSERT or UPDATE, fetch the updated conversation
            const { data: updatedConv, error } = await supabase
              .from("conversations")
              .select(
                `
                *,
                property:properties (
                  id,
                  title,
                  images,
                  host_id
                ),
                participant1:profiles!conversations_participant1_id_fkey (
                  id,
                  email,
                  full_name,
                  avatar_url
                ),
                participant2:profiles!conversations_participant2_id_fkey (
                  id,
                  email,
                  full_name,
                  avatar_url
                ),
                messages:messages (
                  id,
                  content,
                  created_at,
                  sender_id
                )
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error("Error fetching updated conversation:", error);
              return;
            }

            if (!mounted) return;

            const otherParticipant =
              updatedConv.participant1.id === user?.id
                ? updatedConv.participant2
                : updatedConv.participant1;

            const lastMessage =
              updatedConv.messages?.[updatedConv.messages.length - 1];

            const unreadCount =
              updatedConv.messages?.filter(
                (msg: MessageWithSender) => msg.sender_id !== user?.id
              ).length || 0;

            const formattedConversation = {
              id: updatedConv.id,
              property_id: updatedConv.property_id,
              property: updatedConv.property,
              participants: [
                updatedConv.participant1,
                updatedConv.participant2,
              ],
              other_participant: otherParticipant,
              last_message: lastMessage || null,
              updated_at: updatedConv.updated_at,
              unreadCount,
            };

            setConversations((prev) => {
              const filtered = prev.filter((c) => c.id !== updatedConv.id);
              return [formattedConversation, ...filtered];
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(conversationsChannel);
    };
  }, [user?.id]);

  // Set up real-time messaging
  useEffect(() => {
    if (!selectedConversation?.id || !user?.id) {
      setIsSubscribed(false);
      return;
    }

    let mounted = true;

    const channel = supabase
      .channel(`conversation:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          if (!mounted) return;

          const newMessage = payload.new as MessageWithSender;

          // Fetch sender details if not included
          if (!newMessage.sender) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("id, email, full_name, avatar_url")
              .eq("id", newMessage.sender_id)
              .single();

            if (sender) {
              newMessage.sender = sender;
            }
          }

          setMessages((prev) => [...prev, newMessage]);

          // Update the conversation's last message
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === selectedConversation.id
                ? {
                    ...conv,
                    last_message: newMessage,
                    updated_at: newMessage.created_at,
                  }
                : conv
            )
          );

          // If a call_ended message is received, end the call UI for both users
          if (newMessage.metadata?.type === "call_ended") {
            setIsInCall(false);
            setActiveCallTourId(null);
          }

          // Always scroll to bottom after new message
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    setIsSubscribed(true);

    return () => {
      mounted = false;
      setIsSubscribed(false);
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, user?.id]);

  const onSubmit = async (data: { message: string }) => {
    if (!selectedConversation || !user || !data.message.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: data.message.trim(),
      });

      if (error) throw error;

      // Reset form
      reset();

      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const scheduleVirtualTour = () => {
    console.log("Schedule tour clicked");
    console.log("Selected conversation:", selectedConversation);
    console.log("Property:", selectedConversation?.property);
    console.log("Host ID:", selectedConversation?.property?.host_id);
    console.log("Property ID:", selectedConversation?.property_id);

    if (!selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a conversation first",
        variant: "destructive",
      });
      return;
    }

    setIsVirtualTourDialogOpen(true);
  };

  const handleTourScheduled = () => {
    // Refresh messages to show the new tour message
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
    setIsVirtualTourDialogOpen(false);
  };

  // Add timezone conversion helper
  const convertToNepalTime = (date: Date) => {
    return new Date(
      date.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
    );
  };

  const formatTourTime = (date: Date) => {
    const nepalTime = convertToNepalTime(date);
    return format(nepalTime, "MMMM d, yyyy 'at' h:mm a");
  };

  const formatInNepalTime = (date: Date | string) => {
    // Convert string to Date if needed
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Format in Nepal timezone
    return new Date(dateObj).toLocaleString("en-US", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Update the isWithinTourTimeframe function to use consistent timezone handling
  const isWithinTourTimeframe = (scheduledTime: string) => {
    const now = new Date();
    const tourTime = new Date(scheduledTime);
    const timeWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

    // Convert both times to Nepal timezone for comparison
    const nowNepal = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
    );
    const tourTimeNepal = new Date(
      tourTime.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
    );

    return Math.abs(nowNepal.getTime() - tourTimeNepal.getTime()) <= timeWindow;
  };

  // Add this effect to handle tour approval
  useEffect(() => {
    if (!selectedConversation?.id || !user) return;

    const channel = supabase
      .channel(`virtual_tours:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "virtual_tours",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload: any) => {
          const tour = payload.new;
          if (tour.status === "approved") {
            setActiveTour({
              tourId: tour.id,
              scheduledTime: tour.scheduled_time,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConversation?.id, user]);

  // Update the handleSchedule function to use Nepal time
  const handleSchedule = async (tourId: string) => {
    if (!selectedConversation || !tourId) return;

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the tour request message to get the original scheduled time
      const tourRequest = messages.find(
        (m) =>
          m.metadata?.type === "tour_requested" &&
          m.metadata?.tour_id === tourId
      );

      if (!tourRequest?.metadata?.scheduled_time) {
        throw new Error("Tour request not found");
      }

      const scheduledTime = new Date(tourRequest.metadata.scheduled_time);
      const nepalTime = convertToNepalTime(scheduledTime);

      // Add response message
      const responseMessage = {
        content: `Virtual tour request approved. Please call the host at ${formatTourTime(
          nepalTime
        )}.`,
        metadata: {
          type: "tour_response",
          status: "approved",
          tour_id: tourId,
          scheduled_time: nepalTime.toISOString(),
        },
      };

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: responseMessage.content,
        metadata: responseMessage.metadata,
      });

      // Refresh messages
      fetchMessages(selectedConversation.id);

      toast({
        title: "Success",
        description: `Approved tour for ${formatTourTime(nepalTime)}.`,
      });
    } catch (error) {
      console.error("Error handling tour approval:", error);
      toast({
        title: "Error",
        description: "Failed to process tour request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = async (tourId: string) => {
    // Here you would typically integrate with a video calling service
    toast({
      title: "Joining call...",
      description: "Connecting to video call...",
    });
  };

  const handleStartCall = async (tourId: string) => {
    console.log("handleStartCall called with tourId:", tourId);

    if (!activeTour) {
      console.log("No active tour found");
      return;
    }

    // Check if this is a mock tour
    if (tourId.startsWith("mock-tour-")) {
      console.log("Mock tour detected, starting call simulation...");

      // Simulate call start
      setIsInCall(true);
      setActiveCallTourId(tourId);

      // Show success message
      toast({
        title: "Call Started",
        description: "Virtual tour call is now active",
      });

      console.log("Mock call started successfully");
      return;
    }

    // Original logic for real tours
    const scheduledTime = new Date(activeTour.scheduledTime);
    if (!isWithinTourTimeframe(activeTour.scheduledTime)) {
      toast({
        title: "Cannot start call",
        description:
          "You can only call within 15 minutes of the scheduled time",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the tour details to verify status
      const { data: tour, error: tourError } = await supabase
        .from("virtual_tours")
        .select("status, scheduled_time")
        .eq("id", tourId)
        .single();

      if (tourError) throw tourError;

      if (tour.status !== "approved") {
        toast({
          title: "Cannot start call",
          description: "This tour has not been approved yet",
          variant: "destructive",
        });
        return;
      }

      // Start the call
      const callUrl = `/call/${tourId}`;
      window.open(callUrl, "_blank");
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  };

  // Function to clear old incoming call messages
  const clearOldIncomingCallMessages = (tourId: string) => {
    setMessages((prevMessages) => {
      return prevMessages.filter(
        (message) =>
          !(
            message.metadata?.type === "call_initiated" &&
            message.metadata?.tour_id === tourId
          )
      );
    });
  };

  // Function to clear all old call messages (initiated, accepted, rejected, ended)
  const clearAllOldCallMessages = (tourId: string) => {
    setMessages((prevMessages) => {
      return prevMessages.filter(
        (message) =>
          !(
            (message.metadata?.type === "call_initiated" ||
              message.metadata?.type === "call_accepted" ||
              message.metadata?.type === "call_rejected" ||
              message.metadata?.type === "call_ended") &&
            message.metadata?.tour_id === tourId
          )
      );
    });
  };

  const handleAcceptCall = async (tourId: string) => {
    if (!selectedConversation || !tourId) return;

    console.log("handleAcceptCall called with tourId:", tourId);
    setLoading(true);

    try {
      // Clear any existing timeout for this call
      const existingTimeout = incomingCallTimeouts.get(tourId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        setIncomingCallTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(tourId);
          return newMap;
        });
      }

      // Clear old incoming call messages first
      clearOldIncomingCallMessages(tourId);

      // Start video call immediately (don't wait for database)
      console.log("Starting video call immediately...");
      setIsCallInitiating(true);
      setActiveCallTourId(tourId);

      // The person accepting the call should NOT be the initiator
      // They will receive the offer from the person who initiated the call
      console.log("Setting call initiator to FALSE for call acceptance");
      setIsCallInitiator(false);

      // Set isInCall to true immediately for the person accepting the call
      // This ensures the video call window appears for them
      console.log("Setting isInCall to TRUE for call acceptance");
      setIsInCall(true);

      // Add mock call accepted message to UI
      console.log("Adding mock call accepted message to UI...");
      const mockAcceptedMessage: MessageWithSender = {
        id: `mock-accepted-${Date.now()}`,
        conversation_id: selectedConversation?.id || "",
        sender_id: user?.id || "",
        content: "Call accepted",
        created_at: new Date().toISOString(),
        metadata: {
          tour_id: tourId,
          type: "call_accepted",
          message_type: "call_accepted",
        },
        sender: {
          id: user?.id || "",
          email: user?.email || "",
          full_name: userProfile?.full_name || "",
          avatar_url: userProfile?.avatar_url,
        },
      };

      setMessages((prevMessages) => [...prevMessages, mockAcceptedMessage]);
      console.log("Mock call accepted message added to UI");

      // Try to send the message to database in background (non-blocking)
      console.log(
        "Sending call accepted message to database (non-blocking)..."
      );
      supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation?.id,
          sender_id: user?.id,
          content: "Call accepted",
          metadata: {
            tour_id: tourId,
            type: "call_accepted",
            message_type: "call_accepted",
          },
        })
        .then(({ error }) => {
          if (error) {
            console.error(
              "Error sending call accepted message to database:",
              error
            );
          } else {
            console.log("Call accepted message sent to database successfully");
          }
        })
        .catch((error) => {
          console.error(
            "Exception sending call accepted message to database:",
            error
          );
        });

      console.log("Call accepted successfully!");
      toast({
        title: "Call Accepted",
        description: "Video call is now active",
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      toast({
        title: "Error",
        description: "Failed to accept call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add effect to handle call acceptance
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload: any) => {
          const message = payload.new;

          // If this is a call accepted message and we're the host who initiated the call
          if (
            message.metadata?.type === "call_accepted" &&
            selectedConversation.property?.host_id === user?.id &&
            message.sender_id !== user?.id
          ) {
            console.log("Host received call acceptance, opening video call");
            setIsInCall(true);
            setActiveCallTourId(message.metadata.tour_id);
          }

          // If this is a call initiated message and we're the recipient, set up timeout
          if (
            message.metadata?.type === "call_initiated" &&
            message.sender_id !== user?.id &&
            !isInCall &&
            !isCallInitiating
          ) {
            const tourId = message.metadata.tour_id;
            if (
              tourId &&
              !incomingCallTimeouts.has(tourId) &&
              !missedCalls.has(tourId)
            ) {
              console.log(
                "Setting up 10-second timeout for incoming call:",
                tourId
              );

              // Set a timeout for 10 seconds
              const timeout = setTimeout(async () => {
                console.log("Receiver timeout triggered for tourId:", tourId);

                // Check if call is still pending and we haven't handled it yet
                if (
                  !isInCall &&
                  !isCallInitiating &&
                  activeCallTourId !== tourId &&
                  !missedCalls.has(tourId)
                ) {
                  console.log(
                    "Processing receiver timeout for tourId:",
                    tourId
                  );
                  await handleIncomingCallTimeout(tourId);
                }
              }, 10000); // 10 seconds

              // Store timeout in both state and ref for reliable tracking
              setIncomingCallTimeouts((prev) => {
                const newMap = new Map(prev);
                newMap.set(tourId, timeout);
                return newMap;
              });
              timeoutRefs.current.set(tourId, timeout);
            }
          }

          // If this is a call accepted/rejected/ended message, clear any pending timeouts
          if (
            (message.metadata?.type === "call_accepted" ||
              message.metadata?.type === "call_rejected" ||
              message.metadata?.type === "call_ended" ||
              message.metadata?.type === "call_missed") &&
            message.metadata?.tour_id
          ) {
            const tourId = message.metadata.tour_id;
            const existingTimeout = incomingCallTimeouts.get(tourId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              setIncomingCallTimeouts((prev) => {
                const newMap = new Map(prev);
                newMap.delete(tourId);
                return newMap;
              });
            }

            // If call was rejected, reset call states for both parties
            if (message.metadata?.type === "call_rejected") {
              console.log(
                "Call rejected, resetting states for tourId:",
                tourId
              );

              // IMMEDIATELY reset all call states
              setIsInCall(false);
              setIsCallInitiating(false);
              setIsCallInitiator(false);
              setActiveCallTourId(null);

              // Clear any pending timeouts for this tour
              const existingTimeout = incomingCallTimeouts.get(tourId);
              if (existingTimeout) {
                clearTimeout(existingTimeout);
                setIncomingCallTimeouts((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(tourId);
                  return newMap;
                });
              }

              // Show toast notification for the caller
              if (message.sender_id !== user?.id) {
                toast({
                  title: "Call Declined",
                  description: "The call was declined by the other party",
                });
              }
            }

            // If call was ended, reset call states for both parties and reload page
            if (message.metadata?.type === "call_ended") {
              console.log("Call ended, resetting states for tourId:", tourId);

              // IMMEDIATELY reset all call states
              setIsInCall(false);
              setIsCallInitiating(false);
              setIsCallInitiator(false);
              setActiveCallTourId(null);

              // Clear any pending timeouts for this tour
              const existingTimeout = incomingCallTimeouts.get(tourId);
              if (existingTimeout) {
                clearTimeout(existingTimeout);
                setIncomingCallTimeouts((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(tourId);
                  return newMap;
                });
              }

              // Show toast notification for the other party
              if (message.sender_id !== user?.id) {
                toast({
                  title: "Call Ended",
                  description: "The call was ended by the other party",
                });
              }

              // Reload the page for both parties
              window.location.reload();
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConversation?.id, user?.id]);

  const handleEndCall = async () => {
    if (!activeCallTourId) return;

    try {
      console.log("Ending call for tourId:", activeCallTourId);

      // Clear any existing timeout for this call
      const existingTimeout = incomingCallTimeouts.get(activeCallTourId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        setIncomingCallTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(activeCallTourId);
          return newMap;
        });
      }

      // Clear all old call messages first
      clearAllOldCallMessages(activeCallTourId);

      // Reset all call-related states IMMEDIATELY before anything else
      setIsInCall(false);
      setIsCallInitiating(false);
      setIsCallInitiator(false);
      setActiveCallTourId(null);

      // Send call ended message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation?.id,
        sender_id: user?.id,
        content: "Call ended",
        metadata: {
          tour_id: activeCallTourId,
          type: "call_ended",
          message_type: "call_ended",
        },
      });

      if (messageError) throw messageError;

      toast({
        title: "Call Ended",
        description: "The video call has been ended",
      });

      // Small delay to ensure message is sent, then reload the page
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error ending call:", error);
      toast({
        title: "Error",
        description: "Failed to end call",
        variant: "destructive",
      });
    }
  };

  const handleRejectCall = async (tourId: string | undefined) => {
    if (!tourId) return;

    try {
      console.log("Rejecting call for tourId:", tourId);

      // Clear any existing timeout for this call
      const existingTimeout = incomingCallTimeouts.get(tourId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        setIncomingCallTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(tourId);
          return newMap;
        });
      }

      // Clear old incoming call messages first
      clearOldIncomingCallMessages(tourId);

      // Reset call states IMMEDIATELY
      setIsInCall(false);
      setIsCallInitiating(false);
      setIsCallInitiator(false);
      setActiveCallTourId(null);

      // Send call rejected message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation?.id,
        sender_id: user?.id,
        content: "Call declined",
        metadata: {
          tour_id: tourId,
          type: "call_rejected",
          message_type: "call_rejected",
        },
      });

      if (messageError) throw messageError;

      toast({
        title: "Call Declined",
        description: "The call has been declined",
      });

      // Reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error("Error rejecting call:", error);
      toast({
        title: "Error",
        description: "Failed to reject call",
        variant: "destructive",
      });
    }
  };

  const handleIncomingCallTimeout = async (tourId: string) => {
    try {
      console.log("Handling incoming call timeout for tourId:", tourId);

      // Mark call as missed
      setMissedCalls((prev) => new Set(prev).add(tourId));

      // Send missed call message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation?.id,
        sender_id: user?.id,
        content: "Missed call",
        metadata: {
          tour_id: tourId,
          type: "call_missed",
          message_type: "call_missed",
        },
      });

      if (messageError) throw messageError;

      // Clear the timeout from state
      setIncomingCallTimeouts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(tourId);
        return newMap;
      });

      // Reset call states
      setIsInCall(false);
      setIsCallInitiating(false);
      setIsCallInitiator(false);
      setActiveCallTourId(null);

      toast({
        title: "Missed Call",
        description: "The incoming call was missed",
      });

      // Reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error("Error handling missed call:", error);
    }
  };

  const handleDirectCall = async () => {
    if (!user || !selectedConversation) {
      toast({
        title: "Error",
        description: "Unable to start call. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Force reset any stuck states before starting a new call
    if (activeCallTourId && !isInCall && !isCallInitiating) {
      console.log("Force resetting stuck call states before starting new call");
      setActiveCallTourId(null);
    }

    // Check if already in a call
    if (isInCall || isCallInitiating || activeCallTourId) {
      toast({
        title: "Call in Progress",
        description: "Please end the current call first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a unique tour ID for this call
      const tourId = `direct-call-${Date.now()}`;

      // Send call initiated message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: "Incoming call",
        metadata: {
          tour_id: tourId,
          type: "call_initiated",
          message_type: "call_initiated",
          is_host: selectedConversation.property?.host_id === user.id,
        },
      });

      if (messageError) {
        console.error("Error sending call message:", messageError);
        // Continue anyway - the call will still work
      }

      // Start the call immediately - this user is the initiator
      console.log("Setting call initiator to TRUE for direct call");
      setIsCallInitiator(true);
      setIsCallInitiating(true);
      setIsInCall(true); // Set isInCall to true for the host
      setActiveCallTourId(tourId);

      // Set up timeout for caller side (10 seconds)
      const callerTimeout = setTimeout(async () => {
        console.log("Caller timeout triggered for tourId:", tourId);

        // Check if call is still pending (no response received)
        if (isCallInitiating && activeCallTourId === tourId) {
          console.log("Caller timeout - no response received, ending call");

          // Send missed call message from caller perspective
          const { error: timeoutError } = await supabase
            .from("messages")
            .insert({
              conversation_id: selectedConversation.id,
              sender_id: user.id,
              content: "Call not answered",
              metadata: {
                tour_id: tourId,
                type: "call_missed",
                message_type: "call_missed",
              },
            });

          if (timeoutError) {
            console.error("Error sending timeout message:", timeoutError);
          }

          // Reset call states
          setIsInCall(false);
          setIsCallInitiating(false);
          setIsCallInitiator(false);
          setActiveCallTourId(null);

          toast({
            title: "Call Not Answered",
            description: "The call was not answered",
          });

          // Reload the page to ensure clean state
          window.location.reload();
        }
      }, 10000); // 10 seconds

      // Store the caller timeout
      setIncomingCallTimeouts((prev) => {
        const newMap = new Map(prev);
        newMap.set(tourId, callerTimeout);
        return newMap;
      });
      timeoutRefs.current.set(tourId, callerTimeout);

      toast({
        title: "Call Started",
        description: "Initiating video call...",
      });
    } catch (error) {
      console.error("Error starting direct call:", error);
      toast({
        title: "Error",
        description: "Failed to start call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBookingSubmitted = () => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
    setIsBookingDialogOpen(false);
  };

  const handleBookingApproval = async (
    bookingId: string,
    approved: boolean
  ) => {
    if (!selectedConversation) return;

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if a response message already exists
      const existingResponse = messages.some(
        (m) =>
          m.metadata?.type === "booking_response" &&
          m.metadata?.booking_id === bookingId
      );

      if (existingResponse) {
        toast({
          title: "Error",
          description: "This booking request has already been processed",
          variant: "destructive",
        });
        return;
      }

      // Update booking status
      const { error } = await supabase
        .from("bookings")
        .update({ status: approved ? "approved" : "rejected" })
        .eq("id", bookingId);

      if (error) throw error;

      // Add response message
      const responseMessage = {
        content: approved
          ? "Booking request approved"
          : "Booking request rejected",
        metadata: {
          type: "booking_response",
          status: approved ? "approved" : "rejected",
          booking_id: bookingId,
        },
      };

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: responseMessage.content,
        metadata: responseMessage.metadata,
      });

      // Update property status if approved
      if (approved) {
        await supabase
          .from("properties")
          .update({
            status: "sold",
            sold_to: selectedConversation.other_participant.id,
          })
          .eq("id", selectedConversation.property.id);
      }

      // Refresh messages
      fetchMessages(selectedConversation.id);

      toast({
        title: "Success",
        description: `Booking request ${approved ? "approved" : "rejected"}`,
      });
    } catch (error) {
      console.error("Error handling booking approval:", error);
      toast({
        title: "Error",
        description: "Failed to process booking request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced message bubble component
  const MessageBubble = ({
    message,
    isOwn,
  }: {
    message: MessageWithSender;
    isOwn: boolean;
  }) => {
    const isCallMessage =
      message.metadata?.type &&
      [
        "call_initiated",
        "call_accepted",
        "call_rejected",
        "call_ended",
        "call_missed",
        "call_declined",
      ].includes(message.metadata.type);

    if (isCallMessage) {
      // For call_initiated messages, show accept/reject buttons for recipient
      if (message.metadata?.type === "call_initiated") {
        const isHost = selectedConversation?.property?.host_id === user?.id;
        const isSender = message.sender_id === user?.id;
        const tourId = message.metadata.tour_id;
        const callerName =
          selectedConversation?.other_participant?.full_name ||
          selectedConversation?.other_participant?.email ||
          "Unknown";

        // Check if there are any later call status messages for this tour
        const hasLaterCallStatus = filteredMessages.some(
          (m) =>
            m.created_at > message.created_at &&
            (m.metadata?.type === "call_accepted" ||
              m.metadata?.type === "call_rejected" ||
              m.metadata?.type === "call_ended" ||
              m.metadata?.type === "call_missed") &&
            m.metadata?.tour_id === tourId
        );

        // If there are later status messages, don't show the call interface
        if (hasLaterCallStatus) {
          return (
            <div className="flex justify-center my-4">
              <CallStatusIndicator status="calling" />
            </div>
          );
        }

        if (isHost && isSender) {
          // Host/caller sees calling message
          return (
            <div className="flex justify-center my-4">
              <CallStatusIndicator status="calling" />
            </div>
          );
        } else if (!isSender) {
          // Recipient sees incoming call message with controls
          return (
            <div className="flex justify-center my-4">
              <CallStatusIndicator
                status="incoming"
                isIncoming={true}
                callerName={callerName}
                onAccept={() => handleAcceptCall(tourId)}
                onReject={() => handleRejectCall(tourId)}
              />
            </div>
          );
        } else {
          // Non-host sender - show simple message
          return (
            <div className="flex justify-center my-4">
              <CallStatusIndicator status="calling" />
            </div>
          );
        }
      }

      // Handle missed call messages
      if (message.metadata?.type === "call_missed") {
        return (
          <div className="flex justify-center my-4">
            <CallStatusIndicator status="missed" />
          </div>
        );
      }

      // Handle declined call messages
      if (message.metadata?.type === "call_rejected") {
        return (
          <div className="flex justify-center my-4">
            <CallStatusIndicator status="declined" />
          </div>
        );
      }

      return (
        <div className="flex justify-center my-4">
          <CallStatusIndicator
            status={
              message.metadata?.type === "call_initiated"
                ? "calling"
                : message.metadata?.type === "call_accepted"
                ? "connected"
                : message.metadata?.type === "call_rejected"
                ? "missed"
                : message.metadata?.type === "call_ended"
                ? "ended"
                : "calling"
            }
          />
        </div>
      );
    }

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
          <div
            className={`text-xs mt-1 ${
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced conversation item component
  const ConversationItem = ({
    conversation,
    isSelected,
  }: {
    conversation: Conversation;
    isSelected: boolean;
  }) => {
    const otherParticipant = conversation.participants.find(
      (p) => p.id !== user?.id
    );
    const property = conversation.property;
    const lastMessage = conversation.last_message;
    const isUnread = conversation.unreadCount > 0;

    return (
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-sm ${
          isSelected ? "bg-muted border-l-4 border-l-primary" : ""
        } ${isUnread ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
        onClick={() => handleConversationSelect(conversation)}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={otherParticipant?.avatar_url || "/placeholder-avatar.png"}
              alt={otherParticipant?.full_name || "User"}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherParticipant?.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>
          {isUnread && (
            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {conversation.unreadCount}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm truncate">{property.title}</h3>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          <p className="text-xs text-muted-foreground truncate mb-1">
            {otherParticipant?.full_name ||
              otherParticipant?.email ||
              "Unknown User"}
          </p>

          {lastMessage && (
            <div className="flex items-center gap-2">
              {lastMessage.sender_id === user?.id && (
                <span className="text-xs text-muted-foreground">You:</span>
              )}
              <p
                className={`text-xs truncate ${
                  isUnread
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {lastMessage.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Enhanced call button component
  const CallButton = ({ isHost }: { isHost: boolean }) => {
    const buttonText = isHost ? "Call Buyer" : "Call Host";
    const isCallInProgress = isInCall || isCallInitiating || activeCallTourId;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDirectCall()}
              disabled={isCallInProgress}
              className={`flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:scale-105 ${
                isCallInProgress
                  ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-green-600 dark:border-green-600 text-white dark:text-white"
              }`}
            >
              <Video className="h-4 w-4" />
              {isCallInProgress ? "Call in Progress" : buttonText}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64">
            <div className="space-y-2">
              <p className="font-medium">
                {isCallInProgress ? "Call in Progress" : "Start Video Call"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCallInProgress
                  ? "Please end the current call first"
                  : `Initiate a direct video call with ${
                      isHost ? "the buyer" : "the host"
                    }`}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Enhanced chat header
  const ChatHeader = () => {
    if (!selectedConversation) return null;

    const isHost = selectedConversation.property?.host_id === user?.id;

    return (
      <div className="p-4 border-b bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              {selectedConversation.property?.images?.[0] ? (
                <Image
                  src={selectedConversation.property.images[0]}
                  alt={selectedConversation.property.title}
                  fill
                  className="object-cover rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-base">
                {selectedConversation.property?.title || "Untitled Property"}
              </h3>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.other_participant?.full_name ||
                    selectedConversation.other_participant?.email ||
                    "Unknown User"}
                </p>
                <Badge
                  variant="outline"
                  className="text-xs bg-white/90 dark:bg-gray-800/90 text-foreground dark:text-foreground border-foreground/20 dark:border-foreground/20"
                >
                  {isHost ? "Host" : "Buyer"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <CallButton isHost={isHost} />
          </div>
        </div>
      </div>
    );
  };

  // Enhanced message input
  const MessageInput = () => {
    return (
      <div className="p-4 border-t bg-card flex-shrink-0">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex items-center gap-3"
        >
          <div className="flex-1 relative">
            <Input
              {...register("message")}
              placeholder="Type your message..."
              className="pr-12 min-h-[44px] rounded-full border-2 focus:border-primary hover:border-primary/50 transition-colors"
              disabled={loading || sending}
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
              >
                <Mic className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={loading || sending}
            className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-200"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    );
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(data || null);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Add this effect to fetch active tour when conversation changes
  useEffect(() => {
    if (!selectedConversation?.id || !user) return;

    const fetchActiveTour = async () => {
      try {
        // First, check if the user is authenticated
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          console.error("Authentication error in fetchActiveTour:", authError);
          setActiveTour(null);
          return;
        }

        console.log("User authenticated in fetchActiveTour:", currentUser.id);
        console.log(
          "Checking for virtual tours in conversation:",
          selectedConversation.id
        );

        const { data: tour, error } = await supabase
          .from("virtual_tours")
          .select("*")
          .eq("conversation_id", selectedConversation.id)
          .eq("status", "approved")
          .single();

        if (error) {
          // PGRST116 is "no rows returned" error - this is expected when no tour exists
          if (error.code === "PGRST116") {
            console.log(
              "No virtual tours found for this conversation in fetchActiveTour"
            );
            setActiveTour(null);
            return;
          }

          // Log other errors for debugging
          console.error("Error fetching active tour:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          setActiveTour(null);
          return;
        }

        if (tour) {
          console.log("Found virtual tour in fetchActiveTour:", tour);
          setActiveTour({
            tourId: tour.id,
            scheduledTime: tour.scheduled_time,
          });
        } else {
          setActiveTour(null);
        }
      } catch (err) {
        console.error("Unexpected error in fetchActiveTour:", err);
        setActiveTour(null);
      }
    };

    fetchActiveTour();
  }, [selectedConversation?.id, user]);

  // Add this function after the existing useEffect hooks
  const initializeActiveTour = async (conversationId: string) => {
    if (!conversationId || !user) return;

    try {
      // First, check if the user is authenticated
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        console.error("Authentication error:", authError);
        setActiveTour(null);
        return;
      }

      console.log("User authenticated:", currentUser.id);
      console.log(
        "Checking for virtual tours in conversation:",
        conversationId
      );

      // Get the latest approved tour for this conversation
      const { data: tour, error } = await supabase
        .from("virtual_tours")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 is "no rows returned" error - this is expected when no tour exists
        if (error.code === "PGRST116") {
          console.log("No virtual tours found for this conversation");
          setActiveTour(null);
          return;
        }

        // Log other errors for debugging
        console.error("Error initializing active tour:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setActiveTour(null);
        return;
      }

      if (tour) {
        console.log("Found virtual tour:", tour);
        setActiveTour({
          tourId: tour.id,
          scheduledTime: tour.scheduled_time,
        });
      } else {
        setActiveTour(null);
      }
    } catch (error) {
      console.error("Unexpected error in initializeActiveTour:", error);
      setActiveTour(null);
    }
  };

  // Update the useEffect that handles conversation changes
  useEffect(() => {
    if (selectedConversation?.id) {
      fetchMessages(selectedConversation.id);
      initializeActiveTour(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-medium">Loading conversations...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const messagesContent = (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto px-0 sm:px-4 py-8 pt-24 flex-1 flex flex-col pb-20">
        {/* Header */}
        <div className="flex items-center mb-6 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 hover:bg-muted/80 hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Chat with hosts and buyers
            </p>
          </div>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-3 gap-0 md:gap-6 h-[calc(100vh-12rem)] md:h-[calc(100vh-16rem)]">
          {/* Conversations List */}
          <div
            className={`md:col-span-1 bg-card rounded-none md:rounded-xl border md:block ${
              selectedConversation && window.innerWidth < 768
                ? "hidden"
                : "block"
            }`}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversations
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {conversations.length}
                </Badge>
              </div>
            </div>

            <ScrollArea className="h-[300px] md:h-[calc(100vh-20rem)]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    No conversations yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start chatting with hosts or buyers
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversation?.id === conversation.id}
                  />
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Section */}
          <div
            className={`md:col-span-2 flex flex-col bg-card rounded-none md:rounded-xl border h-full ${
              selectedConversation && window.innerWidth < 768
                ? "block"
                : "hidden md:block"
            }`}
          >
            {/* Mobile back button */}
            {selectedConversation && window.innerWidth < 768 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="flex items-center gap-2 p-3 border-b md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Conversations
              </Button>
            )}

            {/* Call notification banner */}
            {isCallInitiating && activeCallTourId && selectedConversation && (
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50">
                <CallNotification
                  type="connecting"
                  callerName={
                    selectedConversation.other_participant?.full_name ||
                    selectedConversation.other_participant?.email ||
                    "Unknown"
                  }
                  isHost={selectedConversation.property?.host_id === user?.id}
                  autoHide={false}
                />
              </div>
            )}

            {/* Show VideoCallWrapper when in call */}
            {isInCall && activeCallTourId && selectedConversation && user ? (
              <div className="h-full">
                <VideoCallWrapper
                  key={`video-call-${activeCallTourId}-${isInCall}-${isCallInitiating}`}
                  conversationId={selectedConversation.id}
                  tourId={activeCallTourId}
                  isHost={isCallInitiator}
                  onEndCall={handleEndCall}
                  onCallConnected={() => {
                    setIsCallInitiating(false);
                    setIsInCall(true);
                  }}
                  user={{ id: user.id }}
                  shouldStartCall={isInCall}
                />
              </div>
            ) : isCallInitiating &&
              activeCallTourId &&
              selectedConversation &&
              user ? (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50">
                <div className="text-center p-8">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute inset-0 w-16 h-16 bg-primary/20 rounded-full animate-ping mx-auto"></div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Initiating Call...
                  </h3>
                  <p className="text-muted-foreground">
                    Please wait while we connect you
                  </p>
                </div>
              </div>
            ) : selectedConversation ? (
              <>
                <ChatHeader />

                {/* Messages */}
                <ScrollArea
                  ref={chatScrollAreaRef}
                  className="flex-1 h-[calc(100vh-400px)] bg-gradient-to-b from-background to-muted/20"
                >
                  <div className="p-4 space-y-2">
                    {filteredMessages.map((message, index) => (
                      <MessageBubble
                        key={`${message.id}-${message.created_at}-${index}`}
                        message={message}
                        isOwn={message.sender_id === user?.id}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <MessageInput />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Select a Conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Virtual Tour Dialog */}
      {isVirtualTourDialogOpen && selectedConversation && (
        <VirtualTourDialog
          isOpen={isVirtualTourDialogOpen}
          onClose={() => {
            setIsVirtualTourDialogOpen(false);
            setLoading(false);
          }}
          conversationId={selectedConversation.id}
          propertyId={selectedConversation.property_id}
          hostId={selectedConversation.property?.host_id || ""}
          isHost={selectedConversation.property?.host_id === user?.id}
          onTourScheduled={handleTourScheduled}
        />
      )}

      {/* Booking Dialog */}
      {isBookingDialogOpen && selectedConversation && (
        <BookingDialog
          isOpen={isBookingDialogOpen}
          onClose={() => setIsBookingDialogOpen(false)}
          conversationId={selectedConversation.id}
          propertyId={selectedConversation.property_id}
          hostId={selectedConversation.property?.host_id || ""}
          userProfile={
            userProfile
              ? {
                  full_name: userProfile.full_name,
                  phone: userProfile.phone,
                }
              : null
          }
          onBookingSubmitted={handleBookingSubmitted}
        />
      )}
    </div>
  );

  return (
    <AuthGuard
      fallback={
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-8 pt-24">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">
                  Sign in to view messages
                </h1>
                <p className="text-muted-foreground mb-8">
                  Chat with hosts and buyers about properties.
                </p>
              </div>
            </div>
          </main>
        </div>
      }
    >
      {messagesContent}
    </AuthGuard>
  );
}
