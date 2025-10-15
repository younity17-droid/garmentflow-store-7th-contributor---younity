import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface InvoiceViewDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceViewDialog({ invoiceId, open, onOpenChange }: InvoiceViewDialogProps) {
  const [whatsappQR, setWhatsappQR] = useState<string>("");
  const [instagramQR, setInstagramQR] = useState<string>("");

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

  useEffect(() => {
    const generateQRCodes = async () => {
      if (storeSettings?.whatsapp_channel) {
        try {
          const qr = await QRCode.toDataURL(storeSettings.whatsapp_channel, { width: 100 });
          setWhatsappQR(qr);
        } catch (err) {
          console.error("WhatsApp QR generation failed", err);
        }
      }
      if (storeSettings?.instagram_page) {
        try {
          const qr = await QRCode.toDataURL(storeSettings.instagram_page, { width: 100 });
          setInstagramQR(qr);
        } catch (err) {
          console.error("Instagram QR generation failed", err);
        }
      }
    };
    if (storeSettings) {
      generateQRCodes();
    }
  }, [storeSettings]);

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

          {/* Social Media QR Codes */}
          {(whatsappQR || instagramQR) && (
            <>
              <Separator />
              <div className="flex justify-between items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {whatsappQR && (
                  <div className="flex-1 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <img src={whatsappQR} alt="WhatsApp" className="w-20 h-20" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{storeSettings?.whatsapp_tagline || "Join our WhatsApp Group"}</p>
                      </div>
                    </div>
                  </div>
                )}
                {instagramQR && (
                  <div className="flex-1 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <img src={instagramQR} alt="Instagram" className="w-20 h-20" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{storeSettings?.instagram_tagline || "Follow us on Instagram"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
