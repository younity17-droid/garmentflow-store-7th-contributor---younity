import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: any) => void;
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  onSelectProduct,
}: ProductSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sizes } = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sizes").select("*");
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (product: any) => {
    onSelectProduct(product);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading products...
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const productSizes = sizes?.filter((s) =>
                  product.size_ids?.includes(s.id)
                );
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelect(product)}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      {product.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      )}
                      <p className="text-sm">
                        Stock: {product.quantity_in_stock} | Price: ₹
                        {product.price_inr}
                      </p>
                      {productSizes && productSizes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Sizes: {productSizes.map((s) => s.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Select
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
