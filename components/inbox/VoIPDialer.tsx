"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface VoIPDialerProps {
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
  };
  onClose: () => void;
}

type CallStatus = "idle" | "connecting" | "ringing" | "in-call" | "ended" | "failed";

export function VoIPDialer({ contact, onClose }: VoIPDialerProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnSpeaker, setIsOnSpeaker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(contact?.phone || "");
  const [error, setError] = useState("");
  
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const callSid = useRef<string | null>(null);

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const initiateCall = async () => {
    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    setStatus("connecting");
    setError("");

    try {
      const yourPhone = prompt("Enter your phone number to receive the call:");
      if (!yourPhone) {
        setStatus("idle");
        return;
      }

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact?.id,
          to: phoneNumber,
          from: yourPhone,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to initiate call");
      }

      const data = await res.json();
      callSid.current = data.callSid;
      
      setStatus("ringing");
      
      // Simulate call progression (in production, use webhooks)
      setTimeout(() => {
        setStatus("in-call");
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Failed to initiate call");
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const endCall = () => {
    setStatus("ended");
    setTimeout(() => {
      setDuration(0);
      onClose();
    }, 2000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In production: device.activeConnection()?.mute(!isMuted)
  };

  const toggleSpeaker = () => {
    setIsOnSpeaker(!isOnSpeaker);
    // In production: Update audio output device
  };

  const handleDigitPress = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
    // In production: device.activeConnection()?.sendDigits(digit)
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {status === "idle" ? "Make a Call" : "Calling"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contact Info */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">
                {contact && contact.firstName && contact.lastName
                  ? `${contact.firstName[0]}${contact.lastName[0]}`
                  : <Phone className="w-8 h-8" />}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown" : "Unknown"}
            </h4>
            <p className="text-sm text-gray-500">{phoneNumber || "Enter number"}</p>
          </div>

          {/* Call Status */}
          <div className="text-center mb-6">
            {status === "idle" && (
              <p className="text-sm text-gray-500">Ready to call</p>
            )}
            {status === "connecting" && (
              <p className="text-sm text-blue-600 animate-pulse">Connecting...</p>
            )}
            {status === "ringing" && (
              <p className="text-sm text-blue-600 animate-pulse">Ringing...</p>
            )}
            {status === "in-call" && (
              <p className="text-2xl font-mono text-green-600">{formatDuration(duration)}</p>
            )}
            {status === "ended" && (
              <p className="text-sm text-gray-600">Call ended</p>
            )}
            {status === "failed" && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Number Input (only in idle state) */}
          {status === "idle" && !contact?.phone && (
            <div className="mb-6">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-4 py-3 text-center text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Dialpad (only in idle or in-call) */}
          {(status === "idle" || status === "in-call") && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigitPress(digit)}
                  className="py-3 text-xl font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={status !== "idle"}
                >
                  {digit}
                </button>
              ))}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex justify-center gap-4">
            {status === "idle" && (
              <Button
                onClick={initiateCall}
                disabled={!phoneNumber}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-5 h-5" />
                Call
              </Button>
            )}

            {(status === "connecting" || status === "ringing" || status === "in-call") && (
              <>
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  className={`p-3 ${isMuted ? "bg-red-50 text-red-600" : ""}`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={endCall}
                  className="p-3 bg-red-600 hover:bg-red-700 rounded-full"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>

                <Button
                  onClick={toggleSpeaker}
                  variant="outline"
                  className={`p-3 ${isOnSpeaker ? "bg-blue-50 text-blue-600" : ""}`}
                >
                  {isOnSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> You will receive a call first on your phone. After you answer, we'll connect you to the contact.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
