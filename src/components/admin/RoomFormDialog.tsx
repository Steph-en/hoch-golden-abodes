import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createRoom, updateRoom } from "@/hooks/useRentals";
import type { Room, RentalProperty } from "@/hooks/useRentals";

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Executive", "Penthouse", "Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom", "3-Bedroom Penthouse", "Villa", "Cottage"];
const CURRENCIES = ["USD", "GHS", "EUR", "GBP"];
const STATUSES = ["active", "inactive"];

interface Props {
  open: boolean;
  onClose: () => void;
  room?: Room | null;
  rentalProperties: RentalProperty[];
  onSaved: () => void;
}

const DEFAULT_RULES = { min_nights: 1, max_nights: 30, check_in_time: "14:00", check_out_time: "12:00" };

const RoomFormDialog = ({ open, onClose, room, rentalProperties, onSaved }: Props) => {
  const { toast } = useToast();
  const isEdit = !!room;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    property_id: 0,
    name: "",
    room_type: "Standard",
    capacity: 2,
    bed_config: "",
    description: "",
    amenitiesText: "",
    nightly_price: 0,
    currency: "USD",
    status: "active",
    images: [] as string[],
    min_nights: 1,
    max_nights: 30,
    check_in_time: "14:00",
    check_out_time: "12:00",
  });

  useEffect(() => {
    if (room) {
      const rules = (room.booking_rules as any) || DEFAULT_RULES;
      setForm({
        property_id: room.property_id,
        name: room.name,
        room_type: room.room_type || "Standard",
        capacity: room.capacity,
        bed_config: room.bed_config || "",
        description: room.description || "",
        amenitiesText: (room.amenities || []).join(", "),
        nightly_price: Number(room.nightly_price),
        currency: room.currency,
        status: room.status,
        images: room.images || [],
        min_nights: rules.min_nights ?? 1,
        max_nights: rules.max_nights ?? 30,
        check_in_time: rules.check_in_time ?? "14:00",
        check_out_time: rules.check_out_time ?? "12:00",
      });
    } else {
      setForm({
        property_id: rentalProperties[0]?.id || 0,
        name: "",
        room_type: "Standard",
        capacity: 2,
        bed_config: "",
        description: "",
        amenitiesText: "",
        nightly_price: 100,
        currency: "USD",
        status: "active",
        images: [],
        min_nights: 1,
        max_nights: 30,
        check_in_time: "14:00",
        check_out_time: "12:00",
      });
    }
  }, [room, open, rentalProperties]);

  const set = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadImage = async (file: File): Promise<string | null> => {
    const path = `rooms/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = (await Promise.all(files.map(uploadImage))).filter(Boolean) as string[];
    set("images", [...form.images, ...urls]);
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (idx: number) =>
    set("images", form.images.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Room name is required", variant: "destructive" });
      return;
    }
    if (!form.property_id) {
      toast({ title: "Please select a property", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      property_id: form.property_id,
      name: form.name.trim(),
      room_type: form.room_type || null,
      capacity: Number(form.capacity),
      bed_config: form.bed_config.trim() || null,
      description: form.description.trim() || null,
      amenities: form.amenitiesText.split(",").map((s) => s.trim()).filter(Boolean),
      nightly_price: Number(form.nightly_price),
      currency: form.currency,
      status: form.status,
      images: form.images,
      booking_rules: {
        min_nights: Number(form.min_nights),
        max_nights: Number(form.max_nights),
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
      },
    };

    try {
      if (isEdit && room) {
        await updateRoom(room.id, payload);
      } else {
        await createRoom(payload);
      }
      toast({ title: isEdit ? "Room updated" : "Room created" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Room" : "Add New Room"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Property */}
          <div>
            <Label>Property *</Label>
            <Select
              value={String(form.property_id)}
              onValueChange={(v) => set("property_id", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {rentalProperties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title} — {p.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Room Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Deluxe Room 101"
              />
            </div>
            <div>
              <Label>Room Type</Label>
              <Select value={form.room_type} onValueChange={(v) => set("room_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity (guests)</Label>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => set("capacity", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Bed Config</Label>
              <Input
                value={form.bed_config}
                onChange={(e) => set("bed_config", e.target.value)}
                placeholder="e.g. 1 King Bed"
              />
            </div>
            <div>
              <Label>Nightly Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.nightly_price}
                onChange={(e) => set("nightly_price", e.target.value)}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe this room…"
            />
          </div>

          <div>
            <Label>Amenities (comma-separated)</Label>
            <Input
              value={form.amenitiesText}
              onChange={(e) => set("amenitiesText", e.target.value)}
              placeholder="WiFi, TV, Air Conditioning, Mini Bar"
            />
          </div>

          {/* Booking rules */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Booking Rules</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Min Nights</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.min_nights}
                  onChange={(e) => set("min_nights", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Max Nights</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_nights}
                  onChange={(e) => set("max_nights", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Check-in Time</Label>
                <Input
                  type="time"
                  value={form.check_in_time}
                  onChange={(e) => set("check_in_time", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Check-out Time</Label>
                <Input
                  type="time"
                  value={form.check_out_time}
                  onChange={(e) => set("check_out_time", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div>
            <Label>Room Images</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
              {form.images.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`room-${i}`}
                    className="w-full h-full rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="cursor-pointer aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted gap-1">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagesUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-xs">Add</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomFormDialog;