import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const { data: settings, isLoading } = useQuery({
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
            tax_percentage: 18
          })
          .select()
          .single();
          
        if (createError) throw createError;
        return newSettings;
      }
      
      return data;
    },
  });

  const { data: userResponse } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      return await supabase.auth.getUser();
    },
  });
  
  const user = userResponse?.data?.user;

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!settings) throw new Error("No settings found");
      const { error } = await supabase.from("store_settings").update(data).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error) => {
      console.error("Settings update error:", error);
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({ title: "Failed to upload logo", variant: "destructive" });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let logoUrl = settings?.logo_url;
    
    if (logoFile) {
      const uploadedUrl = await handleLogoUpload(logoFile);
      if (uploadedUrl) logoUrl = uploadedUrl;
    }
    
    const updates = {
      store_name: formData.get("store_name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      tax_percentage: parseFloat(formData.get("tax_percentage") as string) || 0,
      currency_symbol: formData.get("currency_symbol") as string,
      low_stock_threshold: parseInt(formData.get("low_stock_threshold") as string) || 10,
      whatsapp_channel: (formData.get("whatsapp_channel") as string) || '',
      instagram_page: (formData.get("instagram_page") as string) || '',
      whatsapp_tagline: (formData.get("whatsapp_tagline") as string) || 'Join our WhatsApp group',
      instagram_tagline: (formData.get("instagram_tagline") as string) || 'Follow us on Instagram',
      logo_url: logoUrl
    };

    updateMutation.mutate(updates);
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Store Settings</h1>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">General Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your store information and preferences</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              {(logoPreview || settings?.logo_url) && (
                <div className="relative">
                  <img 
                    src={logoPreview || settings?.logo_url} 
                    alt="Store Logo" 
                    className="h-20 w-20 object-contain border rounded"
                  />
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              <div>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label htmlFor="logo" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {logoPreview || settings?.logo_url ? "Change Logo" : "Upload Logo"}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name *</Label>
              <Input id="store_name" name="store_name" defaultValue={settings?.store_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input id="currency_symbol" name="currency_symbol" defaultValue={settings?.currency_symbol} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={settings?.email || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={settings?.phone || ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={settings?.address || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_percentage">Default Tax Percentage (%)</Label>
            <Input id="tax_percentage" name="tax_percentage" type="number" step="0.01" min="0" defaultValue={settings?.tax_percentage || ""} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
            <Input id="low_stock_threshold" name="low_stock_threshold" type="number" min="0" defaultValue={settings?.low_stock_threshold || 10} placeholder="10" />
          </div>

          <div className="mb-6 mt-8">
            <h3 className="text-lg font-semibold">Social Media Settings</h3>
            <p className="text-sm text-muted-foreground">Add your social media links to display QR codes on invoices</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_channel">WhatsApp Channel/Group Link</Label>
              <Input id="whatsapp_channel" name="whatsapp_channel" type="url" defaultValue={settings?.whatsapp_channel || ""} placeholder="https://chat.whatsapp.com/..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_page">Instagram Page Link</Label>
              <Input id="instagram_page" name="instagram_page" type="url" defaultValue={settings?.instagram_page || ""} placeholder="https://instagram.com/..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_tagline">WhatsApp Tagline</Label>
              <Input id="whatsapp_tagline" name="whatsapp_tagline" defaultValue={settings?.whatsapp_tagline || "Join our WhatsApp group"} placeholder="Join our WhatsApp group" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_tagline">Instagram Tagline</Label>
              <Input id="instagram_tagline" name="instagram_tagline" defaultValue={settings?.instagram_tagline || "Follow us on Instagram"} placeholder="Follow us on Instagram" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
