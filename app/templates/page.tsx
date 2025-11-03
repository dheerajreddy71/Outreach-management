"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  content: string;
  variables: string[];
  isActive: boolean;
  category?: string;
  createdAt: string;
}

interface User {
  id: string;
  role: string;
  name: string | null;
  email: string;
}

export default function TemplatesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState({
    firstName: "John",
    lastName: "Doe",
    company: "Acme Inc",
  });
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    channel: "SMS",
    content: "",
    category: "",
  });

  const queryClient = useQueryClient();

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

  const { data, isLoading } = useQuery({
    queryKey: ["templates", filterChannel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterChannel !== "ALL") {
        params.set("channel", filterChannel);
      }
      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof formData) => {
      // Extract variables from content ({{variableName}})
      const variables = Array.from(
        template.content.matchAll(/\{\{(\w+)\}\}/g)
      ).map((match) => match[1]);

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template,
          variables,
        }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreateModal(false);
      setFormData({ name: "", channel: "SMS", content: "", category: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const templates: MessageTemplate[] = data?.templates || [];

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === "all" || t.category === selectedCategory)
  );

  const categories = Array.from(new Set(templates.map((t) => t.category).filter(Boolean))) as string[];

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handlePreview = (template: MessageTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const renderPreview = () => {
    if (!previewTemplate) return "";
    
    let preview = previewTemplate.content;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });
    
    return preview;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Create reusable message templates with variables
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)} 
          className="w-full sm:w-auto"
          disabled={!canCreate}
          title={!canCreate ? "Only Admins and Editors can create templates" : ""}
        >
          + Create Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{templates.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {templates.filter((t) => t.channel === "SMS").length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">SMS Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {templates.filter((t) => t.channel === "WHATSAPP").length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">WhatsApp Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {templates.filter((t) => t.channel === "EMAIL").length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Email Templates</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Channels</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first template to speed up messaging
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold truncate">{template.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge className="text-xs">
                        {template.channel}
                      </Badge>
                      {template.category && (
                        <Badge className="text-xs bg-gray-100 text-gray-700 border border-gray-300">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm text-gray-700 break-words">
                  {template.content.length > 150
                    ? template.content.substring(0, 150) + "..."
                    : template.content}
                </div>

                {template.variables.length > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Variables:
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {template.variables.map((v) => (
                        <Badge key={v} className="text-xs">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyTemplate(template.content)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                    className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                    disabled={!canDelete}
                    title={!canDelete ? "Only Admins can delete templates" : ""}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <h2 className="text-lg sm:text-xl font-semibold">Create New Template</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <Input
                    required
                    placeholder="e.g., Welcome Message"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) =>
                      setFormData({ ...formData, channel: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Welcome, Follow-up, Support"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Hi {{firstName}}, welcome to {{company}}!"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {`{{variableName}}`} for dynamic variables
                  </p>
                </div>

                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">
                    💡 Available Variables
                  </h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <div>• {`{{firstName}}`} - Contact first name</div>
                    <div>• {`{{lastName}}`} - Contact last name</div>
                    <div>• {`{{company}}`} - Company name</div>
                    <div>• {`{{email}}`} - Email address</div>
                    <div>• {`{{phone}}`} - Phone number</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Template Preview
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{previewTemplate.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview Data (Edit to test):
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="First Name"
                      value={previewData.firstName}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, firstName: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Last Name"
                      value={previewData.lastName}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, lastName: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Company"
                      value={previewData.company}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, company: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Preview:
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-32">
                    <p className="text-gray-900 whitespace-pre-wrap">{renderPreview()}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Channel: <Badge className="ml-2">{previewTemplate.channel}</Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    copyTemplate(renderPreview());
                    setShowPreviewModal(false);
                  }}
                >
                  Copy Preview
                </Button>
                <Button onClick={() => setShowPreviewModal(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
