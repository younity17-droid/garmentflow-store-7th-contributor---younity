import { useDate } from '@/contexts/DateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SalesOverview } from '@/components/Dashboard/SalesOverview';
import { ProductSales } from '@/components/Dashboard/ProductSales';
import { LowStockProducts } from '@/components/Dashboard/LowStockProducts';
import { YearlySalesChart } from '@/components/Dashboard/YearlySalesChart';

const Index = () => {
  const { selectedDate, setSelectedDate } = useDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Sales analytics and insights</p>
        </div>

        <div className="flex items-center gap-2">
          <YearlySalesChart />
          <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        </div>
      </div>

      <SalesOverview selectedDate={selectedDate} />

      <div className="grid gap-6 md:grid-cols-2">
        <ProductSales selectedDate={selectedDate} />
        <LowStockProducts />
      </div>
    </div>
  );
};

export default Index;
