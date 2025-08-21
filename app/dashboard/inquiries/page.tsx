"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Conversation {
  id: string;
  property: {
    id: string;
    title: string;
    host_id: string;
  };
  participants: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  last_message: {
    content: string;
    created_at: string;
  } | null;
  updated_at: string;
}

export default function InquiriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=in.(${conversations
              .map((c) => c.id)
              .join(",")})`,
          },
          async (payload) => {
            // Fetch the updated conversation to get the latest message
            const { data: updatedConv, error } = await supabase
              .from("conversations")
              .select(
                `
                *,
                property:properties (
                  id,
                  title,
                  host_id
                ),
                participant1:profiles!conversations_participant1_id_fkey (
                  id,
                  full_name,
                  avatar_url
                ),
                participant2:profiles!conversations_participant2_id_fkey (
                  id,
                  full_name,
                  avatar_url
                ),
                last_message:messages (
                  content,
                  created_at
                )
              `
              )
              .eq("id", payload.new.conversation_id)
              .single();

            if (error) {
              console.error("Error fetching updated conversation:", error);
              return;
            }

            // Update the conversations list
            setConversations((prev) => {
              const filtered = prev.filter((c) => c.id !== updatedConv.id);
              const newConv = {
                id: updatedConv.id,
                property: updatedConv.property,
                participants: [
                  updatedConv.participant1,
                  updatedConv.participant2,
                ].filter(Boolean),
                last_message: updatedConv.last_message?.[0] || null,
                updated_at: updatedConv.updated_at,
              };
              return [newConv, ...filtered];
            });
          }
        )
        .subscribe();

      // Subscribe to conversation updates
      const conversationsSubscription = supabase
        .channel("conversations")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
            filter: `id=in.(${conversations.map((c) => c.id).join(",")})`,
          },
          async (payload) => {
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
                    host_id
                  ),
                  participant1:profiles!conversations_participant1_id_fkey (
                    id,
                    full_name,
                    avatar_url
                  ),
                  participant2:profiles!conversations_participant2_id_fkey (
                    id,
                    full_name,
                    avatar_url
                  ),
                  last_message:messages (
                    content,
                    created_at
                  )
                `
                )
                .eq("id", payload.new.id)
                .single();

              if (error) {
                console.error("Error fetching updated conversation:", error);
                return;
              }

              setConversations((prev) => {
                const filtered = prev.filter((c) => c.id !== updatedConv.id);
                const newConv = {
                  id: updatedConv.id,
                  property: updatedConv.property,
                  participants: [
                    updatedConv.participant1,
                    updatedConv.participant2,
                  ].filter(Boolean),
                  last_message: updatedConv.last_message?.[0] || null,
                  updated_at: updatedConv.updated_at,
                };
                return [newConv, ...filtered];
              });
            }
          }
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
        conversationsSubscription.unsubscribe();
      };
    }
  }, [user, conversations]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          property:properties (
            id,
            title,
            host_id
          ),
          participant1:profiles!conversations_participant1_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          participant2:profiles!conversations_participant2_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          last_message:messages (
            content,
            created_at
          )
        `
        )
        .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const transformedData = data
        ?.filter((conv) => conv.property?.host_id === user?.id)
        .map((conv) => ({
          id: conv.id,
          property: conv.property,
          participants: [conv.participant1, conv.participant2].filter(Boolean),
          last_message: conv.last_message?.[0] || null,
          updated_at: conv.updated_at,
        }));

      setConversations(transformedData || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inquiries</h1>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No inquiries yet. When someone messages you about your listings,
            they will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(
              (p) => p?.id !== user?.id
            );

            if (!otherParticipant) return null;

            return (
              <Link
                key={conversation.id}
                href={`/messages?conversation=${conversation.id}`}
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src={otherParticipant.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {otherParticipant.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {otherParticipant.full_name || "Anonymous User"}
                          </p>
                          {conversation.last_message && (
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(conversation.last_message.created_at),
                                { addSuffix: true }
                              )}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.property?.title || "Untitled Property"}
                        </p>
                        {conversation.last_message && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conversation.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
