"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Phone,
  Globe,
  Key,
  Users,
  Bell,
  Shield,
  Copy,
  Check,
  AlertCircle,
  Mail,
  UserPlus,
  Building2,
  Plus,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { InviteTeamMemberModal } from "@/components/settings/InviteTeamMemberModal";
import { ManageMemberModal } from "@/components/settings/ManageMemberModal";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface TeamMember {
  id: string;
  role: string;
  user: User;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

interface UserData {
  user: User;
  teamMemberships: {
    id: string;
    role: string;
    team: Team;
  }[];
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedVoiceWebhook, setCopiedVoiceWebhook] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"twilio" | "sendgrid" | "webhooks" | "team" | "profile">(
    "twilio"
  );
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fetch current user and team data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery<UserData>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      console.log("User data fetched:", data);
      return data;
    },
  });

  // Debug logging
  useEffect(() => {
    console.log("userData:", userData);
    console.log("userLoading:", userLoading);
    console.log("userError:", userError);
  }, [userData, userLoading, userError]);

  // Redirect removed users to onboarding
  useEffect(() => {
    if (userData && !userLoading) {
      // If user has GUEST role and no team memberships, redirect to onboarding
      if (userData.user.role === "GUEST" && (!userData.teamMemberships || userData.teamMemberships.length === 0)) {
        console.log("User removed from team, redirecting to onboarding");
        router.push("/onboarding");
      }
    }
  }, [userData, userLoading, router]);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
  });

  // Update profile form when user data loads
  useEffect(() => {
    if (userData?.user) {
      setProfileForm((prev) => ({
        ...prev,
        name: userData.user.name || "",
      }));
    }
  }, [userData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; currentPassword?: string; newPassword?: string }) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      
      // If password was changed, show success message
      if (variables.currentPassword && variables.newPassword) {
        setPasswordSuccess("Password updated successfully!");
        setPasswordError("");
        setProfileForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
        }));
        
        // Clear success message after 3 seconds
        setTimeout(() => setPasswordSuccess(""), 3000);
      }
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
      setPasswordSuccess("");
    },
  });

  // Fetch real Twilio configuration
  const [twilioConfig, setTwilioConfig] = useState({
    phoneNumber: "",
    whatsappNumber: "",
    accountSid: "",
    isTrial: false,
    isConfigured: false,
  });

  // Fetch real SendGrid configuration
  const [sendgridConfig, setSendgridConfig] = useState({
    apiKey: "",
    fromEmail: "",
    fromName: "",
    isConfigured: false,
  });

  useEffect(() => {
    // Load environment variables (only NEXT_PUBLIC_ vars are available client-side)
    const phoneNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "";
    const whatsappNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || "";
    const accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || "";

    setTwilioConfig({
      phoneNumber,
      whatsappNumber,
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : "",
      isTrial: false,
      isConfigured: !!(phoneNumber && accountSid),
    });

    // For SendGrid, we need to fetch from API since API keys are server-side only
    fetch("/api/settings/sendgrid")
      .then((res) => res.json())
      .then((data) => {
        setSendgridConfig({
          apiKey: data.apiKey ? `${data.apiKey.substring(0, 8)}...` : "",
          fromEmail: data.fromEmail || "",
          fromName: data.fromName || "Unified Inbox",
          isConfigured: data.isConfigured || false,
        });
      })
      .catch(() => {
        setSendgridConfig({
          apiKey: "",
          fromEmail: "",
          fromName: "",
          isConfigured: false,
        });
      });
  }, []);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/twilio`
      : "";

  const voiceWebhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/twilio-voice`
      : "";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const copyVoiceWebhookUrl = () => {
    navigator.clipboard.writeText(voiceWebhookUrl);
    setCopiedVoiceWebhook(true);
    setTimeout(() => setCopiedVoiceWebhook(false), 2000);
  };

  const testTwilioConnection = async () => {
    setTestingConnection("twilio");
    try {
      const res = await fetch("/api/settings/twilio/test", {
        method: "POST",
      });
      const data = await res.json();
      setTestResults({ ...testResults, twilio: data });
    } catch (error) {
      setTestResults({ ...testResults, twilio: { success: false, message: "Connection failed" } });
    } finally {
      setTestingConnection(null);
    }
  };

  const testSendGridConnection = async () => {
    setTestingConnection("sendgrid");
    try {
      const res = await fetch("/api/settings/sendgrid/test", {
        method: "POST",
      });
      const data = await res.json();
      setTestResults({ ...testResults, sendgrid: data });
    } catch (error) {
      setTestResults({ ...testResults, sendgrid: { success: false, message: "Connection failed" } });
    } finally {
      setTestingConnection(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your integrations and preferences
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 sm:gap-6 mt-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setSelectedTab("twilio")}
            className={`pb-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === "twilio"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Phone className="w-4 h-4 inline mr-2" />
            Twilio
          </button>
          <button
            onClick={() => setSelectedTab("sendgrid")}
            className={`pb-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === "sendgrid"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            SendGrid
          </button>
          <button
            onClick={() => setSelectedTab("webhooks")}
            className={`pb-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === "webhooks"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Webhooks
          </button>
          <button
            onClick={() => setSelectedTab("team")}
            className={`pb-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === "team"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Team
          </button>
          <button
            onClick={() => setSelectedTab("profile")}
            className={`pb-3 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === "profile"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {selectedTab === "twilio" && (
          <div className="max-w-4xl space-y-6">
            {/* Configuration Status */}
            {!twilioConfig.isConfigured && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">Twilio Not Configured</h3>
                    <p className="text-sm text-red-800 mt-1">
                      Please add your Twilio credentials to the .env file to enable SMS and WhatsApp messaging.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Trial Mode Alert */}
            {twilioConfig.isTrial && twilioConfig.isConfigured && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900">Trial Mode Active</h3>
                    <p className="text-sm text-yellow-800 mt-1">
                      Your Twilio account is in trial mode. You can only send messages to verified
                      phone numbers. Upgrade to send to any number.
                    </p>
                    <Button size="sm" className="mt-3" variant="outline">
                      Upgrade Account
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Phone Numbers */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Phone Numbers</h2>

              <div className="space-y-4">
                {/* SMS Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">SMS Number</span>
                      {twilioConfig.isTrial && (
                        <Badge variant="warning">Trial</Badge>
                      )}
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                      {twilioConfig.phoneNumber || "Not configured"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      Account SID: {twilioConfig.accountSid || "Not set"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Configure
                  </Button>
                </div>

                {/* WhatsApp Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-900">WhatsApp Number</span>
                      <Badge className="bg-green-100 text-green-800">Sandbox</Badge>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                      {twilioConfig.whatsappNumber || "Not configured"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Sandbox mode - Send "join [sandbox-keyword]" to activate
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Setup
                  </Button>
                </div>
              </div>

              {/* Buy New Number */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Buy New Number</h3>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search by area code (e.g., 415)"
                    className="flex-1"
                  />
                  <Button>Search Numbers</Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Find and purchase additional phone numbers for your account
                </p>
              </div>
            </Card>

            {/* Verified Numbers (Trial Mode) */}
            {twilioConfig.isTrial && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Verified Numbers (Trial Mode)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  You can only send messages to these verified numbers while in trial mode.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">+1 (555) 123-4567</span>
                    <Badge variant="success">Verified</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  Add Verified Number
                </Button>
              </Card>
            )}

            {/* API Credentials */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">API Credentials</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account SID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={twilioConfig.accountSid}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auth Token
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value="••••••••••••••••"
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                These credentials are stored securely in your environment variables.
              </p>

              {/* Test Connection */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={testTwilioConnection}
                  disabled={!twilioConfig.isConfigured || testingConnection === "twilio"}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {testingConnection === "twilio" ? "Testing..." : "Test Twilio Connection"}
                </Button>
                {testResults.twilio && (
                  <div className={`mt-3 p-3 rounded-lg ${testResults.twilio.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    <p className="text-sm">{testResults.twilio.message}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {selectedTab === "sendgrid" && (
          <div className="max-w-4xl space-y-6">
            {/* Configuration Status */}
            {!sendgridConfig.isConfigured && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">SendGrid Not Configured</h3>
                    <p className="text-sm text-red-800 mt-1">
                      Please add your SendGrid API key to the .env file to enable email messaging.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {sendgridConfig.isConfigured && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">SendGrid Connected</h3>
                    <p className="text-sm text-green-800 mt-1">
                      Your SendGrid account is successfully configured and ready to send emails.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Email Configuration */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h2>

              <div className="space-y-4">
                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={sendgridConfig.apiKey || "Not configured"}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Stored securely in environment variables
                  </p>
                </div>

                {/* From Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Email Address
                  </label>
                  <Input
                    type="email"
                    value={sendgridConfig.fromEmail || "Not configured"}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This email address will appear as the sender
                  </p>
                </div>

                {/* From Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Name
                  </label>
                  <Input
                    type="text"
                    value={sendgridConfig.fromName}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The name displayed to email recipients
                  </p>
                </div>
              </div>
            </Card>

            {/* Setup Instructions */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h2>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Getting Your API Key</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://app.sendgrid.com" target="_blank" className="underline">SendGrid Dashboard</a></li>
                    <li>Navigate to Settings → API Keys</li>
                    <li>Click "Create API Key"</li>
                    <li>Give it a name and select "Full Access"</li>
                    <li>Copy the API key and add to your .env file</li>
                  </ol>
                </div>

                {/* Test Connection */}
                <div>
                  <Button
                    onClick={testSendGridConnection}
                    disabled={!sendgridConfig.isConfigured || testingConnection === "sendgrid"}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {testingConnection === "sendgrid" ? "Testing..." : "Test SendGrid Connection"}
                  </Button>
                  {testResults.sendgrid && (
                    <div className={`mt-3 p-3 rounded-lg ${testResults.sendgrid.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                      <p className="text-sm">{testResults.sendgrid.message}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Environment Variables</h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs sm:text-sm space-y-1 overflow-x-auto">
                    <div>SENDGRID_API_KEY=your_api_key_here</div>
                    <div>SENDGRID_FROM_EMAIL=noreply@yourdomain.com</div>
                    <div>SENDGRID_FROM_NAME=Unified Inbox</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Email Statistics */}
            {sendgridConfig.isConfigured && (
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Statistics</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-500">Sent Today</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0%</div>
                    <div className="text-sm text-gray-500">Open Rate</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">0%</div>
                    <div className="text-sm text-gray-500">Click Rate</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-sm text-gray-500">Bounced</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {selectedTab === "webhooks" && (
          <div className="max-w-4xl space-y-6">
            {/* Messaging Webhook */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Messaging Webhook (SMS/WhatsApp)
              </h2>

              <div className="space-y-6">
                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 font-mono text-xs sm:text-sm"
                    />
                    <Button onClick={copyWebhookUrl} variant="outline" size="sm">
                      {copiedWebhook ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Configure this URL in your Twilio console for incoming messages
                  </p>
                </div>

                {/* Setup Instructions */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to your Twilio Console</li>
                    <li>Navigate to Phone Numbers → Manage → Active Numbers</li>
                    <li>Click on your phone number</li>
                    <li>Under "Messaging", set "A Message Comes In" to the webhook URL above</li>
                    <li>Set HTTP method to POST</li>
                    <li>Click Save</li>
                  </ol>
                </div>
              </div>
            </Card>

            {/* Voice Webhook */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Voice Webhook (Calling)
              </h2>

              <div className="space-y-6">
                {/* Voice Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={voiceWebhookUrl}
                      readOnly
                      className="flex-1 font-mono text-xs sm:text-sm"
                    />
                    <Button onClick={copyVoiceWebhookUrl} variant="outline" size="sm">
                      {copiedVoiceWebhook ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Configure this URL in your Twilio console for call status updates
                  </p>
                </div>

                {/* Setup Instructions */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to your Twilio Console</li>
                    <li>Navigate to Phone Numbers → Manage → Active Numbers</li>
                    <li>Click on your phone number</li>
                    <li>Under "Voice & Fax", set "A Call Comes In" to the voice webhook URL</li>
                    <li>Set HTTP method to POST</li>
                    <li>Click Save</li>
                  </ol>
                </div>
              </div>
            </Card>

            {/* Local Development */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Local Development (localtunnel/ngrok)
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                For local testing, use localtunnel or ngrok to expose your localhost to Twilio webhooks.
              </p>

              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs sm:text-sm space-y-2 overflow-x-auto">
                <div className="text-gray-500"># Using localtunnel</div>
                <div>$ npx localtunnel --port 3000</div>
                <div className="text-gray-500"># Or using ngrok</div>
                <div>$ ngrok http 3000</div>
                <div className="text-gray-500"># Copy the https:// URL and update .env</div>
                <div>NEXT_PUBLIC_APP_URL=https://your-url.loca.lt</div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === "team" && (
          <div className="max-w-4xl space-y-6">
            {/* Current User Role Banner */}
            {userData?.user && (
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Your Role</h3>
                      <p className="text-sm text-gray-600">
                        {userData.teamMemberships && userData.teamMemberships.length > 0
                          ? "Team access level"
                          : "Platform access level"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      (userData.teamMemberships?.[0]?.role || userData.user.role) === "ADMIN"
                        ? "success"
                        : (userData.teamMemberships?.[0]?.role || userData.user.role) === "EDITOR"
                        ? "warning"
                        : "default"
                    }
                    className="text-base px-4 py-1"
                  >
                    {userData.teamMemberships?.[0]?.role || userData.user.role}
                  </Badge>
                </div>
              </Card>
            )}

            {/* Team Info Card */}
            {userData?.teamMemberships && userData.teamMemberships.length > 0 && (
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Information</h2>
                {userData.teamMemberships.map((membership) => (
                  <div key={membership.team.id} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Team Name</label>
                      <p className="text-base text-gray-900 mt-1">{membership.team.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Team ID</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-base text-gray-900 bg-gray-100 px-3 py-1 rounded">
                          {(membership.team as any).slug || membership.team.id.substring(0, 12)}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText((membership.team as any).slug || membership.team.id);
                          }}
                        >
                          Copy
                        </Button>
                        {membership.role === "ADMIN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const newSlug = prompt("Enter new Team ID (lowercase letters, numbers, and hyphens only):", (membership.team as any).slug);
                              if (newSlug && newSlug !== (membership.team as any).slug) {
                                if (!/^[a-z0-9-]+$/.test(newSlug)) {
                                  alert("Team ID can only contain lowercase letters, numbers, and hyphens");
                                  return;
                                }
                                if (newSlug.length < 3 || newSlug.length > 50) {
                                  alert("Team ID must be between 3 and 50 characters");
                                  return;
                                }
                                try {
                                  const res = await fetch("/api/teams", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      teamId: membership.team.id,
                                      slug: newSlug,
                                    }),
                                  });
                                  if (res.ok) {
                                    alert("Team ID updated successfully!");
                                    queryClient.invalidateQueries({ queryKey: ["current-user"] });
                                  } else {
                                    const data = await res.json();
                                    alert(`Error: ${data.error}`);
                                  }
                                } catch (error) {
                                  alert("Failed to update Team ID");
                                }
                              }
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Share this ID with members to join your team</p>
                    </div>
                    {membership.role === "ADMIN" && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Admin Password
                            <span className="text-xs text-gray-500 ml-2">(Full access)</span>
                          </label>
                          <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-100 border rounded text-sm blur-sm hover:blur-none transition-all cursor-pointer select-all">
                              ••••••••
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const newPassword = prompt("Enter new Admin password (min 8 characters):");
                                if (newPassword && newPassword.length >= 8) {
                                  try {
                                    const res = await fetch("/api/teams/password", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        teamId: membership.team.id,
                                        passwordType: "admin",
                                        newPassword,
                                      }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      alert(`Admin password reset successfully!\n\n🔑 Password: ${data.password}\n\nPlease copy this password and share it securely with team admins.`);
                                    } else {
                                      const data = await res.json();
                                      alert(`Error: ${data.error}`);
                                    }
                                  } catch (error) {
                                    alert("Failed to reset password");
                                  }
                                } else if (newPassword) {
                                  alert("Password must be at least 8 characters");
                                }
                              }}
                            >
                              Reset
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Editor Password
                            <span className="text-xs text-gray-500 ml-2">(Can manage content)</span>
                          </label>
                          <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-100 border rounded text-sm blur-sm hover:blur-none transition-all cursor-pointer select-all">
                              ••••••••
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const newPassword = prompt("Enter new Editor password (min 8 characters):");
                                if (newPassword && newPassword.length >= 8) {
                                  try {
                                    const res = await fetch("/api/teams/password", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        teamId: membership.team.id,
                                        passwordType: "editor",
                                        newPassword,
                                      }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      alert(`Editor password reset successfully!\n\n🔑 Password: ${data.password}\n\nPlease copy this password and share it securely with team editors.`);
                                    } else {
                                      const data = await res.json();
                                      alert(`Error: ${data.error}`);
                                    }
                                  } catch (error) {
                                    alert("Failed to reset password");
                                  }
                                } else if (newPassword) {
                                  alert("Password must be at least 8 characters");
                                }
                              }}
                            >
                              Reset
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Viewer Password
                            <span className="text-xs text-gray-500 ml-2">(Read-only)</span>
                          </label>
                          <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-100 border rounded text-sm blur-sm hover:blur-none transition-all cursor-pointer select-all">
                              ••••••••
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const newPassword = prompt("Enter new Viewer password (min 8 characters):");
                                if (newPassword && newPassword.length >= 8) {
                                  try {
                                    const res = await fetch("/api/teams/password", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        teamId: membership.team.id,
                                        passwordType: "viewer",
                                        newPassword,
                                      }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      alert(`Viewer password reset successfully!\n\n🔑 Password: ${data.password}\n\nPlease copy this password and share it securely with team viewers.`);
                                    } else {
                                      const data = await res.json();
                                      alert(`Error: ${data.error}`);
                                    }
                                  } catch (error) {
                                    alert("Failed to reset password");
                                  }
                                } else if (newPassword) {
                                  alert("Password must be at least 8 characters");
                                }
                              }}
                            >
                              Reset
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Share the appropriate password based on desired access level
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </Card>
            )}

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                {(userData?.teamMemberships?.[0]?.role === "ADMIN" || userData?.user.role === "ADMIN") && (
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Invite Member</span>
                    <span className="sm:hidden">Invite</span>
                  </Button>
                )}
              </div>

              {userLoading ? (
                <div className="text-center py-8 text-gray-500">Loading team members...</div>
              ) : userData?.teamMemberships && userData.teamMemberships.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {userData.teamMemberships.map((membership) =>
                    membership.team.members.map((member) => {
                      const initials = member.user.name
                        ? member.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : member.user.email[0].toUpperCase();

                      const isCurrentUser = member.user.id === userData.user.id;

                      return (
                        <button
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg gap-3 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {member.user.image ? (
                              <img
                                src={member.user.image}
                                alt={member.user.name || member.user.email}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                                {member.user.name || "No name set"}
                                {isCurrentUser && (
                                  <Badge variant="default" className="text-xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 truncate">
                                {member.user.email}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={
                              member.role === "ADMIN"
                                ? "success"
                                : member.role === "EDITOR"
                                ? "warning"
                                : "default"
                            }
                            className="whitespace-nowrap"
                          >
                            {member.role}
                          </Badge>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  {userData?.user.role === "GUEST" ? (
                    <>
                      <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Get Started with a Team
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        You need to create or join a team to access contacts, messages, and other features.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                        <Button
                          onClick={() => window.location.href = '/onboarding'}
                          className="gap-2 flex-1"
                        >
                          <Plus className="w-4 h-4" />
                          Create Team
                        </Button>
                        <Button
                          onClick={() => window.location.href = '/onboarding'}
                          variant="outline"
                          className="gap-2 flex-1"
                        >
                          <LogIn className="w-4 h-4" />
                          Join Team
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">No team members yet</p>
                      {(userData?.teamMemberships?.[0]?.role === "ADMIN" || userData?.user.role === "ADMIN") && (
                        <Button
                          onClick={() => setIsInviteModalOpen(true)}
                          variant="outline"
                          className="gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite Your First Member
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles & Permissions</h2>

              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Admin</span>
                    <Badge variant="success">Full Access</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Can manage team, settings, and all contacts/messages
                  </p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Editor</span>
                    <Badge variant="warning">Limited</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Can view and respond to messages, manage contacts
                  </p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Viewer</span>
                    <Badge variant="default">Read-Only</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Can view messages and contacts only
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {selectedTab === "profile" && (
          <div className="max-w-4xl space-y-6">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>

              {userLoading ? (
                <div className="text-center py-8 text-gray-500">Loading profile...</div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (profileForm.name !== userData?.user.name) {
                      updateProfileMutation.mutate({ name: profileForm.name });
                    }
                  }}
                  className="space-y-4"
                >
                  {/* User Role Display */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-900">Account Role</div>
                        <div className="text-xs text-blue-700 mt-1">
                          {userData?.user.role === "ADMIN" && "Full access to all features"}
                          {userData?.user.role === "EDITOR" && "Can manage contacts and messages"}
                          {userData?.user.role === "VIEWER" && "Read-only access"}
                        </div>
                      </div>
                      <Badge
                        variant={
                          userData?.user.role === "ADMIN"
                            ? "success"
                            : userData?.user.role === "EDITOR"
                            ? "warning"
                            : "default"
                        }
                      >
                        {userData?.user.role}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={userData?.user.email || ""}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      updateProfileMutation.isPending ||
                      profileForm.name === userData?.user.name
                    }
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              )}
            </Card>

            {/* Change Password Card */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPasswordError("");
                  setPasswordSuccess("");

                  if (!profileForm.currentPassword || !profileForm.newPassword) {
                    setPasswordError("Both current and new password are required");
                    return;
                  }

                  if (profileForm.newPassword.length < 8) {
                    setPasswordError("New password must be at least 8 characters");
                    return;
                  }

                  updateProfileMutation.mutate({
                    currentPassword: profileForm.currentPassword,
                    newPassword: profileForm.newPassword,
                  });
                }}
                className="space-y-4"
              >
                {passwordError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{passwordSuccess}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password *
                  </label>
                  <Input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <Input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    updateProfileMutation.isPending ||
                    !profileForm.currentPassword ||
                    !profileForm.newPassword
                  }
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">New Messages</div>
                    <div className="text-sm text-gray-500">
                      Get notified when you receive new messages
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">@Mentions</div>
                    <div className="text-sm text-gray-500">
                      Get notified when someone mentions you
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Weekly Reports</div>
                    <div className="text-sm text-gray-500">
                      Receive weekly analytics reports
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteTeamMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={userData?.teamMemberships?.[0]?.team?.id}
      />

      {selectedMember && userData && (
        <ManageMemberModal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
          currentUserId={userData.user.id}
          currentUserRole={userData.user.role}
        />
      )}
    </div>
  );
}
