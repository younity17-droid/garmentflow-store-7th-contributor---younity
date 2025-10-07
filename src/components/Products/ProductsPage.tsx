import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price_inr: number;
  cost_inr: number | null;
  quantity_in_stock: number;
  category_id: string | null;
  size_ids: string[] | null;
  created_at: string;
  updated_at: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Size {
  id: string;
  name: string;
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  sku: z.string().trim().max(120).optional().nullable(),
  price_inr: z.coerce.number().nonnegative(),
  cost_inr: z.coerce.number().nonnegative().optional().nullable(),
  quantity_in_stock: z.coerce.number().int().min(0),
  category_id: z.string().uuid().optional().nullable(),
  size_ids: z.array(z.string().uuid()).optional().nullable(),
});

export function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: sizes } = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sizes")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Size[];
    },
  });

  useEffect(() => {
    if (editingProduct?.size_ids) {
      setSelectedSizeIds(editingProduct.size_ids);
    }
  }, [editingProduct]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const raw = {
      name: formData.get("name"),
      description: (formData.get("description") as string) || null,
      sku: (formData.get("sku") as string) || null,
      price_inr: formData.get("price_inr"),
      cost_inr: formData.get("cost_inr") || null,
      quantity_in_stock: formData.get("quantity_in_stock"),
      category_id: (formData.get("category_id") as string) || null,
      size_ids: selectedSizeIds,
    } as Record<string, unknown>;

    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(parsed.data)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert(parsed.data);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditingProduct(null);
      setSelectedSizeIds([]);
    } catch (error) {
      toast({ title: "Failed to save product", variant: "destructive" });
    }
  };

  const toggleSize = (id: string, checked: boolean) => {
    setSelectedSizeIds((prev) =>
      checked ? [...prev, id] : prev.filter((s) => s !== id),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditingProduct(null); setSelectedSizeIds([]);} setOpen(v); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProduct(null); setSelectedSizeIds([]); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" defaultValue={editingProduct?.sku || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editingProduct?.description || ""} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_inr">Price (₹) *</Label>
                  <Input id="price_inr" name="price_inr" type="number" step="0.01" defaultValue={editingProduct?.price_inr} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_inr">Cost (₹)</Label>
                  <Input id="cost_inr" name="cost_inr" type="number" step="0.01" defaultValue={editingProduct?.cost_inr ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity_in_stock">Stock *</Label>
                  <Input id="quantity_in_stock" name="quantity_in_stock" type="number" defaultValue={editingProduct?.quantity_in_stock} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={editingProduct?.category_id ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Available Sizes</Label>
                <div className="grid grid-cols-3 gap-3">
                  {sizes?.map((s) => {
                    const checked = selectedSizeIds.includes(s.id);
                    return (
                      <label key={s.id} className="inline-flex items-center gap-2">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleSize(s.id, Boolean(v))} />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingProduct ? "Update" : "Create"}</Button>
              </div>
            </form>
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
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => {
                const category = categories?.find((c) => c.id === product.category_id);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{category?.name || "-"}</TableCell>
                    <TableCell>{(product.size_ids || []).length || 0}</TableCell>
                    <TableCell>₹{product.price_inr}</TableCell>
                    <TableCell>{product.quantity_in_stock}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProduct(product);
                          setSelectedSizeIds(product.size_ids || []);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
