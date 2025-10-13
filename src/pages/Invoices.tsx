import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, Trash2, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { CreateInvoiceDialog } from "@/components/Invoices/CreateInvoiceDialog";
import { InvoiceViewDialog } from "@/components/Invoices/InvoiceViewDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Invoices() {
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const downloadPDF = async (invoiceId: string) => {
    try {
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invError) throw invError;

      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (itemsError) throw itemsError;

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Store Logo (left side)
      if (storeSettings?.logo_url) {
        try {
          const img = new Image();
          img.src = storeSettings.logo_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          pdf.addImage(img, 'PNG', 15, 10, 30, 30);
        } catch (error) {
          console.error('Failed to load logo:', error);
        }
      }
      
      // Store Name (centered at top)
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text(storeSettings?.store_name || "Store", pageWidth / 2, 20, { align: "center" });
      
      // Store details (centered below name)
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      let detailsY = 27;
      if (storeSettings?.address) {
        pdf.text(storeSettings.address, pageWidth / 2, detailsY, { align: "center" });
        detailsY += 5;
      }
      if (storeSettings?.phone || storeSettings?.email) {
        const contactInfo = [storeSettings?.phone, storeSettings?.email].filter(Boolean).join(" | ");
        pdf.text(contactInfo, pageWidth / 2, detailsY, { align: "center" });
      }

      // Invoice details (right side)
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text("INVOICE", pageWidth - 15, 15, { align: "right" });
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`#${invoice.invoice_number}`, pageWidth - 15, 22, { align: "right" });
      pdf.text(`Date: ${format(new Date(invoice.created_at), "PP")}`, pageWidth - 15, 28, { align: "right" });

      // Customer info
      let yPos = 50;
      if (invoice.customer_name) {
        pdf.setFontSize(12);
        pdf.text("Bill To:", 15, yPos);
        pdf.setFontSize(10);
        pdf.text(invoice.customer_name, 15, yPos + 6);
        if (invoice.customer_phone) pdf.text(invoice.customer_phone, 15, yPos + 12);
        yPos += 25;
      } else {
        yPos += 10;
      }

      // Items table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, yPos, pageWidth - 30, 8, "F");
      pdf.setFontSize(10);
      pdf.text("Product", 20, yPos + 5);
      pdf.text("Size", 100, yPos + 5);
      pdf.text("Qty", 130, yPos + 5);
      pdf.text("Price", 150, yPos + 5);
      pdf.text("Total", pageWidth - 25, yPos + 5, { align: "right" });

      // Items
      yPos += 12;
      pdf.setFontSize(9);
      items?.forEach((item) => {
        pdf.text(item.product_name, 20, yPos);
        pdf.text(item.size_name || "-", 100, yPos);
        pdf.text(item.quantity.toString(), 130, yPos);
        pdf.text(item.unit_price.toString(), 150, yPos);
        pdf.text(item.total_price.toString(), pageWidth - 25, yPos, { align: "right" });
        yPos += 6;
      });

      // Totals
      yPos += 10;
      pdf.setFontSize(10);
      pdf.text("Subtotal:", pageWidth - 70, yPos);
      pdf.text(invoice.subtotal.toString(), pageWidth - 25, yPos, { align: "right" });

      if (invoice.discount_amount > 0) {
        yPos += 6;
        pdf.text("Discount:", pageWidth - 70, yPos);
        pdf.text(`-${invoice.discount_amount}`, pageWidth - 25, yPos, { align: "right" });
      }

      if (invoice.tax_amount > 0) {
        yPos += 6;
        pdf.text(`Tax (${invoice.tax_percentage}%):`, pageWidth - 70, yPos);
        pdf.text(invoice.tax_amount.toString(), pageWidth - 25, yPos, { align: "right" });
      }

      yPos += 8;
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Grand Total:", pageWidth - 70, yPos);
      pdf.text(invoice.grand_total.toString(), pageWidth - 25, yPos, { align: "right" });

      pdf.save(`Invoice-${invoice.invoice_number}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    setViewInvoiceId(invoiceId);
    setViewDialogOpen(true);
  };

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceId);
      
      if (itemsError) throw itemsError;

      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDeleteInvoiceId(null);
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete invoice");
    },
  });

  const cancelSale = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Get invoice items to restore stock
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);
      
      if (itemsError) throw itemsError;

      // Restore stock for each item
      for (const item of items || []) {
        if (item.product_id) {
          // Get current product stock
          const { data: product } = await supabase
            .from("products")
            .select("quantity_in_stock")
            .eq("id", item.product_id)
            .single();
          
          if (product) {
            // Restore stock
            await supabase
              .from("products")
              .update({ 
                quantity_in_stock: product.quantity_in_stock + item.quantity 
              })
              .eq("id", item.product_id);
          }
        }
      }

      // Delete invoice items
      const { error: deleteItemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceId);
      
      if (deleteItemsError) throw deleteItemsError;

      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale cancelled and stock restored");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setCancelSaleId(null);
    },
    onError: (error) => {
      console.error("Cancel sale error:", error);
      toast.error("Failed to cancel sale");
    },
  });

  return (
    <div className="space-y-6">
      <InvoiceViewDialog
        invoiceId={viewInvoiceId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[300px]"
            />
          </div>
          <CreateInvoiceDialog />
        </div>
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
              {invoices?.filter((inv) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                const customerMatch = inv.customer_name?.toLowerCase().includes(query);
                const dateMatch = format(new Date(inv.created_at), "PP").toLowerCase().includes(query);
                return customerMatch || dateMatch;
              }).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer_name || "-"}</TableCell>
                  <TableCell>{format(new Date(inv.created_at), "PP")}</TableCell>
                  <TableCell>₹{inv.grand_total}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(inv.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => downloadPDF(inv.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteInvoiceId(inv.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCancelSaleId(inv.id)}>
                      <XCircle className="h-4 w-4 text-orange-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {invoices?.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          No invoices yet. Create your first invoice to get started!
        </p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoiceId && deleteInvoice.mutate(deleteInvoiceId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Sale Confirmation Dialog */}
      <AlertDialog open={!!cancelSaleId} onOpenChange={(open) => !open && setCancelSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the invoice and restore the product stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSaleId && cancelSale.mutate(cancelSaleId)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Cancel Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
