// Dashboard page with sales analytics

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Receipt, TrendingUp, DollarSign } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  totalProducts: number;
  lowStockCount: number;
}

const Index = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalInvoices: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Fetch invoices for the period
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('grand_total, created_at')
        .gte('created_at', startDate.toISOString());

      if (invoicesError) throw invoicesError;

      // Fetch total products
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Fetch low stock products
      const { count: lowStockCount, error: lowStockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('quantity_in_stock', 10);

      if (lowStockError) throw lowStockError;

      // Calculate stats
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.grand_total), 0) || 0;
      const totalInvoices = invoices?.length || 0;

      setStats({
        totalRevenue,
        totalInvoices,
        totalProducts: productsCount || 0,
        lowStockCount: lowStockCount || 0,
      });

      // Prepare chart data
      const dataByDate: Record<string, number> = {};
      invoices?.forEach((inv) => {
        const date = new Date(inv.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dataByDate[date] = (dataByDate[date] || 0) + Number(inv.grand_total);
      });

      const chartDataArray = Object.entries(dataByDate).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      setChartData(chartDataArray);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalInvoices} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Sales transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              In inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Products ≤ 10 units
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading chart...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">No sales data for this period</div>
            </div>
          ) : (
            <ChartContainer
              config={{
                revenue: {
                  label: 'Revenue',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
