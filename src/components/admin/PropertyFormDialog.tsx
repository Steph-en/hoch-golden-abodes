import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

const TYPES = ["Villa", "Apartment", "Townhouse", "Penthouse", "Commercial"];
const STATUSES = ["Available", "Reserved", "Sold"];

interface Props {
  open: boolean;
  onClose: () => void;
  property?: any | null;
  onSaved: () => void;
}

const PropertyFormDialog = ({ open, onClose, property, onSaved }: Props) => {
  const { toast } = useToast();
  const isEdit = !!property;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "", location: "", area: "", price: "", price_value: 0,
    beds: 0, baths: 0, sqft: "", type: "Villa", status: "Available",
    description: "", amenitiesText: "", year_built: "", parking: 0,
    image_url: "", images: [] as string[], featured: false,
  });

  useEffect(() => {
    if (property) {
      setForm({
        title: property.title || "",
        location: property.location || "",
        area: property.area || "",
        price: property.price || "",
        price_value: Number(property.price_value) || 0,
        beds: Number(property.beds) || 0,
        baths: Number(property.baths) || 0,
        sqft: property.sqft || "",
        type: property.type || "Villa",
        status: property.status || "Available",
        description: property.description || "",
        amenitiesText: (property.amenities || []).join(", "),
        year_built: property.year_built ? String(property.year_built) : "",
        parking: Number(property.parking) || 0,
        image_url: property.image_url || "",
        images: property.images || [],
        featured: !!property.featured,
      });
    } else {
      setForm({
        title: "", location: "", area: "", price: "", price_value: 0,
        beds: 0, baths: 0, sqft: "", type: "Villa", status: "Available",
        description: "", amenitiesText: "", year_built: "", parking: 0,
        image_url: "", images: [], featured: false,
      });
    }
  }, [property, open]);

  const uploadFile = async (file: File): Promise<string | null> => {
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  };

  const handleMainUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setForm(f => ({ ...f, image_url: url }));
    setUploading(false);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (files.length === 0) return;
    setUploading(true);
    const urls = (await Promise.all(files.map(uploadFile))).filter(Boolean) as string[];
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
  };

  const removeGalleryImage = (idx: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.title || !form.location || !form.price) {
      toast({ title: "Missing required fields", description: "Title, location, and price are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title,
      location: form.location,
      area: form.area || null,
      price: form.price,
      price_value: Number(form.price_value) || 0,
      beds: Number(form.beds) || 0,
      baths: Number(form.baths) || 0,
      sqft: form.sqft || null,
      type: form.type,
      status: form.status,
      description: form.description || null,
      amenities: form.amenitiesText.split(",").map(s => s.trim()).filter(Boolean),
      year_built: form.year_built ? parseInt(form.year_built) : null,
      parking: Number(form.parking) || 0,
      image_url: form.image_url || null,
      images: form.images,
      featured: form.featured,
      updated_at: new Date().toISOString(),
    };
    const res = isEdit
      ? await (supabase as any).from("properties").update(payload).eq("id", property.id)
      : await (supabase as any).from("properties").insert(payload);
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Property updated" : "Property created" });
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit property" : "Create new property"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></div>
            <div><Label>Location *</Label><Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="East Legon, Accra" /></div>
            <div><Label>Area</Label><Input value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} placeholder="East Legon" /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({...f, type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Price (display) *</Label><Input value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="$850,000" /></div>
            <div><Label>Price value (number) *</Label><Input type="number" value={form.price_value} onChange={e => setForm(f => ({...f, price_value: Number(e.target.value)}))} /></div>
            <div><Label>Beds</Label><Input type="number" value={form.beds} onChange={e => setForm(f => ({...f, beds: Number(e.target.value)}))} /></div>
            <div><Label>Baths</Label><Input type="number" value={form.baths} onChange={e => setForm(f => ({...f, baths: Number(e.target.value)}))} /></div>
            <div><Label>Sqft</Label><Input value={form.sqft} onChange={e => setForm(f => ({...f, sqft: e.target.value}))} placeholder="5200" /></div>
            <div><Label>Parking</Label><Input type="number" value={form.parking} onChange={e => setForm(f => ({...f, parking: Number(e.target.value)}))} /></div>
            <div><Label>Year built</Label><Input type="number" value={form.year_built} onChange={e => setForm(f => ({...f, year_built: e.target.value}))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          <div><Label>Amenities (comma separated)</Label><Input value={form.amenitiesText} onChange={e => setForm(f => ({...f, amenitiesText: e.target.value}))} placeholder="Pool, Gym, Smart Home" /></div>

          <div>
            <Label>Main image</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="main" className="w-24 h-24 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => setForm(f => ({...f, image_url: ""}))} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground"><ImageIcon className="w-6 h-6" /></div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleMainUpload} />
                <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-input hover:bg-muted">
                  <Upload className="w-4 h-4" /> {form.image_url ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label>Gallery images</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1">
              {form.images.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={url} alt={`g${i}`} className="w-full h-full rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => removeGalleryImage(i)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <label className="cursor-pointer aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                <Upload className="w-5 h-5" />
              </label>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({...f, featured: e.target.checked}))} />
            Featured property
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Create property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyFormDialog;
