"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Shield, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface TeamMember {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  joinedAt: string;
}

interface ManageMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember;
  currentUserId: string;
  currentUserRole: string;
}

export function ManageMemberModal({
  isOpen,
  onClose,
  member,
  currentUserId,
  currentUserRole,
}: ManageMemberModalProps) {
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">(
    member.role as "ADMIN" | "EDITOR" | "VIEWER"
  );
  const [error, setError] = useState("");

  const isCurrentUser = member.user.id === currentUserId;
  const canManage = currentUserRole === "ADMIN" && !isCurrentUser;

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { memberId: string; role: string }) => {
      const res = await fetch(`/api/teams?memberId=${data.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: data.role }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update role");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setError("");
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/teams?memberId=${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove member");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setError("");
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleUpdateRole = () => {
    if (newRole === member.role) {
      onClose();
      return;
    }
    updateRoleMutation.mutate({ memberId: member.id, role: newRole });
  };

  const handleRemoveMember = () => {
    if (
      confirm(
        `Are you sure you want to remove ${member.user.name || member.user.email} from the team?`
      )
    ) {
      removeMemberMutation.mutate(member.id);
    }
  };

  if (!isOpen) return null;

  const initials = member.user.name
    ? member.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : member.user.email[0].toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Manage Team Member
              </h2>
              <p className="text-sm text-gray-500">
                {isCurrentUser ? "Your role" : "Update role or remove member"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Member Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {member.user.image ? (
              <img
                src={member.user.image}
                alt={member.user.name || member.user.email}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {member.user.name || "No name set"}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {member.user.email}
              </div>
            </div>
          </div>

          {isCurrentUser && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                This is your account. You cannot change your own role or remove yourself from the team.
              </p>
            </div>
          )}

          {!canManage && !isCurrentUser && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Only team admins can manage other members.
              </p>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) =>
                setNewRole(e.target.value as "ADMIN" | "EDITOR" | "VIEWER")
              }
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="VIEWER">Viewer - Read-only access</option>
              <option value="EDITOR">Editor - Can manage contacts & messages</option>
              <option value="ADMIN">Admin - Full access</option>
            </select>
          </div>

          {/* Role Description */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              {newRole === "ADMIN" && (
                <>
                  <strong className="text-gray-900">Admin:</strong> Can manage team, settings, and all contacts/messages
                </>
              )}
              {newRole === "EDITOR" && (
                <>
                  <strong className="text-gray-900">Editor:</strong> Can view and respond to messages, manage contacts
                </>
              )}
              {newRole === "VIEWER" && (
                <>
                  <strong className="text-gray-900">Viewer:</strong> Can view messages and contacts only
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
            {canManage && (
              <>
                <Button
                  onClick={handleUpdateRole}
                  disabled={
                    updateRoleMutation.isPending ||
                    removeMemberMutation.isPending ||
                    newRole === member.role
                  }
                  className="w-full"
                >
                  {updateRoleMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Role"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRemoveMember}
                  disabled={
                    updateRoleMutation.isPending || removeMemberMutation.isPending
                  }
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  {removeMemberMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Team
                    </>
                  )}
                </Button>
              </>
            )}

            <Button variant="outline" onClick={onClose} className="w-full">
              {canManage ? "Cancel" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
