import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { startOfDay, endOfDay } from "date-fns";

interface ProductSalesProps {
  selectedDate: Date;
}

export function ProductSales({ selectedDate }: ProductSalesProps) {
  const { data: productSales, isLoading } = useQuery({
    queryKey: ["product-sales", selectedDate],
    queryFn: async () => {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      
      // Get all invoice items for the selected date (only paid invoices)
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("id")
        .eq("payment_status", "done")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (invError) throw invError;
      
      if (!invoices || invoices.length === 0) return [];
      
      const invoiceIds = invoices.map(inv => inv.id);
      
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("product_name, quantity, total_price")
        .in("invoice_id", invoiceIds);
      
      if (itemsError) throw itemsError;
      
      // Aggregate by product
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      
      items?.forEach((item) => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.total_price),
        });
      });
      
      return Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Sales</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : productSales && productSales.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSales.map((product) => (
                <TableRow key={product.name}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right">₹{product.revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No sales data for selected date
          </div>
        )}
      </CardContent>
    </Card>
  );
}
