import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, CalendarDays, BedDouble, Users,
  DollarSign, Loader2, Hotel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminRooms, deleteRoom } from "@/hooks/useRentals";
import type { RentalProperty, RoomWithProperty } from "@/hooks/useRentals";
import RoomFormDialog from "./RoomFormDialog";
import AvailabilityDialog from "./AvailabilityDialog";

interface Props {
  rentalProperties: RentalProperty[];
}

const AdminRoomsTab = ({ rentalProperties }: Props) => {
  const { toast } = useToast();
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomWithProperty | null>(null);
  const [availabilityRoom, setAvailabilityRoom] = useState<RoomWithProperty | null>(null);

  const propId = filterProperty !== "all" ? Number(filterProperty) : undefined;
  const { rooms, loading, refetch } = useAdminRooms(propId);

  const filtered = useMemo(() => {
    let list = rooms;
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          (r.room_type || "").toLowerCase().includes(s) ||
          (r.properties?.title || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [rooms, filterStatus, search]);

  const handleDelete = async (room: RoomWithProperty) => {
    try {
      await deleteRoom(room.id);
      toast({ title: "Room deleted", description: room.name });
      refetch();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (room: RoomWithProperty) => {
    setEditingRoom(room);
    setRoomDialogOpen(true);
  };

  const openNew = () => {
    setEditingRoom(null);
    setRoomDialogOpen(true);
  };

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    inactive: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms…"
            className="pl-9"
          />
        </div>

        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {rentalProperties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground ml-auto">
          {filtered.length} room{filtered.length === 1 ? "" : "s"}
        </p>

        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Add Room
        </Button>
      </div>

      {/* Room cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Loading rooms…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Hotel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No rooms found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {rooms.length === 0
              ? "Add rooms to your rental properties to start accepting bookings."
              : "Try adjusting your filters."}
          </p>
          {rooms.length === 0 && rentalProperties.length > 0 && (
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" />
              Add First Room
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-full md:w-24 h-32 md:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {room.images?.[0] ? (
                    <img
                      src={room.images[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BedDouble className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{room.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[room.status] || "bg-muted text-muted-foreground"
                        }`}
                    >
                      {room.status}
                    </span>
                    {room.room_type && (
                      <Badge variant="secondary" className="text-xs">{room.room_type}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.properties?.title || "—"} · {room.properties?.location || ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.capacity} guest{room.capacity !== 1 ? "s" : ""}
                    </span>
                    {room.bed_config && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" />
                        {room.bed_config}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <DollarSign className="w-3.5 h-3.5" />
                      {Number(room.nightly_price).toLocaleString()} {room.currency}/night
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAvailabilityRoom(room)}
                    className="gap-1"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Availability
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEdit(room)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete room?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{room.name}" will be permanently removed. Any confirmed bookings for
                          this room must be handled separately before deletion.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(room)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <RoomFormDialog
        open={roomDialogOpen}
        onClose={() => { setRoomDialogOpen(false); setEditingRoom(null); }}
        room={editingRoom}
        rentalProperties={rentalProperties}
        onSaved={refetch}
      />

      <AvailabilityDialog
        open={!!availabilityRoom}
        onClose={() => setAvailabilityRoom(null)}
        room={availabilityRoom}
      />
    </div>
  );
};

export default AdminRoomsTab;