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
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [primaryImage, setPrimaryImage] = useState<string>("");
  const [secondaryImage, setSecondaryImage] = useState<string>("");
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [secondaryImageFile, setSecondaryImageFile] = useState<File | null>(null);
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingSecondary, setIsUploadingSecondary] = useState(false);
  const [sizePrices, setSizePrices] = useState<Record<string, string>>({});
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

  const { data: productSizePrices } = useQuery({
    queryKey: ["product-size-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_size_prices")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: editingProductSizePrices } = useQuery({
    queryKey: ["editing-product-size-prices", editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase
        .from("product_size_prices")
        .select("*")
        .eq("product_id", editingId);
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let finalPrimaryImage = primaryImage;
    let finalSecondaryImage = secondaryImage;

    try {
      if (primaryImageFile) {
        setIsUploadingPrimary(true);
        finalPrimaryImage = await uploadImage(primaryImageFile);
      }
      if (secondaryImageFile) {
        setIsUploadingSecondary(true);
        finalSecondaryImage = await uploadImage(secondaryImageFile);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ title: 'Failed to upload images', variant: 'destructive' });
      setIsUploadingPrimary(false);
      setIsUploadingSecondary(false);
      return;
    } finally {
      setIsUploadingPrimary(false);
      setIsUploadingSecondary(false);
    }
    
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
      image_url: finalPrimaryImage || null,
      secondary_image_url: finalSecondaryImage || null,
    };

    try {
      let productId = editingId;

      if (editingId) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Save size-based prices
      if (productId && selectedSizes.length > 0) {
        // Delete existing size prices
        await supabase.from("product_size_prices").delete().eq("product_id", productId);

        // Insert new size prices
        const sizePriceData = selectedSizes
          .map((sizeId) => {
            const price = sizePrices[sizeId];
            if (!price) return null;
            return {
              product_id: productId,
              size_id: sizeId,
              price_inr: parseFloat(price),
            };
          })
          .filter(Boolean);

        if (sizePriceData.length > 0) {
          const { error: priceError } = await supabase
            .from("product_size_prices")
            .insert(sizePriceData);
          if (priceError) throw priceError;
        }
      }

      toast({ title: editingId ? "Product updated successfully" : "Product created successfully" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-size-prices"] });
      resetForm();
    } catch (error) {
      console.error("Save product error:", error);
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
    setPrimaryImageFile(null);
    setSecondaryImageFile(null);
    setSizePrices({});
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

  const editProduct = async (product: any) => {
    setEditingId(product.id);
    setSelectedSizes(product.size_ids || []);
    setSelectedColors(product.color_ids || []);
    setPrimaryImage(product.image_url || "");
    setSecondaryImage(product.secondary_image_url || "");

    // Load size prices
    const { data: prices } = await supabase
      .from("product_size_prices")
      .select("*")
      .eq("product_id", product.id);

    const priceMap: Record<string, string> = {};
    prices?.forEach((p) => {
      priceMap[p.size_id] = p.price_inr.toString();
    });
    setSizePrices(priceMap);

    setOpen(true);
  };

  const toggleSize = (sizeId: string) => {
    setSelectedSizes(prev => {
      const newSizes = prev.includes(sizeId) 
        ? prev.filter(id => id !== sizeId) 
        : [...prev, sizeId];
      
      // Remove price if size is deselected
      if (!newSizes.includes(sizeId)) {
        setSizePrices(prevPrices => {
          const { [sizeId]: _, ...rest } = prevPrices;
          return rest;
        });
      }
      
      return newSizes;
    });
  };

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev => 
      prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]
    );
  };

  // Filter products based on search
  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

                <div className="space-y-4">
                  <Label>Product Images (Up to 2)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryImageFile" className="text-sm text-muted-foreground">Primary Image</Label>
                      <Input
                        id="primaryImageFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPrimaryImageFile(file);
                            setPrimaryImage(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {primaryImage && (
                        <div className="relative">
                          <img src={primaryImage} alt="Primary" className="w-full h-32 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => {
                              setPrimaryImage("");
                              setPrimaryImageFile(null);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryImageFile" className="text-sm text-muted-foreground">Secondary Image</Label>
                      <Input
                        id="secondaryImageFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSecondaryImageFile(file);
                            setSecondaryImage(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {secondaryImage && (
                        <div className="relative">
                          <img src={secondaryImage} alt="Secondary" className="w-full h-32 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => {
                              setSecondaryImage("");
                              setSecondaryImageFile(null);
                            }}
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
                    <Input id="price_inr" name="price_inr" type="number" step="0.01" min="0" defaultValue={editingId ? products?.find(p => p.id === editingId)?.price_inr : ""} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_inr">Cost (₹)</Label>
                    <Input id="cost_inr" name="cost_inr" type="number" step="0.01" min="0" defaultValue={editingId ? products?.find(p => p.id === editingId)?.cost_inr || "" : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_in_stock">Stock *</Label>
                    <Input id="quantity_in_stock" name="quantity_in_stock" type="number" min="0" defaultValue={editingId ? products?.find(p => p.id === editingId)?.quantity_in_stock : ""} required />
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
                  <Label>Available Sizes & Prices</Label>
                  <p className="text-xs text-muted-foreground">Select sizes and set price for each size</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sizes?.map((size) => (
                      <div key={size.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSizes.includes(size.id)}
                          onCheckedChange={() => toggleSize(size.id)}
                        />
                        <Label className="flex-shrink-0 w-16">{size.name}</Label>
                        {selectedSizes.includes(size.id) && (
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price"
                              value={sizePrices[size.id] || ""}
                              onChange={(e) => setSizePrices(prev => ({
                                ...prev,
                                [size.id]: e.target.value
                              }))}
                              className="h-8"
                              required
                            />
                          </div>
                        )}
                      </div>
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
                  <Button type="submit" disabled={isUploadingPrimary || isUploadingSecondary}>
                    {isUploadingPrimary || isUploadingSecondary ? "Uploading..." : (editingId ? "Update" : "Create")}
                  </Button>
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
                    <TableCell>
                      {productSizes && productSizes.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              {productSizes.length} {productSizes.length === 1 ? 'Size' : 'Sizes'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3">
                            <div className="space-y-2">
                              {productSizes.map(s => {
                                const sizePrice = productSizePrices?.find(
                                  sp => sp.product_id === product.id && sp.size_id === s.id
                                );
                                return (
                                  <div key={s.id} className="flex items-center justify-between gap-4">
                                    <Badge variant="secondary">{s.name}</Badge>
                                    {sizePrice && (
                                      <span className="text-sm font-medium">₹{sizePrice.price_inr}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {productColors && productColors.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <div className="flex -space-x-1 mr-2">
                                {productColors.slice(0, 3).map(c => (
                                  <div
                                    key={c.id}
                                    className="w-4 h-4 rounded-full border-2 border-background"
                                    style={{ backgroundColor: c.hex_code || "#000000" }}
                                  />
                                ))}
                              </div>
                              {productColors.length}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <div className="space-y-1">
                              {productColors.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: c.hex_code || "#000000" }}
                                  />
                                  <span className="text-sm">{c.name}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
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
