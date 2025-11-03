"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, TrendingUp, Filter, ShieldAlert } from "lucide-react";

interface ErrorLog {
  id: string;
  message: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  context?: Record<string, any>;
  resolved: boolean;
  stack?: string;
}

interface ErrorStats {
  total: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  unresolved: number;
}

export default function ErrorLogPage() {
  const router = useRouter();
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Check user role
  const { data: userData, isLoading: isLoadingUser } = useQuery<{ user: { role: string } }>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isLoadingUser && userData?.user.role !== "ADMIN") {
      router.push("/inbox");
    }
  }, [userData, isLoadingUser, router]);

  const { data: stats } = useQuery<ErrorStats>({
    queryKey: ["error-stats"],
    queryFn: async () => {
      const res = await fetch("/api/errors?stats=true");
      if (!res.ok) throw new Error("Failed to fetch error stats");
      return res.json();
    },
  });

  const { data, isLoading } = useQuery<{ errors: ErrorLog[]; total: number }>({
    queryKey: ["errors", selectedSeverity, selectedCategory, showResolved],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSeverity !== "all") params.set("severity", selectedSeverity);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("resolvedOnly", showResolved.toString());
      params.set("limit", "100");

      const res = await fetch(`/api/errors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch errors");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const res = await fetch(`/api/errors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: errorId }),
      });
      if (!res.ok) throw new Error("Failed to resolve error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors"] });
      queryClient.invalidateQueries({ queryKey: ["error-stats"] });
    },
  });

  const errors = data?.errors || [];
  const categories = stats ? Object.keys(stats.byCategory) : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "HIGH":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "MEDIUM":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "LOW":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  // Show loading or unauthorized state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (userData?.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              This page is only accessible to administrators.
            </p>
            <Button onClick={() => router.push("/inbox")}>Go to Inbox</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Error Logs</h1>
        <p className="text-sm sm:text-base text-gray-600">Monitor and manage system errors</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Errors</div>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {stats.bySeverity.CRITICAL || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Critical</div>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {stats.bySeverity.HIGH || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">High</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {stats.bySeverity.MEDIUM || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Medium</div>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {stats.unresolved}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Unresolved</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
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

            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Show Resolved Only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      {isLoading ? (
        <div className="text-center py-12">Loading errors...</div>
      ) : errors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Errors Found</h3>
            <p className="text-gray-600">
              {showResolved
                ? "No resolved errors match your filters"
                : "No unresolved errors match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {errors.map((error) => (
            <Card key={error.id} className={error.resolved ? "opacity-60" : ""}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Severity Icon */}
                  <div className="flex-shrink-0">{getSeverityIcon(error.severity)}</div>

                  {/* Error Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`text-xs ${getSeverityColor(error.severity)}`}>
                        {error.severity}
                      </Badge>
                      <Badge className="text-xs bg-gray-100 text-gray-700 border border-gray-300">
                        {error.category}
                      </Badge>
                      {error.resolved && (
                        <Badge variant="success" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                      {error.message}
                    </h3>

                    {error.context && (
                      <div className="text-xs sm:text-sm text-gray-600 mb-2">
                        <strong>Context:</strong> {JSON.stringify(error.context, null, 2)}
                      </div>
                    )}

                    {expandedError === error.id && error.stack && (
                      <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto mt-2 max-h-60">
                        {error.stack}
                      </pre>
                    )}

                    <div className="flex gap-2 mt-3">
                      {error.stack && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedError(expandedError === error.id ? null : error.id)
                          }
                        >
                          {expandedError === error.id ? "Hide" : "Show"} Stack Trace
                        </Button>
                      )}
                      {!error.resolved && (
                        <Button
                          size="sm"
                          onClick={() => resolveMutation.mutate(error.id)}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
