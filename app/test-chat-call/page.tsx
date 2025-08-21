"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoCallWrapper } from "@/components/video-call-manager";
import { Phone, PhoneOff } from "lucide-react";

export default function TestChatCallPage() {
  const [isInCall, setIsInCall] = useState(false);
  const [activeCallTourId, setActiveCallTourId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"host" | "buyer">("host");
  const [isCallInitiator, setIsCallInitiator] = useState(true);

  const startCall = () => {
    const mockTourId = `chat-call-${Date.now()}`;
    setActiveCallTourId(mockTourId);
    setIsInCall(true);
    setIsCallInitiator(true); // The person who starts the call is the initiator
  };

  const acceptCall = () => {
    const mockTourId = `chat-call-${Date.now()}`;
    setActiveCallTourId(mockTourId);
    setIsInCall(true);
    setIsCallInitiator(false); // The person who accepts the call is NOT the initiator
  };

  const endCall = () => {
    setIsInCall(false);
    setActiveCallTourId(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Chat Video Call Test
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* User Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle>User Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={userRole === "host" ? "default" : "outline"}
                  onClick={() => setUserRole("host")}
                >
                  Host
                </Button>
                <Button
                  variant={userRole === "buyer" ? "default" : "outline"}
                  onClick={() => setUserRole("buyer")}
                >
                  Buyer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Call Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Call Controls</CardTitle>
            </CardHeader>
            <CardContent>
              {!isInCall ? (
                <div className="space-y-2">
                  <Button onClick={startCall} className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Start Video Call (Initiator)
                  </Button>
                  <Button
                    onClick={acceptCall}
                    variant="outline"
                    className="w-full"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Accept Video Call (Receiver)
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={endCall}
                  variant="destructive"
                  className="w-full"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Video Call Interface */}
        {isInCall && activeCallTourId && (
          <Card className="h-96">
            <CardHeader>
              <CardTitle>
                Video Call - {isCallInitiator ? "Initiator" : "Receiver"} (
                {userRole === "host" ? "Host" : "Buyer"})
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full p-0">
              <VideoCallWrapper
                conversationId="test-conversation-123"
                tourId={activeCallTourId}
                isHost={isCallInitiator}
                onEndCall={endCall}
                onCallConnected={() => console.log("Call connected!")}
                user={{ id: `test-user-${userRole}` }}
              />
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Select User Role</h3>
                <p className="text-sm text-muted-foreground">
                  Choose whether you want to test as a host or buyer. This
                  simulates different user roles in the chat interface.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Start Video Call</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Start Video Call" to initiate a peer-to-peer video
                  call. This will open the video call interface with camera and
                  microphone permissions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Test Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Allow camera and microphone permissions when prompted
                  </li>
                  <li>• Test mute/unmute functionality</li>
                  <li>• Test video on/off functionality</li>
                  <li>• Test call end functionality</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  4. Real-time Communication
                </h3>
                <p className="text-sm text-muted-foreground">
                  The video call uses WebRTC for peer-to-peer communication,
                  just like in the actual chat interface. This demonstrates the
                  core functionality that will be integrated into the messages
                  page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
