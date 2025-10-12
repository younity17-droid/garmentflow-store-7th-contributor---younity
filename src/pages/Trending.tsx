import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export default function Trending() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<Date>(new Date());

  const getTrendingProducts = async (startDate: Date, endDate: Date) => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("product_id, product_name, quantity, total_price, invoices!inner(created_at)")
      .gte("invoices.created_at", startDate.toISOString())
      .lte("invoices.created_at", endDate.toISOString());

    if (error) throw error;

    const productStats = data.reduce((acc: any, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
        };
      }
      acc[item.product_id].total_quantity += item.quantity;
      acc[item.product_id].total_revenue += item.total_price;
      return acc;
    }, {});

    return Object.values(productStats)
      .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
      .slice(0, 20);
  };

  const { data: todayProducts, isLoading: loadingToday } = useQuery({
    queryKey: ["trending-today"],
    queryFn: () => getTrendingProducts(startOfDay(new Date()), endOfDay(new Date())),
  });

  const { data: monthProducts, isLoading: loadingMonth } = useQuery({
    queryKey: ["trending-month", selectedMonth],
    queryFn: () => getTrendingProducts(startOfMonth(selectedMonth), endOfMonth(selectedMonth)),
  });

  const { data: yearProducts, isLoading: loadingYear } = useQuery({
    queryKey: ["trending-year", selectedYear],
    queryFn: () => getTrendingProducts(startOfYear(selectedYear), endOfYear(selectedYear)),
  });

  const renderTable = (products: any[] | undefined, isLoading: boolean) => {
    if (isLoading) return <div className="text-center py-8">Loading...</div>;

    if (!products || products.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No sales data available</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead className="text-right">Units Sold</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Avg. Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product: any, index: number) => (
            <TableRow key={product.product_id}>
              <TableCell>
                <Badge variant={index < 3 ? "default" : "secondary"}>
                  #{index + 1}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{product.product_name}</TableCell>
              <TableCell className="text-right font-semibold">
                {product.total_quantity}
              </TableCell>
              <TableCell className="text-right">₹{product.total_revenue.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                ₹{(product.total_revenue / product.total_quantity).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trending Products</h1>
          <p className="text-muted-foreground mt-1">Products ranked by sales quantity</p>
        </div>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Top Selling Products - {format(new Date(), "PPP")}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(todayProducts, loadingToday)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonth, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products - {format(selectedMonth, "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(monthProducts, loadingMonth)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year" className="space-y-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedYear, "yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedYear}
                  onSelect={(date) => date && setSelectedYear(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products - {format(selectedYear, "yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(yearProducts, loadingYear)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
