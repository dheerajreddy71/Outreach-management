"use client";

import { useState, useEffect, useRef } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface VideoCallDialogProps {
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
  };
  onClose: () => void;
}

type CallStatus = "idle" | "connecting" | "ringing" | "in-call" | "ended" | "failed";

export function VideoCallDialog({ contact, onClose }: VideoCallDialogProps) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState("");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status === "in-call") {
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [status]);

  const initializeCall = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus("in-call");
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // In production, send candidate to signaling server
          console.log("ICE candidate:", event.candidate);
        }
      };

      // Simulate connection (in production, use signaling server)
      setStatus("ringing");
      setTimeout(() => {
        // Simulate answer from remote peer
        setStatus("in-call");
      }, 2000);

    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      setError("Unable to access camera/microphone. Please check permissions.");
      setStatus("failed");
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
  };

  const endCall = () => {
    cleanup();
    setStatus("ended");
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Unknown Contact";

  return (
    <div className={`fixed inset-0 bg-black z-50 flex items-center justify-center ${isFullscreen ? "" : "p-4"}`}>
      <Card className={`bg-gray-900 text-white border-none ${isFullscreen ? "w-full h-full" : "w-full max-w-5xl h-[90vh]"} flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur">
          <div>
            <h3 className="text-lg font-semibold">{contactName}</h3>
            <p className="text-sm text-gray-400">
              {status === "connecting" && "Connecting..."}
              {status === "ringing" && "Ringing..."}
              {status === "in-call" && formatDuration(duration)}
              {status === "ended" && "Call ended"}
              {status === "failed" && "Call failed"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>

        {/* Video area */}
        <div className="flex-1 relative bg-gray-950">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoOff className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-xl max-w-md text-center">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Connecting overlay */}
          {status === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg">Connecting to {contactName}...</p>
              </div>
            </div>
          )}

          {/* Ringing overlay */}
          {status === "ringing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                  <Video className="w-12 h-12" />
                </div>
                <p className="text-lg">Calling {contactName}...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-800/50 backdrop-blur">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? "default" : "outline"}
              size="lg"
              onClick={toggleMute}
              className={`rounded-full w-14 h-14 ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={endCall}
              className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            <Button
              variant={isVideoOff ? "default" : "outline"}
              size="lg"
              onClick={toggleVideo}
              className={`rounded-full w-14 h-14 ${isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            Note: This is a WebRTC demo. In production, integrate with a signaling server.
          </p>
        </div>
      </Card>
    </div>
  );
}
