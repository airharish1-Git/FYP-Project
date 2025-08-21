"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { VideoCall } from "./video-call";

interface VideoCallState {
  isActive: boolean;
  activeInstanceId: string | null;
  conversationId: string | null;
  tourId: string | null;
  isHost: boolean;
  userId: string | null;
  onEndCall: (() => void) | null;
  onCallConnected: (() => void) | null;
}

interface VideoCallManagerContextType {
  startCall: (params: {
    conversationId: string;
    tourId: string;
    isHost: boolean;
    userId: string;
    onEndCall: () => void;
    onCallConnected?: () => void;
  }) => boolean;
  endCall: () => void;
  isCallActive: boolean;
  activeInstanceId: string | null;
}

const VideoCallManagerContext =
  createContext<VideoCallManagerContextType | null>(null);

export function VideoCallManagerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [callState, setCallState] = useState<VideoCallState>({
    isActive: false,
    activeInstanceId: null,
    conversationId: null,
    tourId: null,
    isHost: false,
    userId: null,
    onEndCall: null,
    onCallConnected: null,
  });

  const isInitializingRef = useRef(false);
  // Store the current onEndCall callback in a ref to avoid stale closures
  const currentOnEndCallRef = useRef<(() => void) | null>(null);
  // Store current call state in ref to avoid closure issues
  const currentCallStateRef = useRef(callState);

  // Update ref when callState changes
  useEffect(() => {
    currentCallStateRef.current = callState;
  }, [callState]);

  const startCall = useCallback(
    (params: {
      conversationId: string;
      tourId: string;
      isHost: boolean;
      userId: string;
      onEndCall: () => void;
      onCallConnected?: () => void;
    }) => {
      const instanceId = `${params.tourId}-${params.conversationId}`;

      if (currentCallStateRef.current.isActive) {
        console.log(
          "VideoCallManager: Cannot start call, another call is active",
          {
            currentInstanceId: currentCallStateRef.current.activeInstanceId,
            newInstanceId: instanceId,
          }
        );
        return false;
      }

      console.log("VideoCallManager: Starting new call", { instanceId });
      isInitializingRef.current = true;

      // Store the onEndCall callback in the ref
      currentOnEndCallRef.current = params.onEndCall;

      setCallState({
        isActive: true,
        activeInstanceId: instanceId,
        conversationId: params.conversationId,
        tourId: params.tourId,
        isHost: params.isHost,
        userId: params.userId,
        onEndCall: params.onEndCall,
        onCallConnected: params.onCallConnected || null,
      });

      return true;
    },
    [] // Remove dependency on callState.isActive to prevent function recreation
  );

  const endCall = useCallback(() => {
    // Call the current onEndCall callback from the ref
    if (currentOnEndCallRef.current) {
      currentOnEndCallRef.current();
    }

    // Reset the call state immediately
    setCallState({
      isActive: false,
      activeInstanceId: null,
      conversationId: null,
      tourId: null,
      isHost: false,
      userId: null,
      onEndCall: null,
      onCallConnected: null,
    });

    // Clear the ref
    currentOnEndCallRef.current = null;
    isInitializingRef.current = false;

    // Force a re-render to ensure the video call component is unmounted
    setTimeout(() => {
      setCallState((prev) => ({ ...prev }));
    }, 100);
  }, [callState]);

  const handleCallConnected = useCallback(() => {
    console.log("VideoCallManager: Call connected");
    isInitializingRef.current = false;
    if (callState.onCallConnected) {
      callState.onCallConnected();
    }
  }, [callState.onCallConnected]);

  return (
    <VideoCallManagerContext.Provider
      value={{
        startCall,
        endCall,
        isCallActive: callState.isActive,
        activeInstanceId: callState.activeInstanceId,
      }}
    >
      {children}

      {/* Render the active video call */}
      {callState.isActive &&
        callState.conversationId &&
        callState.tourId &&
        callState.userId && (
          <div className="fixed inset-0 z-50">
            <VideoCall
              key={`${callState.activeInstanceId}-${callState.isActive}`}
              conversationId={callState.conversationId}
              tourId={callState.tourId}
              isHost={callState.isHost}
              onEndCall={endCall}
              onCallConnected={handleCallConnected}
              user={{ id: callState.userId }}
            />
          </div>
        )}
    </VideoCallManagerContext.Provider>
  );
}

export function useVideoCallManager() {
  const context = useContext(VideoCallManagerContext);
  if (!context) {
    throw new Error(
      "useVideoCallManager must be used within a VideoCallManagerProvider"
    );
  }
  return context;
}

// Simplified wrapper component that uses the manager
interface VideoCallWrapperProps {
  conversationId: string;
  tourId: string;
  isHost: boolean;
  onEndCall: () => void;
  onCallConnected?: () => void;
  user: { id: string };
  shouldStartCall?: boolean; // Add this prop to control when to start the call
}

export function VideoCallWrapper({
  conversationId,
  tourId,
  isHost,
  onEndCall,
  onCallConnected,
  user,
  shouldStartCall = false, // Default to false to prevent auto-start
}: VideoCallWrapperProps) {
  const { startCall, isCallActive, activeInstanceId } = useVideoCallManager();
  const instanceId = `${tourId}-${conversationId}`;
  const hasAttemptedStart = useRef(false);

  // Only start the call if the parent component explicitly wants it
  // Don't auto-start on mount to avoid overriding parent state
  useEffect(() => {
    console.log("VideoCallWrapper useEffect triggered", {
      isCallActive,
      hasAttemptedStart: hasAttemptedStart.current,
      activeInstanceId,
      instanceId,
      isHost,
      shouldStartCall,
    });

    // Only start call if:
    // 1. No call is active
    // 2. We haven't attempted yet
    // 3. Parent component explicitly wants us to start
    if (!isCallActive && !hasAttemptedStart.current && shouldStartCall) {
      console.log("VideoCallWrapper: Starting call", { isHost, instanceId });
      hasAttemptedStart.current = true;
      const success = startCall({
        conversationId,
        tourId,
        isHost,
        userId: user.id,
        onEndCall,
        onCallConnected,
      });

      if (!success) {
        console.log(
          "VideoCallWrapper: Failed to start call, another call is active"
        );
        hasAttemptedStart.current = false; // Reset if failed
      } else {
        console.log("VideoCallWrapper: Call started successfully", {
          isHost,
          instanceId,
        });
      }
    }
  }, [
    isCallActive,
    startCall,
    conversationId,
    tourId,
    isHost,
    user.id,
    onEndCall,
    onCallConnected,
    instanceId,
    shouldStartCall, // Add this dependency
  ]);

  // Reset attempt flag when call ends
  useEffect(() => {
    if (!isCallActive) {
      hasAttemptedStart.current = false;
      console.log("VideoCallWrapper: Call ended, reset hasAttemptedStart flag");
    }
  }, [isCallActive]);

  // Reset attempt flag when tourId changes (new call)
  useEffect(() => {
    hasAttemptedStart.current = false;
    console.log(
      "VideoCallWrapper: TourId changed, reset hasAttemptedStart flag"
    );
  }, [tourId]);

  // Force reset when call ends for this specific instance
  useEffect(() => {
    if (!isCallActive && activeInstanceId === instanceId) {
      console.log(
        "VideoCallWrapper: This call ended, resetting for this instance"
      );
      hasAttemptedStart.current = false;
    }
  }, [isCallActive, activeInstanceId, instanceId]);

  // If this instance is active, render nothing (the manager handles the rendering)
  if (isCallActive && activeInstanceId === instanceId) {
    console.log(
      "VideoCallWrapper: Call is active, manager is handling rendering"
    );
    return null;
  }

  // If another call is active, render nothing
  if (isCallActive && activeInstanceId !== instanceId) {
    console.log("VideoCallWrapper: Another call is active, not rendering");
    return null;
  }

  // If no call is active, render nothing (shouldn't happen if startCall was successful)
  console.log("VideoCallWrapper: No call active, not rendering");
  return null;
}
