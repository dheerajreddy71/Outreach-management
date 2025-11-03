"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Search, Filter, Download, Upload, Mail, Phone, MessageSquare, Edit, Trash2, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PhoneNumberInput } from "@/components/ui/PhoneInput";
import { CSVImportModal } from "@/components/contacts/CSVImportModal";
import { DuplicateWarningModal } from "@/components/contacts/DuplicateWarningModal";
import { formatRelativeTime } from "@/lib/utils";
import type { ContactStatus } from "@/types";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  status: ContactStatus;
  tags?: string[];
  lastContactedAt?: string;
  createdAt: string;
  _count?: {
    messages: number;
    notes: number;
  };
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [pendingContactData, setPendingContactData] = useState<Partial<Contact> | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Bulk operations state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");
  
  // Activity timeline state
  const [showActivityTimeline, setShowActivityTimeline] = useState(false);
  const [selectedContactForActivity, setSelectedContactForActivity] = useState<Contact | null>(null);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    company: "",
    jobTitle: "",
    status: "ACTIVE" as ContactStatus,
    tags: [] as string[],
  });

  // Fetch current user for role check
  const { data: userData } = useQuery<{ user: { role: string } }>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const canCreate = userData?.user.role === "ADMIN" || userData?.user.role === "EDITOR";
  const canEdit = userData?.user.role === "ADMIN" || userData?.user.role === "EDITOR";
  const canDelete = userData?.user.role === "ADMIN";

  // Fetch contacts
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    refetchInterval: 30000,
  });

  let contacts: Contact[] = data?.contacts || [];
  
  // Apply client-side filters
  if (tagFilter) {
    contacts = contacts.filter(c => 
      c.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
    );
  }
  if (companyFilter) {
    contacts = contacts.filter(c => 
      c.company?.toLowerCase().includes(companyFilter.toLowerCase())
    );
  }
  
  const total = contacts.length;

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  // Create/Update contact mutation
  const saveMutation = useMutation({
    mutationFn: async (contactData: Partial<Contact>) => {
      const url = editingContact
        ? `/api/contacts?id=${editingContact.id}`
        : "/api/contacts";
      const method = editingContact ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactData),
      });

      if (!res.ok) throw new Error("Failed to save contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowCreateModal(false);
      setEditingContact(null);
      setPendingContactData(null);
    },
  });

  // Check for duplicates mutation
  const checkDuplicatesMutation = useMutation({
    mutationFn: async (contactData: Partial<Contact>) => {
      const res = await fetch("/api/contacts/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
        }),
      });
      if (!res.ok) throw new Error("Failed to check duplicates");
      return res.json();
    },
    onSuccess: (data, contactData) => {
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates);
        setPendingContactData(contactData);
        setShowDuplicateModal(true);
      } else {
        // No duplicates, proceed with save
        saveMutation.mutate(contactData);
      }
    },
  });

  // Merge contacts mutation
  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, duplicateId }: { primaryId: string; duplicateId?: string }) => {
      const res = await fetch("/api/contacts/duplicates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId,
          duplicateIds: duplicateId ? [duplicateId] : [],
        }),
      });
      if (!res.ok) throw new Error("Failed to merge contacts");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowDuplicateModal(false);
      setShowCreateModal(false);
      setPendingContactData(null);
      setEditingContact(null);
    },
  });

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      whatsapp: contact.whatsapp || "",
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
      status: contact.status,
      tags: contact.tags || [],
    });
    setShowCreateModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      whatsapp: contact.whatsapp || "",
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
      status: contact.status,
      tags: contact.tags || [],
    });
    setShowCreateModal(true);
  };

  const handleSaveContact = (contactData: Partial<Contact>) => {
    // Skip duplicate check for edits
    if (editingContact) {
      saveMutation.mutate(contactData);
    } else {
      // Check for duplicates on new contact creation
      checkDuplicatesMutation.mutate(contactData);
    }
  };

  const handleProceedWithDuplicate = () => {
    if (pendingContactData) {
      saveMutation.mutate(pendingContactData);
      setShowDuplicateModal(false);
    }
  };

  const handleMergeWithExisting = (existingContactId: string) => {
    if (pendingContactData) {
      mergeMutation.mutate({
        primaryId: existingContactId,
        duplicateId: undefined,
      });
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingContact(null);
  };

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedContacts.size} selected contacts?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedContacts).map(id => 
          fetch(`/api/contacts?id=${id}`, { method: "DELETE" })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedContacts(new Set());
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
  };

  const handleBulkStatusUpdate = async (status: ContactStatus) => {
    if (!confirm(`Update ${selectedContacts.size} contacts to ${status}?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedContacts).map(id =>
          fetch(`/api/contacts?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedContacts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error("Bulk update failed:", error);
    }
  };

  const handleBulkAddTags = async () => {
    if (!bulkTagInput.trim()) return;
    
    const newTags = bulkTagInput.split(",").map(t => t.trim()).filter(Boolean);
    if (!newTags.length || !confirm(`Add tags to ${selectedContacts.size} contacts?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedContacts).map(async (id) => {
          const contact = contacts.find(c => c.id === id);
          if (!contact) return;
          
          const updatedTags = [...new Set([...(contact.tags || []), ...newTags])];
          return fetch(`/api/contacts?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: updatedTags }),
          });
        })
      );
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedContacts(new Set());
      setShowBulkTagModal(false);
      setBulkTagInput("");
    } catch (error) {
      console.error("Bulk tag failed:", error);
    }
  };

  const showActivityForContact = (contact: Contact) => {
    setSelectedContactForActivity(contact);
    setShowActivityTimeline(true);
  };

  const handleExportContacts = () => {
    const contactsToExport = selectedContacts.size > 0
      ? contacts.filter(c => selectedContacts.has(c.id))
      : contacts;

    const csv = [
      ["First Name", "Last Name", "Email", "Phone", "WhatsApp", "Company", "Job Title", "Status", "Tags"].join(","),
      ...contactsToExport.map(c => [
        c.firstName,
        c.lastName,
        c.email || "",
        c.phone || "",
        c.whatsapp || "",
        c.company || "",
        c.jobTitle || "",
        c.status,
        c.tags?.join(";") || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = contacts.filter((c) => c.status === "ACTIVE").length;
  const leadCount = contacts.filter((c) => c.status === "LEAD").length;
  const unsubscribedCount = contacts.filter((c) => c.status === "UNSUBSCRIBED").length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage all your customer contacts in one place
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {selectedContacts.size > 0 && canEdit && (
              <>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-sm"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  <Tag className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Actions</span> ({selectedContacts.size})
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm"
                  onClick={handleBulkDelete}
                  disabled={!canDelete}
                  title={!canDelete ? "Only Admins can delete contacts" : ""}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Selected</span>
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              className="flex items-center gap-2 text-sm"
              onClick={() => setShowImportModal(true)}
              disabled={!canCreate}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import CSV</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 text-sm"
              onClick={handleExportContacts}
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export {selectedContacts.size > 0 ? `(${selectedContacts.size})` : "All"}</span>
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-sm"
              disabled={!canCreate}
              title={!canCreate ? "Only Admins and Editors can create contacts" : ""}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Contact</span>
            </Button>
          </div>
        </div>

        {/* Bulk Actions Dropdown */}
        {showBulkActions && selectedContacts.size > 0 && canEdit && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Bulk Actions for {selectedContacts.size} selected contacts:
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-700 mb-2">Update Status:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkStatusUpdate("ACTIVE")}
                  >
                    Mark Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkStatusUpdate("INACTIVE")}
                  >
                    Mark Inactive
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkStatusUpdate("UNSUBSCRIBED")}
                  >
                    Mark Unsubscribed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkStatusUpdate("BLOCKED")}
                  >
                    Mark Blocked
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700 mb-2">Apply Tags:</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkTagModal(true)}
                  className="flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" />
                  Add Tags to Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Tag Modal */}
        {showBulkTagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Tags to {selectedContacts.size} Contacts</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter tags separated by commas. These tags will be added to all selected contacts.
              </p>
              <Input
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                placeholder="e.g., VIP, Newsletter, Q1-2024"
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkTagModal(false);
                    setBulkTagInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkAddTags}>
                  Add Tags
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Contacts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{total}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
              </div>
              <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Leads</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{leadCount}</p>
              </div>
              <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Unsubscribed</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{unsubscribedCount}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLOCKED">Blocked</option>
              <option value="UNSUBSCRIBED">Unsubscribed</option>
            </select>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm"
            >
              <Filter className="w-4 h-4" />
              {showAdvancedFilters ? "Hide" : "More"} Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Tag
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter tag..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Company
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter company..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTagFilter("");
                      setCompanyFilter("");
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">No contacts found</p>
            <p className="text-sm text-gray-500 mt-1">
              Add your first contact to get started
            </p>
          </div>
        ) : (
          <div>
            {/* Select All Checkbox */}
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedContacts.size === contacts.length && contacts.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-600">
                Select All ({contacts.length} contacts)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className={`p-3 sm:p-4 hover:shadow-lg transition-shadow ${
                    selectedContacts.has(contact.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      {contact.company && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{contact.company}</p>
                      )}
                      {contact.jobTitle && (
                        <p className="text-xs text-gray-400 truncate">{contact.jobTitle}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        contact.status === "ACTIVE"
                          ? "success"
                          : contact.status === "UNSUBSCRIBED"
                          ? "error"
                          : "default"
                      }
                      className="text-xs whitespace-nowrap"
                    >
                      {contact.status}
                    </Badge>
                  </div>

                <div className="space-y-2 mb-3 sm:mb-4">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{contact.whatsapp}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-3">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3 h-3" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      title="Email"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="hidden sm:inline">Email</span>
                    </a>
                  )}
                </div>

                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                    {contact.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 sm:px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
                  <div className="flex gap-2 sm:gap-4 text-xs text-gray-500">
                    {contact._count && (
                      <>
                        <span>{contact._count.messages} msg</span>
                        <span>{contact._count.notes} notes</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showActivityForContact(contact)}
                      className="px-2"
                      title="View Activity"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                      className="px-2"
                      disabled={!canEdit}
                      title={!canEdit ? "Only Admins and Editors can edit contacts" : ""}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this contact?")) {
                          deleteMutation.mutate(contact.id);
                        }
                      }}
                      disabled={deleteMutation.isPending || !canDelete}
                      className="px-2"
                      title={!canDelete ? "Only Admins can delete contacts" : ""}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {contact.lastContactedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last contacted {formatRelativeTime(new Date(contact.lastContactedAt))}
                  </p>
                )}
              </Card>
            ))}
            </div>
          </div>
        )}
      </div>      {/* Create/Edit Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formDataFromDom = new FormData(e.currentTarget);
                  const tags = (formDataFromDom.get("tags") as string)
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);

                  handleSaveContact({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    whatsapp: formData.whatsapp || undefined,
                    company: formData.company || undefined,
                    jobTitle: formData.jobTitle || undefined,
                    status: formData.status,
                    tags: tags.length > 0 ? tags : undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone (with country code)
                    </label>
                    <PhoneNumberInput
                      value={formData.phone}
                      onChange={(value) => setFormData({...formData, phone: value || ""})}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp (with country code)
                    </label>
                    <PhoneNumberInput
                      value={formData.whatsapp}
                      onChange={(value) => setFormData({...formData, whatsapp: value || ""})}
                      placeholder="Enter WhatsApp number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <Input 
                      name="company" 
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <Input 
                      name="jobTitle" 
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ContactStatus})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="UNSUBSCRIBED">Unsubscribed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <Input
                    name="tags"
                    placeholder="VIP, Enterprise, Support"
                    defaultValue={editingContact?.tags?.join(", ")}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={saveMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saveMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {saveMutation.isPending
                      ? "Saving..."
                      : editingContact
                      ? "Update Contact"
                      : "Create Contact"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <CSVImportModal
          onClose={() => setShowImportModal(false)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
            setShowImportModal(false);
          }}
        />
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && duplicates.length > 0 && (
        <DuplicateWarningModal
          duplicates={duplicates}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicates([]);
            setPendingContactData(null);
          }}
          onProceed={handleProceedWithDuplicate}
          onMerge={handleMergeWithExisting}
        />
      )}

      {/* Activity Timeline Modal */}
      {showActivityTimeline && selectedContactForActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Activity Timeline
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedContactForActivity.firstName} {selectedContactForActivity.lastName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowActivityTimeline(false);
                    setSelectedContactForActivity(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ActivityTimelineContent contactId={selectedContactForActivity.id} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Activity Timeline Content Component
function ActivityTimelineContent({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["contact-activity", contactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading activity...</p>
      </div>
    );
  }

  const activities = data?.activities || [];

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: any, index: number) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              activity.type === "message" ? "bg-blue-100 text-blue-600" :
              activity.type === "note" ? "bg-yellow-100 text-yellow-600" :
              activity.type === "call" ? "bg-green-100 text-green-600" :
              "bg-gray-100 text-gray-600"
            }`}>
              {activity.type === "message" && <MessageSquare className="w-4 h-4" />}
              {activity.type === "note" && <Edit className="w-4 h-4" />}
              {activity.type === "call" && <Phone className="w-4 h-4" />}
              {activity.type === "email" && <Mail className="w-4 h-4" />}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 my-1"></div>
            )}
          </div>
          
          <div className="flex-1 pb-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-medium text-gray-900 capitalize">{activity.type}</p>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(new Date(activity.createdAt))}
              </p>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{activity.content || activity.description}</p>
            
            {activity.channel && (
              <Badge variant="default" className="text-xs">{activity.channel}</Badge>
            )}
            
            {activity.user && (
              <p className="text-xs text-gray-500 mt-1">By {activity.user.name}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
