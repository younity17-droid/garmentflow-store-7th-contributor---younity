import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceItem {
  productId: string;
  productName: string;
  sizeId?: string;
  sizeName?: string;
  colorId?: string;
  colorName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number | "">("" as any);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'done' | 'pending'>('done');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<Date>();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: sizes } = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sizes").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: colors } = useQuery({
    queryKey: ["colors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colors").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
      if (error) throw error;
      
      // If no settings exist, create default settings
      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { data: newSettings, error: createError } = await supabase
          .from("store_settings")
          .insert({
            store_name: "My Garment Store",
            currency_symbol: "₹",
            tax_percentage: 18,
            low_stock_threshold: 10,
            whatsapp_channel: "",
            instagram_page: "",
            whatsapp_tagline: "Join our WhatsApp Group",
            instagram_tagline: "Follow us on Instagram"
          })
          .select()
          .single();
          
        if (createError) throw createError;
        return newSettings;
      }
      
      return data;
    },
  });

  const { data: productSizePrices } = useQuery({
    queryKey: ["product-size-prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_size_prices").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate items
      if (items.length === 0) {
        throw new Error("At least one item is required");
      }

      // Check if all items are valid
      const invalidItems = items.filter(item => 
        !item.productId || !item.productName || item.quantity <= 0 || item.unitPrice < 0
      );

      if (invalidItems.length > 0) {
        throw new Error("All items must have a valid product, quantity greater than 0, and non-negative price");
      }

      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountValue = discountType === 'percentage'
        ? (subtotal * (Number(discountAmount) || 0)) / 100
        : (Number(discountAmount) || 0);
      const taxAmount = subtotal * ((storeSettings?.tax_percentage || 0) / 100);
      const grandTotal = subtotal + taxAmount - discountValue;

      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          subtotal,
          tax_amount: taxAmount,
          tax_percentage: storeSettings?.tax_percentage || 0,
          discount_amount: discountValue,
          discount_type: discountType,
          grand_total: grandTotal,
          created_by: user.id,
          payment_status: paymentStatus,
          expected_payment_date: paymentStatus === 'pending' && expectedPaymentDate ? format(expectedPaymentDate, 'yyyy-MM-dd') : null,
          invoice_number: ""
        })
        .select()
        .single();

      if (invError) throw invError;

      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.productId,
        product_name: item.productName,
        size_name: item.sizeName || null,
        color_name: item.colorName || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) throw itemsError;

      // Reduce stock for each product
      for (const item of items) {
        if (item.productId) {
          // Get current product stock
          const { data: product, error: productError } = await supabase
            .from("products")
            .select("quantity_in_stock")
            .eq("id", item.productId)
            .single();
          
          if (productError) {
            console.warn(`Failed to get product ${item.productId}:`, productError);
            continue;
          }

          // Reduce stock
          const newStock = Math.max(0, product.quantity_in_stock - item.quantity);
          const { error: updateError } = await supabase
            .from("products")
            .update({ quantity_in_stock: newStock })
            .eq("id", item.productId);
          
          if (updateError) {
            console.warn(`Failed to update stock for product ${item.productId}:`, updateError);
          }
        }
      }

      return invoice;
    },
    onSuccess: () => {
      toast.success("Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // Refresh product stock
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Invoice creation error:", error);
      
      // More detailed error logging
      if (error?.message) {
        console.error("Error message:", error.message);
      }
      if (error?.details) {
        console.error("Error details:", error.details);
      }
      if (error?.hint) {
        console.error("Error hint:", error.hint);
      }
      
      toast.error(`Failed to create invoice: ${error?.message || 'Unknown error'}`);
    },
  });

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setDiscountAmount("" as any);
    setDiscountType('percentage');
    setItems([]);
    setPaymentStatus('done');
    setExpectedPaymentDate(undefined);
  };

  const handleSelectProduct = (product: any) => {
    setItems([{
      productId: product.id,
      productName: product.name,
      sizeId: "",
      sizeName: "",
      colorId: "",
      colorName: "",
      quantity: 1,
      unitPrice: Number(product.price_inr),
      totalPrice: Number(product.price_inr),
    }, ...items]);
  };

  const addItem = () => {
    setItems([{
      productId: "",
      productName: "",
      sizeId: "",
      sizeName: "",
      colorId: "",
      colorName: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }, ...items]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productId") {
      const product = products?.find((p) => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = Number(product.price_inr);
        newItems[index].totalPrice = Number(product.price_inr) * newItems[index].quantity;
      }
    }

    if (field === "sizeId") {
      const size = sizes?.find((s) => s.id === value);
      newItems[index].sizeName = size?.name || "";

      // Update price based on size if size-specific pricing exists
      const sizePrice = productSizePrices?.find(
        (sp) => sp.product_id === newItems[index].productId && sp.size_id === value
      );
      if (sizePrice) {
        newItems[index].unitPrice = Number(sizePrice.price_inr);
        newItems[index].totalPrice = Number(sizePrice.price_inr) * newItems[index].quantity;
      }
    }

    if (field === "colorId") {
      const color = colors?.find((c) => c.id === value);
      newItems[index].colorName = color?.name || "";
    }

    if (field === "quantity" || field === "unitPrice") {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountValue = discountType === 'percentage'
    ? (subtotal * (Number(discountAmount) || 0)) / 100
    : (Number(discountAmount) || 0);
  const taxAmount = subtotal * ((storeSettings?.tax_percentage || 0) / 100);
  const grandTotal = subtotal + taxAmount - discountValue;
  
  // Check if all items are valid
  const hasValidItems = items.length > 0 && items.every(item => 
    item.productId && 
    item.productName && 
    item.quantity > 0 && 
    item.unitPrice >= 0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(v: 'done' | 'pending') => setPaymentStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentStatus === 'pending' && (
                <div>
                  <Label>Expected Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expectedPaymentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expectedPaymentDate ? format(expectedPaymentDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expectedPaymentDate}
                        onSelect={setExpectedPaymentDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4 p-4">
                    {items.map((item, index) => (
                  <div key={index} className="bg-muted/30 border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div>
                          <Label>Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItem(index, "productId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Size</Label>
                          <Select
                            value={item.sizeId}
                            onValueChange={(value) => updateItem(index, "sizeId", value)}
                            disabled={!item.productId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select size (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {sizes
                                ?.filter((size) => {
                                  const product = products?.find((p) => p.id === item.productId);
                                  return product?.size_ids?.includes(size.id);
                                })
                                .map((size) => {
                                  const sizePrice = productSizePrices?.find(
                                    (sp) => sp.product_id === item.productId && sp.size_id === size.id
                                  );
                                  return (
                                    <SelectItem key={size.id} value={size.id}>
                                      {size.name}{sizePrice ? ` - ₹${sizePrice.price_inr}` : ''}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Color</Label>
                          <Select
                            value={item.colorId}
                            onValueChange={(value) => updateItem(index, "colorId", value)}
                            disabled={!item.productId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select color (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {colors
                                ?.filter((color) => {
                                  const product = products?.find((p) => p.id === item.productId);
                                  return product?.color_ids?.includes(color.id);
                                })
                                .map((color) => (
                                  <SelectItem key={color.id} value={color.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded border"
                                        style={{ backgroundColor: color.hex_code || "#000000" }}
                                      />
                                      {color.name}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Math.max(0, Number(e.target.value)))}
                          />
                        </div>

                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Math.max(0, Number(e.target.value)))}
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Total: ₹{item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount:</Label>
                <div className="flex gap-2 items-center">
                  <Select value={discountType} onValueChange={(v: 'fixed' | 'percentage') => setDiscountType(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">₹ Fixed</SelectItem>
                      <SelectItem value="percentage">% Percent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-32"
                    placeholder={discountType === 'percentage' ? '0%' : '₹0'}
                  />
                  {discountType === 'percentage' && discountAmount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      = ₹{discountValue.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Tax ({storeSettings?.tax_percentage}%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createInvoice.mutate()}
            disabled={!hasValidItems || createInvoice.isPending}
          >
            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>

      <ProductSelectionDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelectProduct={handleSelectProduct}
      />
    </Dialog>
  );
}
