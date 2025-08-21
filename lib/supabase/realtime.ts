import { supabase } from "./client";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    full_name: string | null;
    avatar_url: string | null;
  };
  conversation: {
    property: {
      title: string;
      images: string[];
    };
  };
}

interface Conversation {
  id: string;
  property_id: string;
  participant1_id: string;
  participant2_id: string;
  updated_at: string;
  property: {
    title: string;
    images: string[];
  };
  participant1: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  participant2: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  } | null;
}

interface MessagePayload {
  new: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
  };
}

interface ConversationPayload {
  new: {
    id: string;
  };
  old: {
    id: string;
  };
  eventType: "INSERT" | "UPDATE" | "DELETE";
}

export const setupRealtimeSubscription = async (
  conversationId: string,
  currentUserId: string,
  onNewMessage: (message: Message) => void,
  onConversationUpdate: (conversation: any) => void
) => {
  const messagesChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload: MessagePayload) => {
        try {
          // Fetch the complete message with sender details
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select(
              `
              *,
              sender:profiles!messages_sender_id_fkey(
                id,
                email,
                full_name,
                avatar_url
              ),
              conversation:conversations(
                id,
                property:properties(
                  id,
                  title,
                  images
                ),
                participant1:profiles!conversations_participant1_id_fkey(
                  id,
                  email,
                  full_name,
                  avatar_url
                ),
                participant2:profiles!conversations_participant2_id_fkey(
                  id,
                  email,
                  full_name,
                  avatar_url
                )
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (messageError) {
            return;
          }

          if (messageData) {
            const formattedMessage: Message = {
              id: messageData.id,
              conversation_id: messageData.conversation_id,
              sender_id: messageData.sender_id,
              content: messageData.content,
              created_at: messageData.created_at,
              sender: {
                full_name: messageData.sender?.full_name || null,
                avatar_url: messageData.sender?.avatar_url || null,
              },
              conversation: {
                property: messageData.conversation.property || {
                  title: "Untitled Property",
                  images: [],
                },
              },
            };

            onNewMessage(formattedMessage);

            // Also update the conversation with the latest message
            const conversationUpdate = {
              id: messageData.conversation.id,
              last_message: {
                content: messageData.content,
                created_at: messageData.created_at,
              },
            };
            onConversationUpdate(conversationUpdate);
          }
        } catch (error) {
          // Silent error handling for real-time updates
        }
      }
    )
    .subscribe();

  return () => {
    messagesChannel.unsubscribe();
  };
};
