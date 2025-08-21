"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Settings,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  User,
  Clock,
  Signal,
  Wifi,
  WifiOff,
} from "lucide-react";

interface VideoCallProps {
  conversationId: string;
  tourId: string;
  isHost: boolean;
  onEndCall: () => void;
  onCallConnected?: () => void;
  user: { id: string };
}

export function VideoCall({
  conversationId,
  tourId,
  isHost,
  onEndCall,
  onCallConnected,
  user,
}: VideoCallProps) {
  const instanceId = `${tourId}-${conversationId}`;

  // State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<
    "good" | "poor" | "disconnected"
  >("good");
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const hasSubscribedRef = useRef(false);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const connectionStateRef = useRef<string>("new");
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const readyPeers = useRef<Set<string>>(new Set());
  const callStartTimeRef = useRef<number>(0);

  // Function to connect stream to video element
  const connectStreamToVideo = useCallback(() => {
    if (
      localStream &&
      localVideoRef.current &&
      !localVideoRef.current.srcObject
    ) {
      console.log("connectStreamToVideo: Connecting stream to video element");
      try {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.load();
        console.log("connectStreamToVideo: Connection successful");
      } catch (error) {
        console.error("connectStreamToVideo: Connection failed:", error);
      }
    }
  }, [localStream]);

  // Function to connect remote stream to video element
  const connectRemoteStreamToVideo = useCallback(() => {
    if (
      remoteStream &&
      remoteVideoRef.current &&
      !remoteVideoRef.current.srcObject
    ) {
      console.log(
        "connectRemoteStreamToVideo: Connecting remote stream to video element"
      );
      try {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.load();
        console.log("connectRemoteStreamToVideo: Connection successful");
      } catch (error) {
        console.error("connectRemoteStreamToVideo: Connection failed:", error);
      }
    }
  }, [remoteStream]);

  // Ref callback for local video element
  const setLocalVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      localVideoRef.current = element;
      if (element && localStream && !element.srcObject) {
        console.log("setLocalVideoRef: Connecting stream to new video element");
        try {
          element.srcObject = localStream;
          element.load();
          console.log("setLocalVideoRef: Connection successful");
        } catch (error) {
          console.error("setLocalVideoRef: Connection failed:", error);
        }
      }
    },
    [localStream]
  );

  // Ref callback for remote video element
  const setRemoteVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      remoteVideoRef.current = element;
      if (element && remoteStream && !element.srcObject) {
        console.log(
          "setRemoteVideoRef: Connecting remote stream to new video element"
        );
        try {
          element.srcObject = remoteStream;
          element.load();
          console.log("setRemoteVideoRef: Connection successful");
        } catch (error) {
          console.error("setRemoteVideoRef: Connection failed:", error);
        }
      }
    },
    [remoteStream]
  );

  const { toast } = useToast();

  // Cleanup function
  const cleanupCall = useCallback(() => {
    console.log("Cleaning up call resources...", { instanceId });

    // Cleanup peer connection
    if (peerConnectionRef.current) {
      console.log("Closing peer connection");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Cleanup channel
    if (channelRef.current) {
      console.log("Unsubscribing from channel");
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Cleanup streams
    if (localStream) {
      console.log("Stopping local stream tracks");
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      setLocalStream(null);
    }

    if (remoteStreamRef.current) {
      console.log("Stopping remote stream tracks");
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote track:", track.kind);
      });
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    // Cleanup video elements
    if (localVideoRef.current) {
      console.log("Clearing local video srcObject");
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      console.log("Clearing remote video srcObject");
      remoteVideoRef.current.srcObject = null;
    }

    // Reset refs
    hasInitializedRef.current = false;
    hasSubscribedRef.current = false;
    processedSignalsRef.current.clear();
    pendingCandidates.current = [];
    connectionStateRef.current = "new";

    console.log("Call cleanup completed", { instanceId });
  }, [instanceId, localStream]);

  // Helper function to handle signals
  const handleSignal = async (
    payload: any,
    pc: RTCPeerConnection,
    channel: any
  ) => {
    const { type, data, signalId } = payload;

    console.log("Processing signal:", type, {
      isHost,
      instanceId,
      signalId,
      payload,
    });

    // Check if we've already processed this signal
    if (signalId && processedSignalsRef.current.has(signalId)) {
      console.log("Skipping duplicate signal:", signalId);
      return;
    }

    if (!pc) {
      console.log("No peer connection available, ignoring signal");
      return;
    }

    try {
      // Mark signal as processed
      if (signalId) {
        processedSignalsRef.current.add(signalId);
      }

      if (type === "offer") {
        console.log("📥 Received offer", { isHost });
        // Only process offers if we're not the host
        if (!isHost) {
          try {
            // Set remote description first
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Process queued ICE candidates
            for (const candidate of pendingCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];

            // Create and set local answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer back
            const answerSignalId = generateSignalId("answer", {
              sdp: answer,
            });
            const answerPayload = {
              type: "broadcast" as const,
              event: "signal",
              payload: {
                type: "answer",
                data: { sdp: answer },
                signalId: answerSignalId,
              },
            };

            channel.send(answerPayload);
            console.log("📤 Answer sent via channel", {
              isHost,
              channelState: channel.state,
            });
          } catch (error) {
            console.error("Error processing offer:", error);
          }
        }
      } else if (type === "answer") {
        console.log("📥 Received answer", { isHost });
        // Only process answers if we are the host and in the right state
        if (isHost && pc.signalingState === "have-local-offer") {
          try {
            // Set remote description first
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Process queued ICE candidates
            for (const candidate of pendingCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];
          } catch (error) {
            console.error("Error processing answer:", error);
          }
        }
      } else if (type === "ready") {
        console.log("📥 Received ready signal", {
          isHost,
          fromHost: data.isHost,
        });
        readyPeers.current.add(data.isHost ? "host" : "non-host");
        console.log("📊 Ready peers after adding:", readyPeers.current.size, {
          isHost,
          readyPeers: Array.from(readyPeers.current),
        });

        // If we're the host and both sides are ready, send the offer
        if (isHost && readyPeers.current.size === 2) {
          console.log("🎯 Both sides ready, sending offer", { isHost });

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const offerSignalId = generateSignalId("offer", { sdp: offer });
          const offerPayload = {
            type: "broadcast" as const,
            event: "signal",
            payload: {
              type: "offer",
              data: { sdp: offer },
              signalId: offerSignalId,
            },
          };

          channel.send(offerPayload);
          console.log("📤 Offer sent via channel", {
            isHost,
            channelState: channel.state,
          });
        }
      } else if (type === "call-ended") {
        console.log("📥 Received call ended signal", {
          isHost,
          fromHost: data.isHost,
        });
        // End the call on this side too
        endCall();
      } else if (type === "ice-candidate") {
        // Always queue ICE candidates until remote description is set
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidates.current.push(data.candidate);
        }
      }
    } catch (error) {
      console.error("Error handling signal:", error);
    }
  };

  // Helper function to ensure channel is ready
  const ensureChannelReady = async () => {
    if (!hasSubscribedRef.current) {
      console.log("Channel not ready, waiting for subscription...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return hasSubscribedRef.current;
  };

  // Generate unique signal ID to prevent duplicates
  const generateSignalId = (type: string, data: any) => {
    return `${type}-${JSON.stringify(data)}-${Date.now()}`;
  };

  // Initialize call
  const initializeCall = useCallback(async () => {
    if (hasInitializedRef.current) {
      console.log("Call already initialized, skipping...");
      return;
    }

    console.log("Initializing call...", { isHost, tourId, instanceId });
    hasInitializedRef.current = true;

    try {
      setIsInitializing(true);
      setError(null);

      // Request permissions
      console.log("Requesting camera and microphone permissions...");
      setIsRequestingPermissions(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Permission request completed");
      setIsRequestingPermissions(false);

      if (!isMountedRef.current) {
        console.log(
          "Component unmounted during permission request, cleaning up"
        );
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setLocalStream(stream);
      console.log("Local stream set successfully", {
        tracks: stream.getTracks().map((t) => t.kind),
        isHost,
        instanceId,
      });

      // Set call as active when we successfully get the local stream
      setIsCallActive(true);
      setIsInitializing(false);

      // Immediately try to connect stream to video element
      if (localVideoRef.current) {
        console.log("Immediately connecting stream to video element");
        try {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.load();
          console.log("Stream connected to video element immediately");
        } catch (error) {
          console.error("Error connecting stream immediately:", error);
        }
      }

      // Create peer connection - using exact same configuration as working code
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],
        iceCandidatePoolSize: 10,
      });

      peerConnectionRef.current = pc;

      // Track signaling state
      pc.onsignalingstatechange = () => {
        console.log("📡 Signaling:", pc.signalingState, { isHost });
      };

      // Track connection state
      pc.onconnectionstatechange = () => {
        connectionStateRef.current = pc.connectionState;
        console.log("🔗 Connection:", pc.connectionState, { isHost });

        if (pc.connectionState === "connected") {
          console.log("✅ Connected!");
          onCallConnected?.();
        } else if (pc.connectionState === "failed") {
          if (
            pc.iceConnectionState === "failed" ||
            pc.iceConnectionState === "disconnected"
          ) {
            setIsCallActive(false);
          }
        } else if (pc.connectionState === "disconnected") {
          setIsCallActive(false);
        }
      };

      // Track ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE:", pc.iceConnectionState, { isHost });
      };

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create remote stream and handle incoming tracks - following working pattern exactly
      remoteStreamRef.current = new MediaStream();
      setRemoteStream(remoteStreamRef.current);

      // Handle incoming tracks - following the working pattern exactly
      pc.ontrack = (event) => {
        console.log("🎯 ONTRACK EVENT TRIGGERED!", {
          streams: event.streams.length,
          trackKind: event.track.kind,
          trackId: event.track.id,
          trackEnabled: event.track.enabled,
          isHost,
          instanceId,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
        });

        // Add tracks from remote stream to our remote stream - following working pattern exactly
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            console.log("Adding remote track to remote stream", {
              kind: track.kind,
              enabled: track.enabled,
            });
            remoteStreamRef.current?.addTrack(track);
          });
        } else {
          // Fallback: add the individual track if no stream
          console.log("Adding individual remote track to remote stream", {
            kind: event.track.kind,
            enabled: event.track.enabled,
          });
          remoteStreamRef.current?.addTrack(event.track);
        }

        console.log("Remote stream after adding tracks", {
          trackCount: remoteStreamRef.current?.getTracks().length || 0,
          tracks:
            remoteStreamRef.current
              ?.getTracks()
              .map((t) => ({ kind: t.kind, enabled: t.enabled })) || [],
        });

        // Update the state to trigger re-render
        setRemoteStream(
          new MediaStream(remoteStreamRef.current?.getTracks() || [])
        );

        // Set the remote stream to the video element immediately - following working pattern exactly
        if (remoteVideoRef.current && remoteStreamRef.current) {
          // Clear any existing srcObject first
          remoteVideoRef.current.srcObject = null;

          // Set the new stream
          remoteVideoRef.current.srcObject = remoteStreamRef.current;

          // Force the video element to load
          remoteVideoRef.current.load();
        }

        // Also update the state to ensure React re-renders with the new stream
        const updatedRemoteStream = new MediaStream(
          remoteStreamRef.current?.getTracks() || []
        );
        setRemoteStream(updatedRemoteStream);
      };

      // Create and subscribe to channel
      const channel = supabase
        .channel(`call-signals-${conversationId}`)
        .on("broadcast", { event: "*" }, async ({ payload }) => {
          console.log("📨 Received broadcast:", payload.type, { isHost });
          await handleSignal(payload, pc, channel);
        })
        .on("broadcast", { event: "signal" }, async ({ payload }) => {
          console.log("📨 Received signal:", payload.type, { isHost });
          await handleSignal(payload, pc, channel);
        });

      channelRef.current = channel;

      // Only subscribe if we haven't already subscribed
      if (!hasSubscribedRef.current) {
        try {
          await channel.subscribe();
          hasSubscribedRef.current = true;
          console.log("✅ Channel subscribed", {
            isHost,
            channelState: channel.state,
          });

          // Wait for channel to be fully joined
          let attempts = 0;
          while (channel.state !== "joined" && attempts < 10) {
            console.log("⏳ Waiting for channel to join", {
              isHost,
              channelState: channel.state,
              attempts,
            });
            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
          }
          console.log("✅ Channel fully joined", {
            isHost,
            channelState: channel.state,
          });

          // Send ready signal to indicate we're ready for signaling
          const readySignalId = generateSignalId("ready", { isHost });
          const readyPayload = {
            type: "broadcast" as const,
            event: "signal",
            payload: {
              type: "ready",
              data: { isHost },
              signalId: readySignalId,
            },
          };
          channel.send(readyPayload);
          console.log("📤 Ready signal sent", { isHost });

          // Add ourselves to ready peers
          readyPeers.current.add(isHost ? "host" : "non-host");
          console.log("📊 Ready peers count:", readyPeers.current.size, {
            isHost,
          });
        } catch (error) {
          console.error("Error subscribing to channel:", error);
          throw error;
        }
      }

      // Create and send offer if host (will be triggered by ready signal)
      if (isHost) {
        // Wait for both sides to be ready before sending offer
        console.log("📥 Host waiting for both sides to be ready", { isHost });
      } else {
        console.log("📥 Waiting for offer", { isHost });
      }

      // Add ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const iceSignalId = generateSignalId("ice-candidate", {
            candidate: event.candidate,
          });
          const icePayload = {
            type: "broadcast" as const,
            event: "signal",
            payload: {
              type: "ice-candidate",
              data: { candidate: event.candidate },
              signalId: iceSignalId,
            },
          };

          if (hasSubscribedRef.current) {
            channel.send(icePayload);
          } else {
            console.log("⏳ Channel not ready for ICE, queuing", { isHost });
            setTimeout(() => {
              if (hasSubscribedRef.current) {
                channel.send(icePayload);
              }
            }, 1000);
          }
        }
      };

      setIsInitializing(false);
    } catch (error) {
      console.error("Error initializing call:", error);
      setIsRequestingPermissions(false);
      setIsInitializing(false);
      setError("Failed to access camera and microphone");
    }
  }, [isHost, tourId, instanceId, onCallConnected]);

  // Connect local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      try {
        // Clear any existing srcObject first
        localVideoRef.current.srcObject = null;

        // Set the new stream
        localVideoRef.current.srcObject = localStream;

        // Force video element to load
        localVideoRef.current.load();
      } catch (error) {
        console.error("Error connecting local stream to video element:", error);
      }
    }
  }, [localStream]);

  // Connect remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      try {
        // Clear any existing srcObject first
        remoteVideoRef.current.srcObject = null;

        // Set the new stream
        remoteVideoRef.current.srcObject = remoteStream;

        // Force video element to load
        remoteVideoRef.current.load();
      } catch (error) {
        console.error(
          "Error connecting remote stream to video element:",
          error
        );
      }
    }
  }, [remoteStream]);

  // Remove manual connection attempts

  // Initialize on mount
  useEffect(() => {
    console.log("VideoCall component mounted", { instanceId });

    // Reset initialization flag when component mounts
    hasInitializedRef.current = false;
    hasSubscribedRef.current = false;
    isMountedRef.current = true;
    processedSignalsRef.current.clear();
    connectionStateRef.current = "new";

    initializeCall();

    return () => {
      console.log("VideoCall component unmounting", { instanceId });
      isMountedRef.current = false;
      cleanupCall();
    };
  }, []); // Empty dependency array

  // Remove periodic check

  // Handle call end - reset states when call is no longer active
  useEffect(() => {
    if (!isCallActive) {
      setIsInitializing(false);
      setIsRequestingPermissions(false);
      setError(null);
      hasInitializedRef.current = false;
      hasSubscribedRef.current = false;
    }
  }, [isCallActive, instanceId]);

  // End call function
  const endCall = async () => {
    console.log("Ending call...", { instanceId });

    // Send call ended signal to the other peer
    if (channelRef.current && hasSubscribedRef.current) {
      const endCallSignalId = generateSignalId("call-ended", { isHost });
      const endCallPayload = {
        type: "broadcast" as const,
        event: "signal",
        payload: {
          type: "call-ended",
          data: { isHost },
          signalId: endCallSignalId,
        },
      };
      channelRef.current.send(endCallPayload);
      console.log("📤 Call ended signal sent", { isHost });
    }

    // Reset all states immediately
    setIsCallActive(false);
    setIsInitializing(false);
    setIsRequestingPermissions(false);
    setError(null);

    // Reset refs
    hasInitializedRef.current = false;
    hasSubscribedRef.current = false;
    processedSignalsRef.current.clear();
    pendingCandidates.current = [];
    connectionStateRef.current = "new";

    // Cleanup resources
    cleanupCall();

    // Call the parent's onEndCall (which will trigger page reload)
    onEndCall();

    console.log("Call ended successfully", { instanceId });
  };

  // Toggle functions
  const toggleMute = () => {
    console.log("Toggle mute clicked", {
      isMuted,
      hasLocalStream: !!localStream,
    });
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log("Audio tracks found:", audioTracks.length);
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
        console.log(
          "Audio track enabled:",
          audioTrack.enabled,
          "Muted:",
          !isMuted
        );
      } else {
        console.log("No audio tracks found in local stream");
      }
    } else {
      console.log("No local stream available");
    }
  };

  const toggleVideo = () => {
    console.log("Toggle video clicked", {
      isVideoOff,
      hasLocalStream: !!localStream,
    });
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log("Video tracks found:", videoTracks.length);
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!isVideoOff);
        console.log(
          "Video track enabled:",
          videoTrack.enabled,
          "Video off:",
          !isVideoOff
        );
      } else {
        console.log("No video tracks found in local stream");
      }
    } else {
      console.log("No local stream available");
    }
  };

  // Early returns
  if (!conversationId || !tourId || !user?.id) {
    return null;
  }

  // Call duration timer
  useEffect(() => {
    if (isCallActive && callStartTimeRef.current === 0) {
      callStartTimeRef.current = Date.now();
    }

    const timer = setInterval(() => {
      if (isCallActive && callStartTimeRef.current > 0) {
        setCallDuration(
          Math.floor((Date.now() - callStartTimeRef.current) / 1000)
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCallActive]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Connection quality indicator
  const ConnectionQualityIndicator = () => {
    const getQualityConfig = () => {
      switch (connectionQuality) {
        case "good":
          return {
            icon: <Wifi className="h-4 w-4" />,
            color: "text-green-500",
            bgColor: "bg-green-500/20",
            text: "Good",
          };
        case "poor":
          return {
            icon: <Signal className="h-4 w-4" />,
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/20",
            text: "Poor",
          };
        case "disconnected":
          return {
            icon: <WifiOff className="h-4 w-4" />,
            color: "text-red-500",
            bgColor: "bg-red-500/20",
            text: "Disconnected",
          };
        default:
          return {
            icon: <Wifi className="h-4 w-4" />,
            color: "text-gray-500",
            bgColor: "bg-gray-500/20",
            text: "Unknown",
          };
      }
    };

    const config = getQualityConfig();

    return (
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor} ${config.color}`}
      >
        {config.icon}
        <span className="text-xs font-medium">{config.text}</span>
      </div>
    );
  };

  // Call status header
  const CallStatusHeader = () => (
    <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {formatDuration(callDuration)}
          </span>
        </div>
        <ConnectionQualityIndicator />
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-black/50 backdrop-blur-sm text-white border-0"
        >
          {isHost ? "Host" : "Guest"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="h-8 w-8 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  // Enhanced controls
  const CallControls = () => (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="flex items-center gap-4 p-4 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
        <Button
          onClick={toggleMute}
          size="icon"
          className={`h-12 w-12 rounded-full ${
            isMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-white/20 hover:bg-white/30"
          } text-white`}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        <Button
          onClick={toggleVideo}
          size="icon"
          className={`h-12 w-12 rounded-full ${
            isVideoOff
              ? "bg-red-500 hover:bg-red-600"
              : "bg-white/20 hover:bg-white/30"
          } text-white`}
        >
          {isVideoOff ? (
            <VideoOff className="h-5 w-5" />
          ) : (
            <VideoIcon className="h-5 w-5" />
          )}
        </Button>

        <Button
          onClick={endCall}
          size="icon"
          className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>

        <Button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          size="icon"
          className={`h-12 w-12 rounded-full ${
            !isAudioEnabled
              ? "bg-red-500 hover:bg-red-600"
              : "bg-white/20 hover:bg-white/30"
          } text-white`}
        >
          {!isAudioEnabled ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );

  // Loading states
  if (isRequestingPermissions) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 p-4">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="absolute inset-0 w-20 h-20 bg-primary/20 rounded-full animate-ping mx-auto"></div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Requesting Permissions</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Please allow camera and microphone access when prompted by your
          browser to start the video call.
        </p>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 p-4">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="absolute inset-0 w-20 h-20 bg-primary/20 rounded-full animate-ping mx-auto"></div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Initializing Call...</h3>
        <p className="text-muted-foreground">Setting up your video call</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950/50 dark:to-pink-950/50 p-4">
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <PhoneOff className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
          Connection Error
        </h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {error}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={initializeCall}
            className="bg-primary hover:bg-primary/90"
          >
            Retry Connection
          </Button>
          <Button
            onClick={endCall}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            End Call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-black ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      <CallStatusHeader />

      {/* Video containers */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video - Main view */}
        <video
          ref={setRemoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Remote video loading overlay */}
        {remoteStream && remoteStream.getTracks().length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="text-white text-center">
              {remoteVideoRef.current &&
              remoteVideoRef.current.readyState < 2 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm">Connecting to remote video...</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm">Connected</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local video - Picture in picture */}
        <div className="absolute bottom-24 right-4 w-40 h-28 z-20 bg-gray-900 rounded-xl border-2 border-white/20 shadow-2xl overflow-hidden">
          <video
            ref={setLocalVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Local video loading overlay */}
          {!localStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Local video error overlay */}
          {localStream &&
            localVideoRef.current &&
            localVideoRef.current.readyState < 2 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <div className="text-white text-xs">Loading...</div>
              </div>
            )}

          {/* Local video status indicators */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {isMuted && (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {isVideoOff && (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <VideoOff className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* No remote video placeholder */}
        {(!remoteStream || remoteStream.getTracks().length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-12 w-12 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Waiting for participant
              </h3>
              <p className="text-white/60">
                The other person will appear here when they join
              </p>
            </div>
          </div>
        )}
      </div>

      <CallControls />
    </div>
  );
}
