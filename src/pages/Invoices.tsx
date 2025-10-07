import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Eye, Trash2, FileDown, X, Download } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Product { id: string; name: string; price_inr: number; }
interface Size { id: string; name: string; }
interface Invoice { id: string; invoice_number: string; customer_name: string | null; customer_phone: string | null; subtotal: number; tax_percentage: number; tax_amount: number; discount_amount: number; grand_total: number; created_at: string; }
interface InvoiceItem { id: string; invoice_id: string; product_id: string | null; product_name: string; size_name: string | null; quantity: number; unit_price: number; total_price: number; }
interface StoreSettings { id: string; tax_percentage: number; currency_symbol: string; }

const invoiceSchema = z.object({
  customer_name: z.string().trim().max(120).optional().nullable(),
  customer_phone: z.string().trim().max(32).optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      product_name: z.string().trim().min(1),
      size_name: z.string().trim().max(40).optional().nullable(),
      quantity: z.coerce.number().int().min(1),
      unit_price: z.coerce.number().nonnegative(),
      total_price: z.coerce.number().nonnegative(),
    })
  ).min(1, "Add at least one item"),
});

export default function Invoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data as Invoice[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,price_inr");
      if (error) throw error; return data as Product[];
    },
  });

  const { data: sizes } = useQuery({
    queryKey: ["sizes-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sizes").select("id,name").order("sort_order");
      if (error) throw error; return data as Size[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("id,tax_percentage,currency_symbol").maybeSingle();
      if (error) throw error; return (data || { tax_percentage: 0, currency_symbol: "₹" }) as StoreSettings;
    },
  });

  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [items, setItems] = useState<Array<{ product_id: string; product_name: string; size_name: string | null; quantity: number; unit_price: number; total_price: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const currency = settings?.currency_symbol || "₹";
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.total_price, 0), [items]);
  const taxPct = settings?.tax_percentage || 0;
  const taxAmount = useMemo(() => +(subtotal * (taxPct / 100)).toFixed(2), [subtotal, taxPct]);
  const discount = 0;
  const grand = useMemo(() => +(subtotal + taxAmount - discount).toFixed(2), [subtotal, taxAmount]);

  useEffect(() => {
    setItems((prev) => prev.map((i) => ({ ...i, total_price: +(i.quantity * i.unit_price).toFixed(2) })));
  }, [items.length]);

  const addRow = () => setItems((p) => [...p, { product_id: "", product_name: "", size_name: null, quantity: 1, unit_price: 0, total_price: 0 }]);
  const removeRow = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const setRowProduct = (idx: number, id: string) => {
    const p = products?.find((x) => x.id === id);
    setItems((rows) => rows.map((r, i) => i === idx ? ({ ...r, product_id: id, product_name: p?.name || "", unit_price: p?.price_inr || 0, total_price: +(r.quantity * (p?.price_inr || 0)).toFixed(2) }) : r));
  };

  const setRow = (idx: number, patch: Partial<typeof items[number]>) => {
    setItems((rows) => rows.map((r, i) => i === idx ? ({ ...r, ...patch, total_price: +( (patch.quantity ?? r.quantity) * (patch.unit_price ?? r.unit_price) ).toFixed(2) }) : r));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = invoiceSchema.safeParse({
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      const { data: invNoData, error: invNoErr } = await supabase.rpc("generate_invoice_number");
      if (invNoErr) throw invNoErr;
      const invoice_number = invNoData as string;

      const { data: invInsert, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          subtotal,
          tax_percentage: taxPct,
          tax_amount: taxAmount,
          discount_amount: discount,
          grand_total: grand,
        })
        .select("id, invoice_number")
        .single();
      if (invErr) throw invErr;

      const rows = items.map((i) => ({
        invoice_id: invInsert.id,
        product_id: i.product_id || null,
        product_name: i.product_name,
        size_name: i.size_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }));
      const { error: itemsErr } = await supabase.from("invoice_items").insert(rows);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      setOpenCreate(false);
      setItems([]); setCustomerName(""); setCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<InvoiceItem[]>([]);

  const viewInvoice = async (invoice: Invoice) => {
    const { data, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    if (!error) { setViewing(invoice); setViewItems(data as InvoiceItem[]); }
  };

  const exportPDF = async () => {
    const el = document.getElementById("invoice-print");
    if (!el || !viewing) return;
    const canvas = await html2canvas(el);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p","mm","a4");
    const w = 210; const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`invoice-${viewing.invoice_number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button onClick={() => { setItems([]); addRow(); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="cname">Customer Name</Label>
                <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Customer Phone</Label>
                <Input id="cphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Items</h3>
                <Button type="button" size="sm" onClick={addRow}><Plus className="mr-2 h-4 w-4"/>Add item</Button>
              </div>
              <ScrollArea className="max-h-[300px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <select className="w-full border rounded px-2 py-2 bg-background" value={row.product_id} onChange={(e) => setRowProduct(idx, e.target.value)}>
                            <option value="">Select product</option>
                            {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select className="w-full border rounded px-2 py-2 bg-background" value={row.size_name ?? ""} onChange={(e) => setRow(idx, { size_name: e.target.value || null })}>
                            <option value="">-</option>
                            {sizes?.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={1} value={row.quantity} onChange={(e) => setRow(idx, { quantity: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} step="0.01" value={row.unit_price} onChange={(e) => setRow(idx, { unit_price: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>{currency}{row.total_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{currency}{subtotal.toFixed(2)}</span></div>
              {taxPct ? (<div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxPct}%):</span><span>{currency}{taxAmount.toFixed(2)}</span></div>) : null}
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Grand Total:</span><span>{currency}{grand.toFixed(2)}</span></div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!items.length}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <TableCell>{currency}{inv.grand_total}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => viewInvoice(inv)}><Eye className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { setViewing(inv); const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id); setViewItems((data || []) as InvoiceItem[]); setTimeout(exportPDF, 100); }}><Download className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("invoices").delete().eq("id", inv.id); queryClient.invalidateQueries({ queryKey: ["invoices"] }); }}><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Invoice Details</DialogTitle>
              <Button size="sm" onClick={exportPDF}><FileDown className="mr-2 h-4 w-4"/>Export PDF</Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div id="invoice-print" className="space-y-6 p-6 bg-background">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">Invoice</h3>
                  <p className="text-muted-foreground">#{viewing?.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{viewing && format(new Date(viewing.created_at), "PP")}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Customer Information</h4>
                <p>{viewing?.customer_name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{viewing?.customer_phone || ""}</p>
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
                      {viewItems.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.product_name}</TableCell>
                          <TableCell>{it.size_name || "-"}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{currency}{it.unit_price}</TableCell>
                          <TableCell className="text-right">{currency}{it.total_price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{currency}{viewing?.subtotal.toFixed(2)}</span></div>
                {viewing?.tax_amount ? (<div className="flex justify-between"><span className="text-muted-foreground">Tax ({viewing.tax_percentage}%):</span><span>{currency}{viewing.tax_amount.toFixed(2)}</span></div>) : null}
                {viewing?.discount_amount ? (<div className="flex justify-between"><span className="text-muted-foreground">Discount:</span><span>-{currency}{viewing.discount_amount.toFixed(2)}</span></div>) : null}
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Grand Total:</span><span>{currency}{viewing?.grand_total.toFixed(2)}</span></div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
