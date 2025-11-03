"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Search, Filter, Archive, UserCheck, X, Star, Clock, CheckCircle } from "lucide-react";
import { MessageThread } from "./MessageThread";
import { MessageComposer } from "./MessageComposer";
import { ContactProfile } from "./ContactProfile";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import type { ContactWithRelations } from "@/types";

interface User {
  id: string;
  role: string;
  name: string | null;
  email: string;
}

export function InboxView() {
  const searchParams = useSearchParams();
  const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [channelFilter, setChannelFilter] = useState<"all" | "sms" | "whatsapp" | "email" | "voice">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "starred" | "archived">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [initialTab, setInitialTab] = useState<"info" | "notes" | "activity">("info");
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user for role-based UI
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const canSendMessages = userData?.user.role === "ADMIN" || userData?.user.role === "EDITOR";

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  let contacts = contactsData?.contacts || [];
  
  // Apply channel filter
  if (channelFilter !== "all") {
    contacts = contacts.filter((c: ContactWithRelations) => {
      if (channelFilter === "sms") return c.phone;
      if (channelFilter === "whatsapp") return c.whatsapp;
      if (channelFilter === "email") return c.email;
      return true;
    });
  }

  // Apply status filter (simplified - would need additional backend support)
  if (statusFilter === "starred") {
    contacts = contacts.filter((c: ContactWithRelations) => 
      c.tags?.includes("starred")
    );
  }

  // Handle URL params for direct navigation from notifications
  useEffect(() => {
    const contactId = searchParams.get("contactId");
    const tab = searchParams.get("tab") as "info" | "notes" | "activity" | null;
    const noteId = searchParams.get("noteId");

    if (contactId && contacts.length > 0) {
      const contact = contacts.find((c: ContactWithRelations) => c.id === contactId);
      if (contact) {
        setSelectedContact(contact);
        const index = contacts.findIndex((c: ContactWithRelations) => c.id === contactId);
        if (index !== -1) setSelectedIndex(index);
        
        // Set initial tab if specified
        if (tab) setInitialTab(tab);
        
        // Set highlighted note if specified
        if (noteId) setHighlightedNoteId(noteId);
      }
    }
  }, [searchParams, contacts]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      ctrl: true,
      description: "New message",
      callback: () => setShowComposer(true),
    },
    {
      key: "/",
      description: "Focus search",
      callback: () => searchInputRef.current?.focus(),
    },
    {
      key: "j",
      description: "Navigate down",
      callback: () => {
        if (selectedIndex < contacts.length - 1) {
          setSelectedIndex(selectedIndex + 1);
          setSelectedContact(contacts[selectedIndex + 1]);
        }
      },
    },
    {
      key: "k",
      description: "Navigate up",
      callback: () => {
        if (selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
          setSelectedContact(contacts[selectedIndex - 1]);
        }
      },
    },
    {
      key: "Escape",
      description: "Close conversation",
      callback: () => setSelectedContact(null),
    },
  ]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      {/* Sidebar - Contact List */}
      <div className={`
        w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col
        ${selectedContact ? 'hidden lg:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search contacts... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          
          {/* Channel Filters */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Channel:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={channelFilter === "all" ? "default" : "outline"}
                    onClick={() => setChannelFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={channelFilter === "sms" ? "default" : "outline"}
                    onClick={() => setChannelFilter("sms")}
                  >
                    SMS
                  </Button>
                  <Button
                    size="sm"
                    variant={channelFilter === "whatsapp" ? "default" : "outline"}
                    onClick={() => setChannelFilter("whatsapp")}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant={channelFilter === "email" ? "default" : "outline"}
                    onClick={() => setChannelFilter("email")}
                  >
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant={channelFilter === "voice" ? "default" : "outline"}
                    onClick={() => setChannelFilter("voice")}
                  >
                    Voice
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Status:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => setStatusFilter("all")}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "unread" ? "default" : "outline"}
                    onClick={() => setStatusFilter("unread")}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Unread
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "starred" ? "default" : "outline"}
                    onClick={() => setStatusFilter("starred")}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Starred
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "archived" ? "default" : "outline"}
                    onClick={() => setStatusFilter("archived")}
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((contact: ContactWithRelations) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                            : contact.email || contact.phone || "Unknown"}
                        </h3>
                      </div>
                      {contact.company && (
                        <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                      )}
                      {contact.messages && contact.messages[0] && (
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {contact.messages[0].content}
                        </p>
                      )}
                    </div>
                    {contact.messages && contact.messages[0] && (
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(contact.messages[0].createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {contact.phone && <Badge variant="default">SMS</Badge>}
                    {contact.whatsapp && <Badge className="bg-green-100 text-green-800">WhatsApp</Badge>}
                    {contact.email && <Badge className="bg-purple-100 text-purple-800">Email</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`
        flex-1 flex flex-col
        ${selectedContact ? 'flex' : 'hidden lg:flex'}
      `}>
        {selectedContact ? (
          <>
            <MessageThread
              contact={selectedContact}
              onCompose={() => setShowComposer(true)}
              onBack={() => setSelectedContact(null)}
              onShowProfile={() => setShowMobileProfile(true)}
              canSendMessages={canSendMessages}
            />
            {showComposer && (
              <MessageComposer
                contact={selectedContact}
                onClose={() => setShowComposer(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 text-sm">
                Choose a contact from the sidebar to view messages
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Profile (Desktop) */}
      {selectedContact && (
        <div className="hidden xl:block w-96 bg-white border-l border-gray-200">
          <ContactProfile 
            contact={selectedContact} 
            initialTab={initialTab}
            highlightedNoteId={highlightedNoteId}
          />
        </div>
      )}

      {/* Mobile Profile Modal */}
      {showMobileProfile && selectedContact && (
        <div className="xl:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Contact Details</h3>
              <button
                onClick={() => setShowMobileProfile(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContactProfile 
                contact={selectedContact} 
                initialTab={initialTab}
                highlightedNoteId={highlightedNoteId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
