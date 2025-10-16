import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
import { startOfDay, startOfMonth, startOfYear, endOfDay } from "date-fns";

interface SalesOverviewProps {
  selectedDate: Date;
}

export function SalesOverview({ selectedDate }: SalesOverviewProps) {
  const { data: todaySales } = useQuery({
    queryKey: ["sales-today", selectedDate],
    queryFn: async () => {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from("invoices")
        .select("grand_total")
        .eq("payment_status", "done")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;
      return data.reduce((sum, inv) => sum + Number(inv.grand_total), 0);
    },
  });

  const { data: monthSales } = useQuery({
    queryKey: ["sales-month", selectedDate],
    queryFn: async () => {
      const start = startOfMonth(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from("invoices")
        .select("grand_total")
        .eq("payment_status", "done")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;
      return data.reduce((sum, inv) => sum + Number(inv.grand_total), 0);
    },
  });

  const { data: yearSales } = useQuery({
    queryKey: ["sales-year", selectedDate],
    queryFn: async () => {
      const start = startOfYear(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from("invoices")
        .select("grand_total")
        .eq("payment_status", "done")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;
      return data.reduce((sum, inv) => sum + Number(inv.grand_total), 0);
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{todaySales?.toFixed(2) || "0.00"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Month Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{monthSales?.toFixed(2) || "0.00"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Year Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{yearSales?.toFixed(2) || "0.00"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
