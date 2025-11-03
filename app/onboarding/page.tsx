"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, LogIn, Building2, Key, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create Team State
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    passwordAdmin: "",
    passwordEditor: "",
    passwordViewer: "",
    description: "",
  });

  // Join Team State
  const [joinForm, setJoinForm] = useState({
    slug: "",
    password: "",
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      // Redirect to inbox after successful team creation
      router.push("/inbox");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join team");
      }

      // Redirect to inbox after successfully joining
      router.push("/inbox");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = createForm.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 30);
    setCreateForm({ ...createForm, slug });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Customer Outreach Platform!
          </h1>
          <p className="text-gray-600">
            {mode === "choose" && "Get started by creating or joining a team"}
            {mode === "create" && "Create your own team"}
            {mode === "join" && "Join an existing team"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Choose Mode */}
        {mode === "choose" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-500"
              onClick={() => setMode("create")}
            >
              <div className="text-center">
                <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Create New Team
                </h2>
                <p className="text-gray-600 mb-4">
                  Start your own team and invite members to collaborate
                </p>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    Become the team admin
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Invite unlimited members
                  </li>
                  <li className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-600" />
                    Set 3 role-specific passwords
                  </li>
                </ul>
              </div>
            </Card>

            <Card
              className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-purple-500"
              onClick={() => setMode("join")}
            >
              <div className="text-center">
                <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                  <LogIn className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Join Existing Team
                </h2>
                <p className="text-gray-600 mb-4">
                  Enter team ID and password to join your organization
                </p>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Access team resources
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    Collaborate with team
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    Role assigned by password
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        )}

        {/* Create Team Form */}
        {mode === "create" && (
          <Card className="p-8">
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name *
                </label>
                <Input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  onBlur={generateSlug}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team ID *
                  <span className="text-xs text-gray-500 ml-2">
                    (Used for joining team)
                  </span>
                </label>
                <Input
                  type="text"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="acme-corp"
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Members will use this to join your team
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password *
                </label>
                <Input
                  type="password"
                  value={createForm.passwordAdmin}
                  onChange={(e) => setCreateForm({ ...createForm, passwordAdmin: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Share this password with team admins only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Editor Password *
                </label>
                <Input
                  type="password"
                  value={createForm.passwordEditor}
                  onChange={(e) => setCreateForm({ ...createForm, passwordEditor: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Share this password with editors who can manage content
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Viewer Password *
                </label>
                <Input
                  type="password"
                  value={createForm.passwordViewer}
                  onChange={(e) => setCreateForm({ ...createForm, passwordViewer: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Share this password with viewers who have read-only access
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What does your team do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode("choose");
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Join Team Form */}
        {mode === "join" && (
          <Card className="p-8">
            <form onSubmit={handleJoinTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team ID *
                </label>
                <Input
                  type="text"
                  value={joinForm.slug}
                  onChange={(e) => setJoinForm({ ...joinForm, slug: e.target.value })}
                  placeholder="acme-corp"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask your team admin for the team ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Password *
                </label>
                <Input
                  type="password"
                  value={joinForm.password}
                  onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                  placeholder="Enter team password"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your role will be automatically assigned based on the password you enter
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode("choose");
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Joining..." : "Join Team"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
