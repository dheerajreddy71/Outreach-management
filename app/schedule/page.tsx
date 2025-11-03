"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, Send, Trash2, Plus, Filter, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "@/components/ui/Calendar";
import { formatRelativeTime, getChannelColor } from "@/lib/utils";
import type { MessageChannel } from "@/types";

interface ScheduledMessage {
  id: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  channel: MessageChannel;
  content: string;
  scheduledAt: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  createdAt: string;
}

interface CreateScheduledMessageForm {
  contactId: string;
  channel: MessageChannel;
  content: string;
  scheduledAt: string;
}

interface User {
  id: string;
  role: string;
  name: string | null;
  email: string;
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<string>("none");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateContent, setTemplateContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Fetch current user for role-based UI
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const canCreate = userData?.user.role === "ADMIN" || userData?.user.role === "EDITOR";
  const canDelete = userData?.user.role === "ADMIN";

  // Fetch scheduled messages
  const { data, isLoading } = useQuery({
    queryKey: ["scheduled-messages", filterStatus, filterChannel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterChannel !== "all") params.append("channel", filterChannel);

      const res = await fetch(`/api/schedule?${params}`);
      if (!res.ok) throw new Error("Failed to fetch scheduled messages");
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const scheduledMessages: ScheduledMessage[] = data?.scheduled || [];

  // Fetch contacts for dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      return data.contacts || [];
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["templates-list"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      return data.templates || [];
    },
  });

  // Cancel scheduled message mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedule?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
    },
  });

  // Create scheduled message mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateScheduledMessageForm) => {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to schedule message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  // Batch schedule mutation
  const batchMutation = useMutation({
    mutationFn: async (data: {
      contactIds: string[];
      channel: MessageChannel;
      content: string;
      scheduledAt: string;
    }) => {
      const res = await fetch("/api/schedule/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to batch schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      setShowBatchModal(false);
      setSelectedContacts([]);
      resetForm();
    },
  });

  const resetForm = () => {
    setRecurrenceType("none");
    setSelectedTemplate("");
    setTemplateContent("");
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      setTemplateContent(template.content);
    }
  };

  const pendingCount = scheduledMessages.filter((m) => m.status === "PENDING").length;
  const sentCount = scheduledMessages.filter((m) => m.status === "SENT").length;
  const failedCount = scheduledMessages.filter((m) => m.status === "FAILED").length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Scheduled Messages</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and schedule messages for future delivery
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                onClick={() => setViewMode("list")}
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setViewMode("calendar")}
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
              >
                <CalendarDays className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={() => setShowBatchModal(true)}
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-initial text-sm"
              disabled={!canCreate}
              title={!canCreate ? "Only Admins and Editors can schedule messages" : ""}
            >
              <Send className="w-4 h-4" />
              <span>Batch Schedule</span>
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 flex-1 sm:flex-initial text-sm"
              disabled={!canCreate}
              title={!canCreate ? "Only Admins and Editors can schedule messages" : ""}
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Message</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Scheduled</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {scheduledMessages.length}
                </p>
              </div>
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Sent</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{sentCount}</p>
              </div>
              <Send className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Failed</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{failedCount}</p>
              </div>
              <Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Channels</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          </select>
        </div>
      </div>

      {/* Calendar View or List View */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === "calendar" ? (
          <Calendar
            events={scheduledMessages.map(msg => ({
              id: msg.id,
              date: new Date(msg.scheduledAt),
              title: `${msg.channel}: ${msg.content.substring(0, 30)}...`,
              color: msg.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : 
                     msg.status === "SENT" ? "bg-green-100 text-green-800" : 
                     "bg-red-100 text-red-800"
            }))}
            onEventClick={(event) => {
              const message = scheduledMessages.find(m => m.id === event.id);
              if (message) {
                alert(`${message.channel} message to ${message.contact.firstName || ""} ${message.contact.lastName || ""}\n\n${message.content}\n\nScheduled: ${new Date(message.scheduledAt).toLocaleString()}`);
              }
            }}
          />
        ) : (
          <>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : scheduledMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">No scheduled messages</p>
            <p className="text-sm text-gray-500 mt-1">
              Schedule your first message to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledMessages.map((message) => (
              <Card key={message.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {message.contact.firstName} {message.contact.lastName}
                      </span>
                      <Badge className={`${getChannelColor(message.channel)}`}>
                        {message.channel}
                      </Badge>
                      <Badge
                        variant={
                          message.status === "PENDING"
                            ? "warning"
                            : message.status === "SENT"
                            ? "success"
                            : "error"
                        }
                      >
                        {message.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {message.content}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Scheduled: {formatRelativeTime(new Date(message.scheduledAt))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>
                          Created: {formatRelativeTime(new Date(message.createdAt))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {message.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate(message.id)}
                      disabled={cancelMutation.isPending || !canDelete}
                      className="ml-4"
                      title={!canDelete ? "Only Admins can cancel scheduled messages" : ""}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {/* Create Scheduled Message Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                Schedule New Message
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createMutation.mutate({
                    contactId: formData.get("contactId") as string,
                    channel: formData.get("channel") as MessageChannel,
                    content: formData.get("content") as string,
                    scheduledAt: new Date(formData.get("scheduledAt") as string).toISOString(),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No template</option>
                    {templates.map((template: any) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.channel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <select
                    name="contactId"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a contact</option>
                    {contacts.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <select
                    name="channel"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="none">No recurrence</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {recurrenceType !== "none" && (
                    <p className="text-xs text-blue-600 mt-1">
                      This message will repeat {recurrenceType}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="content"
                    required
                    rows={4}
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Type your message or select a template..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createMutation.isPending ? "Scheduling..." : "Schedule Message"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Batch Schedule Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                Batch Schedule Messages
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  batchMutation.mutate({
                    contactIds: selectedContacts,
                    channel: formData.get("channel") as MessageChannel,
                    content: formData.get("content") as string,
                    scheduledAt: new Date(formData.get("scheduledAt") as string).toISOString(),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Contacts ({selectedContacts.length} selected)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {contacts.map((contact: any) => (
                      <label key={contact.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {contact.firstName} {contact.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No template</option>
                    {templates.map((template: any) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.channel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <select
                    name="channel"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="content"
                    required
                    rows={4}
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Type your message or select a template..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be sent to {selectedContacts.length} contacts
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBatchModal(false);
                      setSelectedContacts([]);
                      resetForm();
                    }}
                    disabled={batchMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={batchMutation.isPending || selectedContacts.length === 0}
                    className="w-full sm:w-auto"
                  >
                    {batchMutation.isPending ? "Scheduling..." : `Schedule for ${selectedContacts.length} Contacts`}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
