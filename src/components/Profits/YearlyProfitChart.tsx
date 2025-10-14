import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface YearlyProfitChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentYear?: number;
}

export const YearlyProfitChart = ({ open, onOpenChange, currentYear = new Date().getFullYear() }: YearlyProfitChartProps) => {
  const [year, setYear] = useState(currentYear);

  const { data: profitData, isLoading } = useQuery({
    queryKey: ['yearly-profit', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('quantity, total_price, products!inner(cost_inr), invoices!inner(created_at)')
        .gte('invoices.created_at', `${year}-01-01`)
        .lt('invoices.created_at', `${year + 1}-01-01`);

      if (error) throw error;

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(year, i).toLocaleString('default', { month: 'short' }),
        profit: 0,
        revenue: 0,
        cost: 0
      }));

      data?.forEach((item: any) => {
        const month = new Date(item.invoices.created_at).getMonth();
        const cost = (item.products?.cost_inr || 0) * item.quantity;
        const revenue = Number(item.total_price);
        const profit = revenue - cost;

        monthlyData[month].profit += profit;
        monthlyData[month].revenue += revenue;
        monthlyData[month].cost += cost;
      });

      return monthlyData;
    },
    enabled: open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Profit Overview - {year}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear(year - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-normal">{year}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear(year + 1)}
                disabled={year >= new Date().getFullYear()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Profit Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading chart...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `₹${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Profit (₹)"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="Revenue (₹)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Cost (₹)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
