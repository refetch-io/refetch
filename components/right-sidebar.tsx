"use client";

// import { BarChart3 } from "lucide-react"
import { useState, useMemo, useEffect } from "react";
import { StatsChart } from "@/components/ui/chart";

// Live View Card Component
function LiveViewCard() {
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real-time visitors from analytics API
  const fetchRealtimeVisitors = async () => {
    try {
      const response = await fetch("/api/plausible/realtime?type=realtime");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setOnlineUsers(data.data);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch real-time visitors:", err);
      setError("Failed to fetch live data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial data and set up polling
  useEffect(() => {
    // Fetch immediately
    fetchRealtimeVisitors();

    // Set up polling every 30 seconds (as per real-time dashboard)
    const interval = setInterval(fetchRealtimeVisitors, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg overflow-hidden min-h-[80px]">
      <div className="px-4 pt-2">
        <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">
          {isLoading ? (
            <div className="w-32 h-8"></div>
          ) : error ? (
            <div className="w-full h-8 flex items-center justify-center">
              <span className="bg-gray-100/80 px-2 py-1 rounded-md text-xs text-gray-600">
                Error loading data
              </span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <span className="text-2xl font-semibold">{onlineUsers}</span>{" "}
              {onlineUsers === 1 ? "refetcher" : "refetchers"} online
            </div>
          )}
        </h3>
      </div>
      <div className="h-px bg-gray-100" />
      <div className="px-4 py-2 text-xs text-gray-600 font-medium h-8">
        {isLoading ? (
          "Connecting to live data..."
        ) : error ? (
          ""
        ) : (
          <span className="flex items-center text-gray-500/85">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5601ff]"></span>
            </span>
            Live •{" "}
            <span className="ml-1 text-gray-500/70">
              Updated a few seconds ago
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard() {
  const [selectedTab, setSelectedTab] = useState("24h");
  const [chartData24h, setChartData24h] = useState<any[]>([]);
  const [chartData30d, setChartData30d] = useState<any[]>([]);
  const [chartData1y, setChartData1y] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data from analytics API
  const fetchChartData = async (dataType: string) => {
    try {
      const response = await fetch(`/api/plausible/realtime?type=${dataType}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.data;
    } catch (err) {
      console.error(`Failed to fetch ${dataType} data:`, err);
      throw new Error("Failed to fetch chart data");
    }
  };

  // Fetch all chart data
  const fetchAllChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data sets in parallel
      const [data24h, data30d, data1y] = await Promise.all([
        fetchChartData("24h"),
        fetchChartData("30d"),
        fetchChartData("1y"),
      ]);

      setChartData24h(data24h);
      setChartData30d(data30d);
      setChartData1y(data1y);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
      setError("Failed to fetch chart data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAllChartData();
  }, []);

  // Transform data for chart display based on selected tab
  const transformedChartData = useMemo(() => {
    if (selectedTab === "24h") {
      const data = chartData24h;

      // Just return the data as-is, let the chart handle the labels
      return data.map((d: any) => ({
        hour:
          d.hour !== undefined ? d.hour : parseInt(d.date?.split(":")[0]) || 0,
        visitors: d.visitors,
      }));
    } else if (selectedTab === "30d") {
      const data = chartData30d;
      return data.map((d: any) => ({
        day: d.day !== undefined ? d.day : parseInt(d.date) || 0,
        visitors: d.visitors,
      }));
    } else if (selectedTab === "1y") {
      const data = chartData1y;
      return data.map((d: any) => ({
        month: d.month,
        visitors: d.visitors,
      }));
    }
    return [];
  }, [selectedTab, chartData24h, chartData30d, chartData1y]);

  // Calculate total visitors for each time period using the actual data
  const totalVisitors24h = useMemo(() => {
    return chartData24h.reduce((sum, d) => sum + d.visitors, 0);
  }, [chartData24h]);

  const totalVisitors30d = useMemo(() => {
    return chartData30d.reduce((sum, d) => sum + d.visitors, 0);
  }, [chartData30d]);

  const totalVisitors1y = useMemo(() => {
    return chartData1y.reduce((sum, d) => sum + d.visitors, 0);
  }, [chartData1y]);

  // Format visitor count for display
  const formatVisitorCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="space-y-1">
      {/* Chart Card */}
      <div className="bg-white rounded-lg px-4 py-2 min-h-[100px]">
        <div className="text-xs text-gray-500/85 font-medium mb-3">
          {selectedTab === "24h"
            ? "Last 24 Hours (Local Time)"
            : selectedTab === "30d"
            ? "Last 30 Days"
            : selectedTab === "1y"
            ? "Last 12 Months"
            : "Last 30 Days"}
        </div>
        {isLoading ? (
          <div className="h-16 rounded animate-pulse"></div>
        ) : error ? (
          <div className="h-16 flex items-center justify-center">
            <div className="bg-gray-100/80 px-2 py-1 rounded-md text-xs text-gray-600">
              {error}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <StatsChart data={transformedChartData} selectedTab={selectedTab} />
          </div>
        )}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => setSelectedTab("24h")}
          className={`flex-1 flex items-center justify-between p-2 rounded-lg h-8 transition-colors ${
            selectedTab === "24h"
              ? "bg-white text-gray-900"
              : "bg-gray-50/50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs leading-4 ${
                selectedTab === "24h" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              24h
            </span>
          </div>
          <span className="text-xs font-semibold">
            {isLoading ? "..." : formatVisitorCount(totalVisitors24h)}
          </span>
        </button>

        <button
          onClick={() => setSelectedTab("30d")}
          className={`flex-1 flex items-center justify-between p-2 rounded-lg h-8 transition-colors ${
            selectedTab === "30d"
              ? "bg-white text-gray-900"
              : "bg-gray-50/50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs leading-4 ${
                selectedTab === "30d" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              30d
            </span>
          </div>
          <span className="text-xs font-semibold">
            {isLoading ? "..." : formatVisitorCount(totalVisitors30d)}
          </span>
        </button>

        <button
          onClick={() => setSelectedTab("1y")}
          className={`flex-1 flex items-center justify-between p-2 rounded-lg h-8 transition-colors ${
            selectedTab === "1y"
              ? "bg-white text-gray-900"
              : "bg-gray-50/50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs leading-4 ${
                selectedTab === "1y" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              1y
            </span>
          </div>
          <span className="text-xs font-semibold">
            {isLoading ? "..." : formatVisitorCount(totalVisitors1y)}
          </span>
        </button>
      </div>
    </div>
  );
}

// Trending Topics Card Component
function TrendingTopicsCard() {
  const trendingTopics = [
    "AI",
    "DataScience",
    "OpenSource",
    "DevOps",
    "MachineLearning",
  ];

  return (
    <div className="bg-white rounded-lg pb-2">
      <h3 className="font-normal text-gray-900 mb-2 px-4 pt-2 font-heading text-sm">
        Trending Now
      </h3>
      {/* Separator between title and first item */}
      <div className="h-px bg-gray-100 my-1" />
      <div className="space-y-0">
        {trendingTopics.map((topic, index) => (
          <div key={topic}>
            <div className="text-sm text-gray-700 py-1 px-4">
              <p># {topic}</p> {/* Added # to the topic */}
            </div>
            {index < trendingTopics.length - 1 && (
              <div className="h-px bg-gray-100 my-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RightSidebar() {
  return (
    <div className="space-y-4">
      {/* Live View Card */}
      <LiveViewCard />

      {/* Chart and Tabs Group */}
      <ChartCard />

      {/* Trending Section */}
      <TrendingTopicsCard />
    </div>
  );
}
