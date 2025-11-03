"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    userExists: boolean;
    inviterName?: string;
    teamName?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form fields for new users
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Verify invite token on load
  useEffect(() => {
    const verifyInvite = async () => {
      try {
        const res = await fetch(`/api/invites/verify?token=${token}`);
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Invalid or expired invite");
        }
        
        const data = await res.json();
        setInviteData(data);
      } catch (err: any) {
        setError(err.message || "Failed to verify invite");
      } finally {
        setLoading(false);
      }
    };
    
    verifyInvite();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation for new users
    if (!inviteData?.userExists) {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: inviteData?.userExists ? undefined : name,
          password: inviteData?.userExists ? undefined : password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      setSuccess(true);
      
      // Redirect based on user type
      setTimeout(() => {
        if (inviteData?.userExists) {
          // Existing user - redirect to inbox with full page reload to refresh data
          window.location.href = "/inbox";
        } else {
          // New user - redirect to sign in
          router.push("/auth/signin");
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <Button
            onClick={() => router.push("/auth/signin")}
            className="w-full"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome Aboard! 🎉
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Your account has been set up successfully. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Invited! 🎉
          </h1>
          {inviteData?.inviterName && (
            <p className="text-gray-600">
              <strong>{inviteData.inviterName}</strong> invited you to join
              {inviteData.teamName ? ` ${inviteData.teamName}` : " the team"}
            </p>
          )}
        </div>

        {/* Invite Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              {inviteData?.email}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Role: <strong className="text-gray-900">{inviteData?.role}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAccept} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {inviteData?.userExists ? (
            // Existing user - just accept
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Your account already exists. Click below to join the team!
              </p>
            </div>
          ) : (
            // New user - collect details
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                {inviteData?.userExists ? "Join Team" : "Create Account & Join"}
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By accepting this invitation, you agree to our terms of service
          </p>
        </form>
      </div>
    </div>
  );
}
