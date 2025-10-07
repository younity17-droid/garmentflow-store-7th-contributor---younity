import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Eye, FileDown, Trash2 } from "lucide-react";
import type { Invoice, InvoiceItem } from "@/types/database";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Invoices() {
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete invoice", variant: "destructive" });
    },
  });

  const viewInvoice = async (invoice: Invoice) => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);
    
    if (error) {
      toast({ title: "Failed to load invoice items", variant: "destructive" });
      return;
    }
    
    setInvoiceItems(data as InvoiceItem[]);
    setViewingInvoice(invoice);
  };

  const exportToPDF = async () => {
    if (!viewingInvoice) return;

    const element = document.getElementById("invoice-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${viewingInvoice.invoice_number}.pdf`);
      
      toast({ title: "PDF exported successfully" });
    } catch (error) {
      toast({ title: "Failed to export PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Invoices</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.customer_name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(invoice.created_at), "PP")}</TableCell>
                  <TableCell>₹{invoice.grand_total}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewInvoice(invoice)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Invoice Details</DialogTitle>
              <Button onClick={exportToPDF} size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div id="invoice-content" className="space-y-6 p-6 bg-background">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">Invoice</h3>
                  <p className="text-muted-foreground">#{viewingInvoice?.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {viewingInvoice && format(new Date(viewingInvoice.created_at), "PP")}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Customer Information</h4>
                <p>{viewingInvoice?.customer_name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">
                  {viewingInvoice?.customer_phone || ""}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Items</h4>
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.size_name || "-"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unit_price}</TableCell>
                          <TableCell className="text-right">₹{item.total_price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{viewingInvoice?.subtotal}</span>
                </div>
                {viewingInvoice?.discount_amount ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>-₹{viewingInvoice.discount_amount}</span>
                  </div>
                ) : null}
                {viewingInvoice?.tax_amount ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({viewingInvoice.tax_percentage}%):
                    </span>
                    <span>₹{viewingInvoice.tax_amount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span>₹{viewingInvoice?.grand_total}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
