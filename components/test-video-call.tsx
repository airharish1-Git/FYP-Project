"use client";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { VideoCallWrapper } from "./video-call-manager";

export function TestVideoCall() {
  const [isInCall, setIsInCall] = useState(false);
  const [activeCallTourId, setActiveCallTourId] = useState<string | null>(null);

  const startCall = useCallback(() => {
    const mockTourId = `test-tour-${Date.now()}`;
    setActiveCallTourId(mockTourId);
    setIsInCall(true);
  }, []);

  const endCall = useCallback(() => {
    setIsInCall(false);
    setActiveCallTourId(null);
  }, []);

  const handleCallConnected = useCallback(() => {
    console.log("Call connected!");
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Video Call Test</h1>

      {!isInCall ? (
        <Button onClick={startCall} className="mb-4">
          Start Test Call
        </Button>
      ) : (
        <div className="h-96 border rounded-lg overflow-hidden">
          <VideoCallWrapper
            conversationId="test-conversation-123"
            tourId={activeCallTourId!}
            isHost={true}
            onEndCall={endCall}
            onCallConnected={handleCallConnected}
            user={{ id: "test-user-123" }}
          />
        </div>
      )}

      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Test Instructions:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click "Start Test Call" to begin</li>
          <li>Allow camera and microphone permissions when prompted</li>
          <li>The video call interface should appear</li>
          <li>You should see your local video feed</li>
          <li>Use the controls to mute/unmute, turn video on/off</li>
          <li>Click the red phone button to end the call</li>
        </ul>
      </div>
    </div>
  );
}
