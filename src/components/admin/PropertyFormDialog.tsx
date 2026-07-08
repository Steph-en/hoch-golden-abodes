import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon,
  GripVertical, AlertCircle, Plus, Info,
} from "lucide-react";

const TYPES = ["Villa","Apartment","Townhouse","Penthouse","House","Hotel","Office","Land","Commercial"];
const STATUSES = ["Available","Reserved","Sold","Rented","Upcoming"];
const CURRENCIES = ["USD","GHS","EUR","GBP"];
const IMAGE_TYPES = ["gallery","thumbnail","floorplan","exterior","interior"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg","image/png","image/webp","image/gif"];

// Listing kind controls where this property appears site-wide:
//  • "sale"               → Explore page (For Sale)
//  • "hotel"               → Stays/Airbnb page; rooms managed in Admin → Rooms
//  • "rental_property"     → Stays/Airbnb page (apartments for rent); units managed in Admin → Rooms
//  • "commercial_rental"   → Stays/Airbnb page (offices, conference rooms, etc.); spaces managed in Admin → Rooms
const LISTING_KINDS = [
  { value: "sale",              label: "For Sale" },
  { value: "hotel",             label: "Hotel (short-stay rooms)" },
  { value: "rental_property",   label: "Apartment for Rent" },
  { value: "commercial_rental", label: "Commercial Rental (offices, conference rooms, etc.)" },
] as const;

const isRentalKind = (kind: string) => kind !== "sale";

interface ImageEntry { url: string; imageType: string; id: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  property?: any | null;
  onSaved: () => void;
}

const generateId = () => Math.random().toString(36).slice(2);

const isValidUrl = (url: string) => {
  try { new URL(url); return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url) || url.includes('cloudinary') || url.includes('unsplash') || url.includes('supabase'); }
  catch { return false; }
};

const PropertyFormDialog = ({ open, onClose, property, onSaved }: Props) => {
  const { toast } = useToast();
  const isEdit = !!property;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    listing_kind: "sale" as string,
    title: "", location: "", area: "", price: "", price_value: 0, currency: "USD",
    beds: 0, baths: 0, sqft: "", type: "Villa", status: "Available",
    description: "", amenitiesText: "", year_built: "", parking: 0,
    units: 1,
    mainImageUrl: "", featured: false,
    country: "Ghana", city: "", region: "", gps_lat: "", gps_lng: "",
    owner_name: "", owner_email: "", owner_phone: "", video_url: "",
  });
  const [images, setImages] = useState<ImageEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    if (property) {
      setForm({
        listing_kind: property.listing_kind || "sale",
        title: property.title || "",
        location: property.location || "",
        area: property.area || "",
        price: property.price || "",
        price_value: Number(property.price_value) || 0,
        currency: property.currency || "USD",
        beds: Number(property.beds) || 0,
        baths: Number(property.baths) || 0,
        sqft: property.sqft || "",
        type: property.type || "Villa",
        status: property.status || "Available",
        description: property.description || "",
        amenitiesText: (property.amenities || []).join(", "),
        year_built: property.year_built ? String(property.year_built) : "",
        parking: Number(property.parking) || 0,
        units: Number(property.units) || 1,
        mainImageUrl: property.image_url || "",
        featured: !!property.featured,
        country: property.country || "Ghana",
        city: property.city || "",
        region: property.region || "",
        gps_lat: property.gps_lat != null ? String(property.gps_lat) : "",
        gps_lng: property.gps_lng != null ? String(property.gps_lng) : "",
        owner_name: property.owner_name || "",
        owner_email: property.owner_email || "",
        owner_phone: property.owner_phone || "",
        video_url: property.video_url || "",
      });
      const existingImages: ImageEntry[] = (property.images || []).map((url: string) => ({
        url, imageType: "gallery", id: generateId(),
      }));
      setImages(existingImages);
    } else {
      setForm({
        listing_kind: "sale",
        title: "", location: "", area: "", price: "", price_value: 0, currency: "USD",
        beds: 0, baths: 0, sqft: "", type: "Villa", status: "Available",
        description: "", amenitiesText: "", year_built: "", parking: 0, units: 1,
        mainImageUrl: "", featured: false, country: "Ghana", city: "", region: "",
        gps_lat: "", gps_lng: "", owner_name: "", owner_email: "", owner_phone: "", video_url: "",
      });
      setImages([]);
    }
    setUrlInput(""); setUrlError("");
  }, [property, open]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPEG, PNG, WebP and GIF are allowed.", variant: "destructive" });
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return null;
    }
    const path = `${Date.now()}_${generateId()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const results = await Promise.all(Array.from(files).map(uploadFile));
    const newEntries: ImageEntry[] = results
      .filter((url): url is string => !!url)
      .map(url => ({ url, imageType: "gallery", id: generateId() }));
    setImages(prev => [...prev, ...newEntries]);
    setUploading(false);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setForm(f => ({ ...f, mainImageUrl: url }));
    setUploading(false);
    e.target.value = "";
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!isValidUrl(url)) { setUrlError("Please enter a valid image URL (.jpg, .png, .webp, etc.)"); return; }
    setImages(prev => [...prev, { url, imageType: "gallery", id: generateId() }]);
    setUrlInput(""); setUrlError("");
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await handleFileSelect(files);
  }, []);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnterItem = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setImages(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, removed);
      return arr;
    });
    setDragIndex(index);
  };

  const removeImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));
  const updateImageType = (id: string, imageType: string) =>
    setImages(prev => prev.map(img => img.id === id ? { ...img, imageType } : img));

  const handleSave = async () => {
    // Price isn't required for rental listings — per-room/unit pricing is
    // managed separately in Admin → Rooms. Title and location are always required.
    const priceRequired = form.listing_kind === "sale";
    if (!form.title || !form.location || (priceRequired && !form.price)) {
      toast({
        title: "Missing required fields",
        description: priceRequired
          ? "Title, location, and price are required."
          : "Title and location are required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload: any = {
      listing_kind: form.listing_kind,
      title: form.title, location: form.location, area: form.area || null,
      price: form.price || null, price_value: Number(form.price_value) || 0,
      beds: Number(form.beds) || 0, baths: Number(form.baths) || 0,
      sqft: form.sqft || null, type: form.type, status: form.status,
      description: form.description || null,
      amenities: form.amenitiesText.split(",").map(s => s.trim()).filter(Boolean),
      year_built: form.year_built ? parseInt(form.year_built) : null,
      parking: Number(form.parking) || 0,
      image_url: form.mainImageUrl || (images[0]?.url ?? null),
      images: images.map(img => img.url),
      featured: form.featured, currency: form.currency || "USD",
      country: form.country || null, city: form.city || null, region: form.region || null,
      gps_lat: form.gps_lat ? Number(form.gps_lat) : null,
      gps_lng: form.gps_lng ? Number(form.gps_lng) : null,
      owner_name: form.owner_name || null, owner_email: form.owner_email || null,
      owner_phone: form.owner_phone || null, video_url: form.video_url || null,
      updated_at: new Date().toISOString(),
    };

    const res = isEdit
      ? await (supabase as any).from("properties").update(payload).eq("id", property.id)
      : await (supabase as any).from("properties").insert(payload).select().single();

    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    } else {
      const propId = isEdit ? property.id : res.data?.id;
      if (propId) {
        await (supabase as any).from("property_images").delete().eq("property_id", propId);
        if (images.length > 0) {
          await (supabase as any).from("property_images").insert(
            images.map((img, idx) => ({
              property_id: propId, image_url: img.url,
              image_type: img.imageType, sort_order: idx,
            }))
          );
        }
      }
      toast({
        title: isEdit ? "Property updated" : "Property created",
        description: isRentalKind(form.listing_kind) && !isEdit
          ? "Now add rooms or units to it from the Rooms tab."
          : undefined,
      });
      onSaved(); onClose();
    }
    setSaving(false);
  };

  const f = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const selectedKind = LISTING_KINDS.find(k => k.value === form.listing_kind);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Property" : "Create New Property"}</DialogTitle>
          <DialogDescription className="sr-only">Dialog description</DialogDescription>
        </DialogHeader>

        {/* ── Listing Kind selector — always visible, outside tabs ── */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <Label className="text-sm font-semibold">Listing Kind *</Label>
          <Select value={form.listing_kind} onValueChange={v => f("listing_kind", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LISTING_KINDS.map(k => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {form.listing_kind === "sale"
              ? "Appears on the Explore page under properties for sale."
              : <>Appears on the Stays page only. After saving, add rooms/units/spaces from <strong>Admin → Rooms</strong>.</>}
          </p>
        </div>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="owner">Owner</TabsTrigger>
          </TabsList>

          {/* ── Basic ── */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => f("title", e.target.value)}
                  placeholder={isRentalKind(form.listing_kind) ? "ESP Heights Hotel" : "Luxury Villa East Legon"}
                />
              </div>
              <div><Label>Location *</Label><Input value={form.location} onChange={e => f("location", e.target.value)} placeholder="East Legon, Accra" /></div>
              <div><Label>Area</Label><Input value={form.area} onChange={e => f("area", e.target.value)} placeholder="East Legon" /></div>
              <div>
                <Label>{form.listing_kind === "sale" ? "Display Price *" : "Starting Price (optional)"}</Label>
                <Input value={form.price} onChange={e => f("price", e.target.value)} placeholder={form.listing_kind === "sale" ? "$850,000" : "From $120/night"} />
              </div>
              <div><Label>Price Value (numeric)</Label><Input type="number" value={form.price_value} onChange={e => f("price_value", Number(e.target.value))} /></div>
              <div><Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => f("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => f("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => f("description", e.target.value)} /></div>
            <div><Label>Amenities (comma-separated)</Label><Input value={form.amenitiesText} onChange={e => f("amenitiesText", e.target.value)} placeholder="Pool, Gym, Smart Home" /></div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => f("featured", e.target.checked)} />
              <span>Featured property</span>
            </label>
          </TabsContent>

          {/* ── Details ── */}
          <TabsContent value="details">
            {isRentalKind(form.listing_kind) && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Bedroom/bathroom counts below are for display only. Manage individual rooms, units, or spaces
                  (with their own pricing and availability) from <strong>Admin → Rooms</strong> after saving.
                </span>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>Bedrooms</Label><Input type="number" min={0} value={form.beds} onChange={e => f("beds", Number(e.target.value))} /></div>
              <div><Label>Bathrooms</Label><Input type="number" min={0} value={form.baths} onChange={e => f("baths", Number(e.target.value))} /></div>
              <div><Label>Sqft</Label><Input value={form.sqft} onChange={e => f("sqft", e.target.value)} placeholder="4,200" /></div>
              <div><Label>Parking Spaces</Label><Input type="number" min={0} value={form.parking} onChange={e => f("parking", Number(e.target.value))} /></div>
              <div><Label>Year Built</Label><Input type="number" value={form.year_built} onChange={e => f("year_built", e.target.value)} /></div>
              <div><Label>Video Tour URL</Label><Input value={form.video_url} onChange={e => f("video_url", e.target.value)} placeholder="https://youtube.com/…" /></div>
            </div>
          </TabsContent>

          {/* ── Media ── */}
          <TabsContent value="media" className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Main / Thumbnail Image</Label>
              <div className="flex items-center gap-4 mt-2">
                {form.mainImageUrl ? (
                  <div className="relative">
                    <img src={form.mainImageUrl} alt="main" className="w-28 h-28 rounded-xl object-cover border border-border" />
                    <button type="button" onClick={() => f("mainImageUrl", "")}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} disabled={uploading} />
                    <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-input hover:bg-muted cursor-pointer">
                      <Upload className="w-4 h-4" /> Upload file
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input value={form.mainImageUrl} onChange={e => f("mainImageUrl", e.target.value)}
                      placeholder="Or paste image URL…" className="text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Gallery Images</Label>
              <p className="text-xs text-muted-foreground mb-3">Drag to reorder. Supports file upload and direct URLs.</p>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => handleFileSelect(e.target.files)} disabled={uploading} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Drop images here or click to browse</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF · Max 10 MB each</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlError(""); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                    placeholder="Paste image URL and press Add…" className="pl-9" />
                </div>
                <Button type="button" variant="outline" onClick={handleAddUrl} disabled={!urlInput.trim()}>
                  <Plus className="w-4 h-4 mr-1" />Add URL
                </Button>
              </div>
              {urlError && (
                <div className="flex items-center gap-2 text-sm text-destructive mb-3">
                  <AlertCircle className="w-4 h-4" />{urlError}
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnterItem(idx)}
                      onDragEnd={() => setDragIndex(null)}
                      onDragOver={e => e.preventDefault()}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${dragIndex === idx ? 'border-primary scale-95 opacity-60' : 'border-border'}`}
                    >
                      <div className="aspect-square bg-muted">
                        <img src={img.url} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <GripVertical className="w-6 h-6 text-white" />
                      </div>
                      <button type="button" onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                        <select value={img.imageType}
                          onChange={e => updateImageType(img.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-[10px] bg-transparent text-white border-0 outline-none cursor-pointer">
                          {IMAGE_TYPES.map(t => <option key={t} value={t} className="text-foreground bg-background">{t}</option>)}
                        </select>
                      </div>
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-primary text-primary-foreground font-medium">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {images.length === 0 && !uploading && (
                <p className="text-sm text-muted-foreground text-center py-4">No gallery images yet</p>
              )}
            </div>
          </TabsContent>

          {/* ── Location ── */}
          <TabsContent value="location">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Country</Label><Input value={form.country} onChange={e => f("country", e.target.value)} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={e => f("city", e.target.value)} placeholder="Accra" /></div>
              <div><Label>Region</Label><Input value={form.region} onChange={e => f("region", e.target.value)} placeholder="Greater Accra" /></div>
              <div />
              <div><Label>GPS Latitude</Label><Input value={form.gps_lat} onChange={e => f("gps_lat", e.target.value)} placeholder="5.6037" /></div>
              <div><Label>GPS Longitude</Label><Input value={form.gps_lng} onChange={e => f("gps_lng", e.target.value)} placeholder="-0.1870" /></div>
            </div>
          </TabsContent>

          {/* ── Owner ── */}
          <TabsContent value="owner">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={e => f("owner_name", e.target.value)} /></div>
              <div><Label>Owner Email</Label><Input type="email" value={form.owner_email} onChange={e => f("owner_email", e.target.value)} /></div>
              <div><Label>Owner Phone</Label><Input value={form.owner_phone} onChange={e => f("owner_phone", e.target.value)} /></div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving || uploading}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyFormDialog;