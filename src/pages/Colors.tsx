import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Colors() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorName, setColorName] = useState("");
  const [hexCode, setHexCode] = useState("#000000");
  const [sortOrder, setSortOrder] = useState(0);
  const queryClient = useQueryClient();

  const { data: colors, isLoading } = useQuery({
    queryKey: ["colors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("colors")
          .update({ name: colorName, hex_code: hexCode, sort_order: sortOrder })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("colors")
          .insert({ name: colorName, hex_code: hexCode, sort_order: sortOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Color updated" : "Color added");
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      resetForm();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Failed to save color");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Color deleted");
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete color");
    },
  });

  const resetForm = () => {
    setColorName("");
    setHexCode("#000000");
    setSortOrder(0);
    setEditingId(null);
    setOpen(false);
  };

  const editColor = (color: any) => {
    setColorName(color.name);
    setHexCode(color.hex_code || "#000000");
    setSortOrder(color.sort_order || 0);
    setEditingId(color.id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Colors</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Color
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Color" : "Add New Color"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Color Name</Label>
                <Input
                  id="name"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g., Red, Blue, Green"
                />
              </div>
              <div>
                <Label htmlFor="hexCode">Hex Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="hexCode"
                    type="color"
                    value={hexCode}
                    onChange={(e) => setHexCode(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={hexCode}
                    onChange={(e) => setHexCode(e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={() => saveMutation.mutate()}>
                  {editingId ? "Update" : "Add"}
                </Button>
              </div>
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
                <TableHead>Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Hex Code</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colors?.map((color) => (
                <TableRow key={color.id}>
                  <TableCell>
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: color.hex_code || "#000000" }}
                    />
                  </TableCell>
                  <TableCell>{color.name}</TableCell>
                  <TableCell className="font-mono text-sm">{color.hex_code}</TableCell>
                  <TableCell>{color.sort_order}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => editColor(color)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(color.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
