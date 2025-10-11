import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package } from "lucide-react";

export default function Trending() {
  const { data: trendingProducts, isLoading } = useQuery({
    queryKey: ["trending-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("product_id, product_name, quantity, total_price");

      if (error) throw error;

      const productStats = data.reduce((acc: any, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            total_quantity: 0,
            total_revenue: 0,
            order_count: 0,
          };
        }
        acc[item.product_id].total_quantity += item.quantity;
        acc[item.product_id].total_revenue += item.total_price;
        acc[item.product_id].order_count += 1;
        return acc;
      }, {});

      return Object.values(productStats)
        .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
        .slice(0, 20);
    },
  });

  const { data: totalStats } = useQuery({
    queryKey: ["total-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("quantity, total_price");

      if (error) throw error;

      const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = data.reduce((sum, item) => sum + item.total_price, 0);

      return { totalQuantity, totalRevenue };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trending Products</h1>
          <p className="text-muted-foreground mt-1">Products ranked by sales quantity</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.totalQuantity || 0}</div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStats?.totalRevenue?.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground">From product sales</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg. Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendingProducts?.map((product: any, index: number) => (
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
                    <TableCell className="text-right">{product.order_count}</TableCell>
                    <TableCell className="text-right">₹{product.total_revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      ₹{(product.total_revenue / product.total_quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
