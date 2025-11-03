"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, MessageSquare, Clock, BarChart3, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "team">("overview");

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const { data: advancedMetrics } = useQuery({
    queryKey: ["analytics-advanced", dateRange, activeTab],
    queryFn: async () => {
      if (activeTab === "overview") return null;
      
      const type = activeTab === "funnel" ? "funnel" : "team";
      const res = await fetch(`/api/analytics/advanced?type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch advanced analytics");
      return res.json();
    },
    enabled: activeTab !== "overview",
  });

  const exportToCSV = () => {
    if (!metrics) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Messages", metrics.channelMetrics?.totalMessages || 0],
      ["Total Contacts", metrics.contactMetrics?.totalContacts || 0],
      ["SMS Messages", metrics.channelMetrics?.sms || 0],
      ["WhatsApp Messages", metrics.channelMetrics?.whatsapp || 0],
      ["Email Messages", metrics.channelMetrics?.email || 0],
      ["Average Response Time (hrs)", metrics.responseMetrics?.avgResponseTime || 0],
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const { channelMetrics, contactMetrics, responseMetrics, messageVolume, messageVolumeByChannel } = metrics || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Track your customer engagement metrics</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Export Button */}
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 w-full sm:w-auto overflow-x-auto">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={dateRange === "7d" ? "default" : "outline"}
                  onClick={() => setDateRange("7d")}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  7 Days
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === "30d" ? "default" : "outline"}
                  onClick={() => setDateRange("30d")}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  30 Days
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === "90d" ? "default" : "outline"}
                  onClick={() => setDateRange("90d")}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  90 Days
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === "1y" ? "default" : "outline"}
                  onClick={() => setDateRange("1y")}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  1 Year
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for different views */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("funnel")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "funnel"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Conversion Funnel
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "team"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Team Performance
            </button>
          </div>
        </div>

        {/* Conversion Funnel View */}
        {activeTab === "funnel" && advancedMetrics?.data && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">Contact Journey</h2>
                <p className="text-sm text-gray-600">Track how contacts progress through your sales funnel</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advancedMetrics.data.map((stage: any, idx: number) => (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                        <div>
                          <h3 className="font-semibold text-gray-900">{stage.stage}</h3>
                          <p className="text-2xl font-bold text-blue-600 mt-1">{stage.contacts}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Conversion Rate</p>
                          <p className="text-xl font-bold text-gray-900">{stage.conversionRate.toFixed(1)}%</p>
                        </div>
                      </div>
                      {idx < advancedMetrics.data.length - 1 && (
                        <div className="flex justify-center my-2">
                          <div className="w-0.5 h-8 bg-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Performance View */}
        {activeTab === "team" && advancedMetrics?.data && (
          <div className="space-y-6">
            {advancedMetrics.data.map((member: any) => (
              <Card key={member.userId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{member.userName}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {member.contactsManaged} contacts
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Messages Sent</p>
                      <p className="text-2xl font-bold text-blue-600">{member.messagesSent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Responses</p>
                      <p className="text-2xl font-bold text-green-600">{member.responsesReceived}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Response Time</p>
                      <p className="text-2xl font-bold text-purple-600">{member.avgResponseTime.toFixed(0)}m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Overview - Default View */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Contacts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {contactMetrics?.totalContacts || 0}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4">
                {contactMetrics?.activeContacts || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">New Contacts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {contactMetrics?.newContactsThisWeek || 0}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {(responseMetrics?.averageResponseTime || 0).toFixed(0)}m
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4">
                Response rate: {(responseMetrics?.responseRate || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {messageVolume?.reduce((sum: number, item: any) => sum + item.count, 0) || 0}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4">Across all channels</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Channel Performance
              </h3>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {channelMetrics && channelMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={channelMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="totalSent" fill="#3B82F6" name="Sent" />
                    <Bar dataKey="totalReceived" fill="#10B981" name="Received" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No channel data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Contact Status Distribution</h3>
            </CardHeader>
            <CardContent>
              {contactMetrics ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Active", value: contactMetrics.activeContacts || 0 },
                        { name: "Inactive", value: (contactMetrics.totalContacts || 0) - (contactMetrics.activeContacts || 0) },
                        { name: "Unsubscribed", value: contactMetrics.unsubscribed || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No contact data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {messageVolume && messageVolume.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Daily Message Volume</h3>
              <p className="text-sm text-gray-500">Trend over selected period</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={messageVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Messages" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </div>
  );
}
