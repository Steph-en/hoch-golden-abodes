import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, BedDouble, CalendarRange, Plus, Pencil, Trash2, Loader2, ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

const RENTAL_KINDS = ["rental_property", "hotel", "commercial_rental"];

const emptyRoom = {
  id: "" as string | undefined,
  property_id: "",
  name: "",
  description: "",
  room_type: "",
  capacity: 2,
  bed_config: "",
  amenities: "",
  images: "",
  nightly_price: 0,
  currency: "USD",
  status: "active",
};

const AdminStays = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stayProps, setStayProps] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState<any>(emptyRoom);
  const [savingRoom, setSavingRoom] = useState(false);

  const [blockForm, setBlockForm] = useState({ room_id: "", start_date: "", end_date: "", notes: "" });
  const [savingBlock, setSavingBlock] = useState(false);

  // ----- Filters -----
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilterProperty, setRoomFilterProperty] = useState("all");
  const [roomFilterType, setRoomFilterType] = useState("all");
  const [roomFilterStatus, setRoomFilterStatus] = useState("all");

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilterProperty, setBookingFilterProperty] = useState("all");
  const [bookingFilterStatus, setBookingFilterStatus] = useState("all");
  const [bookingFilterPayment, setBookingFilterPayment] = useState("all");
  const [bookingFrom, setBookingFrom] = useState("");
  const [bookingTo, setBookingTo] = useState("");

  const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded", "failed"];
  const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) { navigate("/auth"); return; }
      if (!isAdmin) { navigate("/dashboard"); return; }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  const fetchAll = async () => {
    const [pRes, rRes, bRes, blRes] = await Promise.all([
      (supabase as any).from("properties").select("id,title,location,listing_kind").in("listing_kind", RENTAL_KINDS).order("title"),
      (supabase as any).from("rooms").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("bookings").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("room_availability").select("*").order("start_date", { ascending: false }),
    ]);
    setStayProps(pRes.data || []);
    setRooms(rRes.data || []);
    setBookings(bRes.data || []);
    setBlocks(blRes.data || []);
  };

  if (authLoading || adminLoading || !isAdmin) return null;

  const propTitle = (id: number) => stayProps.find(p => p.id === id)?.title || `Property #${id}`;
  const roomName = (id: string) => rooms.find(r => r.id === id)?.name || "Room";

  // ---------- Rooms ----------
  const openCreateRoom = () => { setRoomForm(emptyRoom); setRoomDialogOpen(true); };
  const openEditRoom = (r: any) => {
    setRoomForm({
      ...r,
      property_id: String(r.property_id),
      amenities: (r.amenities || []).join(", "),
      images: (r.images || []).join("\n"),
    });
    setRoomDialogOpen(true);
  };
  const saveRoom = async () => {
    if (!roomForm.property_id || !roomForm.name || !roomForm.nightly_price) {
      toast({ title: "Property, name and nightly price are required", variant: "destructive" });
      return;
    }
    setSavingRoom(true);
    const payload = {
      property_id: parseInt(roomForm.property_id),
      name: roomForm.name,
      description: roomForm.description || null,
      room_type: roomForm.room_type || null,
      capacity: Number(roomForm.capacity) || 1,
      bed_config: roomForm.bed_config || null,
      amenities: String(roomForm.amenities || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      images: String(roomForm.images || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
      nightly_price: Number(roomForm.nightly_price) || 0,
      currency: roomForm.currency || "USD",
      status: roomForm.status || "active",
    };
    const { error } = roomForm.id
      ? await (supabase as any).from("rooms").update(payload).eq("id", roomForm.id)
      : await (supabase as any).from("rooms").insert(payload);
    setSavingRoom(false);
    if (error) { toast({ title: "Failed to save room", description: error.message, variant: "destructive" }); return; }
    toast({ title: roomForm.id ? "Room updated" : "Room created" });
    setRoomDialogOpen(false);
    fetchAll();
  };
  const deleteRoom = async (id: string) => {
    const { error } = await (supabase as any).from("rooms").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Room deleted" }); fetchAll(); }
  };

  // ---------- Bookings ----------
  const updateBooking = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any).from("bookings").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Booking updated" }); fetchAll(); }
  };
  const deleteBooking = async (id: string) => {
    const { error } = await (supabase as any).from("bookings").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Booking deleted" }); fetchAll(); }
  };

  // ---------- Availability blocks ----------
  const saveBlock = async () => {
    if (!blockForm.room_id || !blockForm.start_date || !blockForm.end_date) {
      toast({ title: "Room and date range are required", variant: "destructive" }); return;
    }
    setSavingBlock(true);
    const { error } = await (supabase as any).from("room_availability").insert({
      room_id: blockForm.room_id,
      start_date: blockForm.start_date,
      end_date: blockForm.end_date,
      status: "blocked",
      notes: blockForm.notes || null,
    });
    setSavingBlock(false);
    if (error) { toast({ title: "Failed to add block", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Date block added" });
    setBlockForm({ room_id: "", start_date: "", end_date: "", notes: "" });
    fetchAll();
  };
  const deleteBlock = async (id: string) => {
    const { error } = await (supabase as any).from("room_availability").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Block removed" }); fetchAll(); }
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <SEO title="Manage Stays | Admin" description="Manage hotel and apartment rental inventory." path="/admin/stays" noIndex />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><BedDouble className="w-6 h-6 text-primary" /></div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Stays Inventory</h1>
              <p className="text-muted-foreground">Rooms, bookings and availability blocks for hotels & rentals</p>
            </div>
          </div>
          <Button asChild variant="outline"><Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin</Link></Button>
        </div>

        <Tabs defaultValue="rooms">
          <TabsList>
            <TabsTrigger value="rooms"><BedDouble className="w-4 h-4 mr-2" />Rooms ({rooms.length})</TabsTrigger>
            <TabsTrigger value="bookings"><Building2 className="w-4 h-4 mr-2" />Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="blocks"><CalendarRange className="w-4 h-4 mr-2" />Availability blocks ({blocks.length})</TabsTrigger>
          </TabsList>

          {/* Rooms */}
          <TabsContent value="rooms" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateRoom}><Plus className="w-4 h-4 mr-2" />New room</Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Property</TableHead><TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead><TableHead>Price/night</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rooms.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No rooms yet</TableCell></TableRow>
                  )}
                  {rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{propTitle(r.property_id)}</TableCell>
                      <TableCell>{r.room_type || "—"}</TableCell>
                      <TableCell>{r.capacity}</TableCell>
                      <TableCell>{r.currency} {Number(r.nightly_price).toLocaleString()}</TableCell>
                      <TableCell><span className="text-xs px-2 py-1 rounded-full bg-muted">{r.status}</span></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditRoom(r)}><Pencil className="w-3 h-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete room?</AlertDialogTitle><AlertDialogDescription>This will permanently remove "{r.name}".</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteRoom(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-6">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Guest</TableHead><TableHead>Room</TableHead><TableHead>Property</TableHead>
                  <TableHead>Dates</TableHead><TableHead>Total</TableHead>
                  <TableHead>Status</TableHead><TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bookings.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
                  )}
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-medium">{b.guest_name}</div>
                        <div className="text-xs text-muted-foreground">{b.guest_email}</div>
                      </TableCell>
                      <TableCell>{roomName(b.room_id)}</TableCell>
                      <TableCell>{propTitle(b.property_id)}</TableCell>
                      <TableCell className="text-xs">{b.check_in} → {b.check_out}<div className="text-muted-foreground">{b.nights}n · {b.guests} guest(s)</div></TableCell>
                      <TableCell>{b.currency} {Number(b.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Select value={b.status} onValueChange={(v) => updateBooking(b.id, { status: v })}>
                          <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["pending","confirmed","cancelled","completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={b.payment_status} onValueChange={(v) => updateBooking(b.id, { payment_status: v })}>
                          <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["unpaid","paid","refunded"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete booking?</AlertDialogTitle><AlertDialogDescription>This permanently removes the booking.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteBooking(b.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Availability blocks */}
          <TabsContent value="blocks" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Add availability block</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-5 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label>Room</Label>
                  <Select value={blockForm.room_id} onValueChange={(v) => setBlockForm({ ...blockForm, room_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose room" /></SelectTrigger>
                    <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{propTitle(r.property_id)} — {r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Start</Label><Input type="date" value={blockForm.start_date} onChange={(e) => setBlockForm({ ...blockForm, start_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>End</Label><Input type="date" value={blockForm.end_date} onChange={(e) => setBlockForm({ ...blockForm, end_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Notes</Label><Input value={blockForm.notes} onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })} placeholder="Maintenance" /></div>
                <div className="md:col-span-5 flex justify-end">
                  <Button onClick={saveBlock} disabled={savingBlock}>{savingBlock && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add block</Button>
                </div>
              </CardContent>
            </Card>

            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Room</TableHead><TableHead>Property</TableHead><TableHead>Range</TableHead>
                  <TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {blocks.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No blocks</TableCell></TableRow>
                  )}
                  {blocks.map((b) => {
                    const r = rooms.find(x => x.id === b.room_id);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{r?.name || "—"}</TableCell>
                        <TableCell>{r ? propTitle(r.property_id) : "—"}</TableCell>
                        <TableCell className="text-xs">{b.start_date} → {b.end_date}</TableCell>
                        <TableCell><span className="text-xs px-2 py-1 rounded-full bg-muted">{b.status}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" onClick={() => deleteBlock(b.id)}><Trash2 className="w-3 h-3" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{roomForm.id ? "Edit room" : "New room"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Property</Label>
              <Select value={roomForm.property_id} onValueChange={(v) => setRoomForm({ ...roomForm, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose stay" /></SelectTrigger>
                <SelectContent>{stayProps.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Name</Label><Input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Room type</Label><Input value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })} placeholder="Suite, Deluxe…" /></div>
            <div className="space-y-1"><Label>Capacity</Label><Input type="number" min={1} value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} /></div>
            <div className="space-y-1"><Label>Bed config</Label><Input value={roomForm.bed_config} onChange={(e) => setRoomForm({ ...roomForm, bed_config: e.target.value })} placeholder="1 King" /></div>
            <div className="space-y-1"><Label>Nightly price</Label><Input type="number" min={0} value={roomForm.nightly_price} onChange={(e) => setRoomForm({ ...roomForm, nightly_price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Currency</Label><Input value={roomForm.currency} onChange={(e) => setRoomForm({ ...roomForm, currency: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={roomForm.status} onValueChange={(v) => setRoomForm({ ...roomForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active","inactive","maintenance"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2"><Label>Description</Label><Textarea value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Amenities (comma-separated)</Label><Input value={roomForm.amenities} onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })} placeholder="WiFi, Pool, Spa" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Image URLs (one per line)</Label><Textarea value={roomForm.images} onChange={(e) => setRoomForm({ ...roomForm, images: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRoom} disabled={savingRoom}>{savingRoom && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStays;
