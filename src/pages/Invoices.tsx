import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { CreateInvoiceDialog } from "@/components/Invoices/CreateInvoiceDialog";
import { InvoiceViewDialog } from "@/components/Invoices/InvoiceViewDialog";

export default function Invoices() {
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

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
      
      // Header
      pdf.setFontSize(20);
      pdf.text(storeSettings?.store_name || "Store", 15, 20);
      pdf.setFontSize(10);
      if (storeSettings?.address) pdf.text(storeSettings.address, 15, 28);
      if (storeSettings?.phone) pdf.text(`Phone: ${storeSettings.phone}`, 15, 34);
      if (storeSettings?.email) pdf.text(`Email: ${storeSettings.email}`, 15, 40);

      // Invoice details
      pdf.setFontSize(16);
      pdf.text("INVOICE", pageWidth - 15, 20, { align: "right" });
      pdf.setFontSize(10);
      pdf.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 15, 28, { align: "right" });
      pdf.text(`Date: ${format(new Date(invoice.created_at), "PP")}`, pageWidth - 15, 34, { align: "right" });

      // Customer info
      let yPos = 55;
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
      items?.forEach((item) => {
        pdf.text(item.product_name, 20, yPos);
        pdf.text(item.size_name || "-", 100, yPos);
        pdf.text(item.quantity.toString(), 130, yPos);
        pdf.text(`₹${item.unit_price}`, 150, yPos);
        pdf.text(`₹${item.total_price}`, pageWidth - 25, yPos, { align: "right" });
        yPos += 6;
      });

      // Totals
      yPos += 10;
      pdf.text("Subtotal:", pageWidth - 70, yPos);
      pdf.text(`₹${invoice.subtotal}`, pageWidth - 25, yPos, { align: "right" });
      
      if (invoice.discount_amount > 0) {
        yPos += 6;
        pdf.text("Discount:", pageWidth - 70, yPos);
        pdf.text(`-₹${invoice.discount_amount}`, pageWidth - 25, yPos, { align: "right" });
      }
      
      if (invoice.tax_amount > 0) {
        yPos += 6;
        pdf.text(`Tax (${invoice.tax_percentage}%):`, pageWidth - 70, yPos);
        pdf.text(`₹${invoice.tax_amount}`, pageWidth - 25, yPos, { align: "right" });
      }
      
      yPos += 8;
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Grand Total:", pageWidth - 70, yPos);
      pdf.text(`₹${invoice.grand_total}`, pageWidth - 25, yPos, { align: "right" });

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

  return (
    <div className="space-y-6">
      <InvoiceViewDialog
        invoiceId={viewInvoiceId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <CreateInvoiceDialog />
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
              {invoices?.map((inv) => (
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
    </div>
  );
}
