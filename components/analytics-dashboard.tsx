"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { MessageSquare, Calendar, DollarSign, Percent } from "lucide-react";

interface Message {
  id: string;
  content: string;
  created_at: string;
  metadata?: {
    type?: string;
    status?: string;
  };
}

interface Conversation {
  id: string;
  property: {
    id: string;
    host_id: string;
  };
  messages: Message[];
}

interface AnalyticsData {
  totalInquiries: number;
  pendingInquiries: number;
  acceptedInquiries: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyBookings: {
    month: string;
    bookings: number;
  }[];
  propertyTypeDistribution: {
    type: string;
    count: number;
  }[];
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user?.id) {
      console.log("No user ID available");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching analytics for user:", user.id);

      // Fetch conversations for host's properties
      const { data: conversationsData, error: conversationsError } =
        await supabase
          .from("conversations")
          .select(
            `
          *,
          property:properties (*),
          messages:messages (*)
        `
          )
          .eq("property.host_id", user.id);

      console.log("Conversations query result:", {
        data: conversationsData,
        error: conversationsError,
        query: `property.host_id = ${user.id}`,
      });

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        throw conversationsError;
      }

      // Calculate inquiry metrics
      const totalInquiries = conversationsData?.length || 0;
      const pendingInquiries =
        conversationsData?.filter((conv: Conversation) =>
          conv.messages?.some(
            (msg: Message) =>
              msg.metadata?.type === "inquiry" &&
              msg.metadata?.status === "pending"
          )
        ).length || 0;
      const acceptedInquiries =
        conversationsData?.filter((conv: Conversation) =>
          conv.messages?.some(
            (msg: Message) =>
              msg.metadata?.type === "inquiry" &&
              msg.metadata?.status === "accepted"
          )
        ).length || 0;

      console.log("Inquiry metrics:", {
        totalInquiries,
        pendingInquiries,
        acceptedInquiries,
        rawData: conversationsData,
      });

      // Fetch bookings for host's properties
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          property:properties (
            price_per_month,
            property_type
          )
        `
        )
        .eq("host_id", user.id);

      console.log("Bookings query result:", {
        data: bookings,
        error: bookingsError,
        query: `host_id = ${user.id}`,
      });

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      // Calculate booking metrics
      const totalBookings = bookings?.length || 0;
      const totalRevenue =
        bookings?.reduce(
          (sum, booking) => sum + (booking.property?.price_per_month || 0),
          0
        ) || 0;

      console.log("Booking metrics:", {
        totalBookings,
        totalRevenue,
        rawData: bookings,
      });

      // Process monthly bookings data
      const monthlyBookings =
        bookings?.reduce((acc, booking) => {
          const month = new Date(booking.created_at).toLocaleString("default", {
            month: "short",
          });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      // Ensure all months are represented
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthlyBookingsData = months.map((month) => ({
        month,
        bookings: monthlyBookings[month] || 0,
      }));

      // Process property type distribution
      const propertyTypeDistribution =
        bookings?.reduce((acc, booking) => {
          const type = booking.property?.property_type || "unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      const propertyTypeData = Object.entries(propertyTypeDistribution).map(
        ([type, count]) => ({
          type: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
          count: count as number,
        })
      );

      const finalData = {
        totalInquiries,
        pendingInquiries,
        acceptedInquiries,
        totalBookings,
        totalRevenue,
        monthlyBookings: monthlyBookingsData,
        propertyTypeDistribution: propertyTypeData,
      };

      console.log("Final analytics data:", finalData);
      setData(finalData);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inquiries
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalInquiries}</div>
            <p className="text-xs text-muted-foreground">
              {data.pendingInquiries} pending, {data.acceptedInquiries} accepted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Total bookings this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-NP", {
                style: "currency",
                currency: "NPR",
                maximumFractionDigits: 0,
              }).format(data.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total revenue this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalInquiries > 0
                ? Math.round((data.totalBookings / data.totalInquiries) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Inquiries to bookings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyBookings}>
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Property Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.propertyTypeDistribution}>
                  <XAxis
                    dataKey="type"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
