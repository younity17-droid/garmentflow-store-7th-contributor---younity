import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface InvoiceViewDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceViewDialog({ invoiceId, open, onOpenChange }: InvoiceViewDialogProps) {
  const { data: invoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: items } = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Store & Invoice Info */}
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-bold">{storeSettings?.store_name}</h3>
              {storeSettings?.address && <p className="text-sm text-muted-foreground">{storeSettings.address}</p>}
              {storeSettings?.phone && <p className="text-sm text-muted-foreground">Phone: {storeSettings.phone}</p>}
              {storeSettings?.email && <p className="text-sm text-muted-foreground">Email: {storeSettings.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">INVOICE</p>
              <p className="text-sm">#{invoice.invoice_number}</p>
              <p className="text-sm text-muted-foreground">{format(new Date(invoice.created_at), "PPP")}</p>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          {(invoice.customer_name || invoice.customer_phone) && (
            <>
              <div>
                <p className="font-semibold mb-1">Bill To:</p>
                {invoice.customer_name && <p className="text-sm">{invoice.customer_name}</p>}
                {invoice.customer_phone && <p className="text-sm text-muted-foreground">{invoice.customer_phone}</p>}
              </div>
              <Separator />
            </>
          )}

          {/* Items Table */}
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.size_name || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.unit_price}</TableCell>
                    <TableCell className="text-right">₹{item.total_price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount:</span>
                <span>-₹{invoice.discount_amount}</span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Tax ({invoice.tax_percentage}%):</span>
                <span>₹{invoice.tax_amount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total:</span>
              <span>₹{invoice.grand_total}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
