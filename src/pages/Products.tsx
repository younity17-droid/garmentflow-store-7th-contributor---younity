import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Search, Upload, X } from "lucide-react";

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [primaryImage, setPrimaryImage] = useState<string>("");
  const [secondaryImage, setSecondaryImage] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      sku: (formData.get("sku") as string) || null,
      price_inr: parseFloat(formData.get("price_inr") as string),
      cost_inr: parseFloat(formData.get("cost_inr") as string) || null,
      quantity_in_stock: parseInt(formData.get("quantity_in_stock") as string),
      category_id: (formData.get("category_id") as string) || null,
      size_ids: selectedSizes.length > 0 ? selectedSizes : null,
      color_ids: selectedColors.length > 0 ? selectedColors : null,
      image_url: primaryImage || null,
      secondary_image_url: secondaryImage || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
    } catch (error) {
      toast({ title: "Failed to save product", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setOpen(false);
    setEditingId(null);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPrimaryImage("");
    setSecondaryImage("");
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted successfully" });
    },
  });

  const editProduct = (product: any) => {
    setEditingId(product.id);
    setSelectedSizes(product.size_ids || []);
    setSelectedColors(product.color_ids || []);
    setPrimaryImage(product.image_url || "");
    setSecondaryImage(product.secondary_image_url || "");
    setOpen(true);
  };

  const toggleSize = (sizeId: string) => {
    setSelectedSizes(prev => 
      prev.includes(sizeId) ? prev.filter(id => id !== sizeId) : [...prev, sizeId]
    );
  };

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev => 
      prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]
    );
  };

  // Filter products based on search
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(v); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input id="name" name="name" defaultValue={editingId ? products?.find(p => p.id === editingId)?.name : ""} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" defaultValue={editingId ? products?.find(p => p.id === editingId)?.sku || "" : ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" defaultValue={editingId ? products?.find(p => p.id === editingId)?.description || "" : ""} />
                </div>

                {/* Product Images */}
                <div className="space-y-4">
                  <Label>Product Images (Up to 2)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryImage" className="text-sm text-muted-foreground">Primary Image URL</Label>
                      <Input
                        id="primaryImage"
                        type="url"
                        placeholder="https://..."
                        value={primaryImage}
                        onChange={(e) => setPrimaryImage(e.target.value)}
                      />
                      {primaryImage && (
                        <div className="relative">
                          <img src={primaryImage} alt="Primary" className="w-full h-32 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => setPrimaryImage("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryImage" className="text-sm text-muted-foreground">Secondary Image URL</Label>
                      <Input
                        id="secondaryImage"
                        type="url"
                        placeholder="https://..."
                        value={secondaryImage}
                        onChange={(e) => setSecondaryImage(e.target.value)}
                      />
                      {secondaryImage && (
                        <div className="relative">
                          <img src={secondaryImage} alt="Secondary" className="w-full h-32 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => setSecondaryImage("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_inr">Price (₹) *</Label>
                    <Input id="price_inr" name="price_inr" type="number" step="0.01" defaultValue={editingId ? products?.find(p => p.id === editingId)?.price_inr : ""} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_inr">Cost (₹)</Label>
                    <Input id="cost_inr" name="cost_inr" type="number" step="0.01" defaultValue={editingId ? products?.find(p => p.id === editingId)?.cost_inr || "" : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_in_stock">Stock *</Label>
                    <Input id="quantity_in_stock" name="quantity_in_stock" type="number" defaultValue={editingId ? products?.find(p => p.id === editingId)?.quantity_in_stock : ""} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select name="category_id" defaultValue={editingId ? products?.find(p => p.id === editingId)?.category_id || "" : ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Available Sizes</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {sizes?.map((size) => (
                      <label key={size.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={selectedSizes.includes(size.id)} onCheckedChange={() => toggleSize(size.id)} />
                        <span>{size.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Available Colors</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {colors?.map((color) => (
                      <label key={color.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={selectedColors.includes(color.id)} onCheckedChange={() => toggleColor(color.id)} />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.hex_code || "#000000" }}
                          />
                          <span>{color.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                </div>
              </form>
            </ScrollArea>
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
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((product) => {
                const category = categories?.find((c) => c.id === product.category_id);
                const productSizes = sizes?.filter(s => product.size_ids?.includes(s.id));
                const productColors = colors?.filter(c => product.color_ids?.includes(c.id));
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>
                    <TableCell>{category?.name || "-"}</TableCell>
                    <TableCell>{productSizes?.map(s => s.name).join(", ") || "-"}</TableCell>
                    <TableCell>
                      {productColors && productColors.length > 0 ? (
                        <div className="flex gap-1">
                          {productColors.map(c => (
                            <div
                              key={c.id}
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: c.hex_code || "#000000" }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>₹{product.price_inr}</TableCell>
                    <TableCell>{product.quantity_in_stock}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => editProduct(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(product.id)}>
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
