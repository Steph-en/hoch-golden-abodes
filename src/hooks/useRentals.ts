import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RentalProperty {
  id: number;
  title: string;
  location: string;
  area: string | null;
  description: string | null;
  type: string;
  listing_kind: "sale" | "rental_property" | "hotel" | "commercial_rental";
  image_url: string | null;
  images: string[];
  amenities: string[];
  featured: boolean;
}

export interface Room {
  id: string;
  property_id: number;
  name: string;
  description: string | null;
  room_type: string | null;
  capacity: number;
  bed_config: string | null;
  amenities: string[];
  images: string[];
  nightly_price: number;
  currency: string;
  status: string;
  booking_rules: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface RoomWithProperty extends Room {
  properties?: { title: string; location: string; listing_kind: string } | null;
}

export interface Booking {
  id: string;
  room_id: string;
  property_id: number;
  user_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  nightly_price: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BookingWithDetails extends Booking {
  rooms?: { name: string; room_type: string | null } | null;
  properties?: { title: string; location: string } | null;
}

export interface AvailabilityBlock {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  status: string;
  booking_id: string | null;
  notes: string | null;
  created_at: string;
}

const RENTAL_KINDS = ["rental_property", "hotel", "commercial_rental"];

// ─────────────────────────────────────────────────────────────
// Public-facing hooks
// ─────────────────────────────────────────────────────────────

export const useStays = (kind?: string | null) => {
  const [stays, setStays] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = (supabase as any)
        .from("properties")
        .select("*")
        .in("listing_kind", RENTAL_KINDS)
        .order("featured", { ascending: false });
      if (kind && kind !== "all") {
        q = (supabase as any)
          .from("properties")
          .select("*")
          .eq("listing_kind", kind)
          .order("featured", { ascending: false });
      }
      const { data } = await q;
      setStays((data || []) as RentalProperty[]);
      setLoading(false);
    })();
  }, [kind]);

  return { stays, loading };
};

export const useStay = (id: number | undefined) => {
  const [stay, setStay] = useState<RentalProperty | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: r }] = await Promise.all([
        (supabase as any).from("properties").select("*").eq("id", id).maybeSingle(),
        (supabase as any)
          .from("rooms")
          .select("*")
          .eq("property_id", id)
          .eq("status", "active")
          .order("nightly_price"),
      ]);
      setStay(p as RentalProperty);
      setRooms((r || []) as Room[]);
      setLoading(false);
    })();
  }, [id]);

  return { stay, rooms, loading };
};

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      setLoading(true);
      const { data: r } = await (supabase as any)
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      setRoom(r as Room);
      if (r?.property_id) {
        const { data: p } = await (supabase as any)
          .from("properties")
          .select("*")
          .eq("id", r.property_id)
          .maybeSingle();
        setProperty(p as RentalProperty);
      }
      setLoading(false);
    })();
  }, [roomId]);

  return { room, property, loading };
};

export const useMyBookings = (userId: string | undefined) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("bookings")
      .select("*, rooms(name, room_type), properties(title, location)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBookings((data || []) as BookingWithDetails[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [userId]);

  return { bookings, loading, refetch };
};

// ─────────────────────────────────────────────────────────────
// Admin hooks
// ─────────────────────────────────────────────────────────────

export const useAdminRooms = (propertyId?: number) => {
  const [rooms, setRooms] = useState<RoomWithProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("rooms")
      .select("*, properties(title, location, listing_kind)")
      .order("property_id")
      .order("nightly_price");
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data } = await q;
    setRooms((data || []) as RoomWithProperty[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [propertyId]);

  return { rooms, loading, refetch };
};

export const useAdminBookings = (filters?: {
  status?: string;
  propertyId?: number;
  from?: string;
  to?: string;
  search?: string;
}) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("bookings")
      .select("*, rooms(name, room_type), properties(title, location)")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
    if (filters?.propertyId) q = q.eq("property_id", filters.propertyId);
    if (filters?.from) q = q.gte("check_in", filters.from);
    if (filters?.to) q = q.lte("check_in", filters.to);

    const { data } = await q;
    let result = (data || []) as BookingWithDetails[];

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.guest_name.toLowerCase().includes(s) ||
          b.guest_email.toLowerCase().includes(s)
      );
    }
    setBookings(result);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [JSON.stringify(filters)]);

  return { bookings, loading, refetch };
};

export const useRoomAvailability = (roomId: string | undefined) => {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!roomId) { setBlocks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("room_availability")
      .select("*")
      .eq("room_id", roomId)
      .order("start_date");
    setBlocks((data || []) as AvailabilityBlock[]);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [roomId]);

  return { blocks, loading, refetch };
};

// ─────────────────────────────────────────────────────────────
// Admin mutations
// ─────────────────────────────────────────────────────────────

export const createRoom = async (payload: Omit<Room, "id" | "created_at" | "updated_at">) => {
  const { data, error } = await (supabase as any).from("rooms").insert(payload).select().single();
  if (error) throw error;
  return data as Room;
};

export const updateRoom = async (id: string, payload: Partial<Room>) => {
  const { data, error } = await (supabase as any)
    .from("rooms")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Room;
};

export const deleteRoom = async (id: string) => {
  const { error } = await (supabase as any).from("rooms").delete().eq("id", id);
  if (error) throw error;
};

export const addAvailabilityBlock = async (
  roomId: string,
  startDate: string,
  endDate: string,
  notes?: string
) => {
  // Guard against overlaps before inserting
  const { data: existing } = await (supabase as any)
    .from("room_availability")
    .select("id")
    .eq("room_id", roomId)
    .lt("start_date", endDate)
    .gt("end_date", startDate);

  if (existing && existing.length > 0) {
    throw new Error("Date range overlaps with an existing availability block.");
  }

  const { data, error } = await (supabase as any)
    .from("room_availability")
    .insert({
      room_id: roomId,
      start_date: startDate,
      end_date: endDate,
      status: "blocked",
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AvailabilityBlock;
};

export const deleteAvailabilityBlock = async (id: string) => {
  const { error } = await (supabase as any).from("room_availability").delete().eq("id", id);
  if (error) throw error;
};

export const updateBookingStatus = async (
  id: string,
  status: string,
  paymentStatus?: string
) => {
  const payload: any = { status, updated_at: new Date().toISOString() };
  if (paymentStatus) payload.payment_status = paymentStatus;
  const { data, error } = await (supabase as any)
    .from("bookings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
};

export const cancelBooking = async (id: string) =>
  updateBookingStatus(id, "cancelled");

// ─────────────────────────────────────────────────────────────
// Public booking actions
// ─────────────────────────────────────────────────────────────

export const checkAvailability = async (
  roomId: string,
  checkIn: string,
  checkOut: string
) => {
  const { data, error } = await (supabase as any).rpc("check_room_availability", {
    _room_id: roomId,
    _check_in: checkIn,
    _check_out: checkOut,
  });
  if (error) throw error;
  return Boolean(data);
};

export const createBooking = async (params: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
}) => {
  const { data, error } = await (supabase as any).rpc("create_booking", {
    _room_id: params.roomId,
    _check_in: params.checkIn,
    _check_out: params.checkOut,
    _guests: params.guests,
    _guest_name: params.guestName,
    _guest_email: params.guestEmail,
    _guest_phone: params.guestPhone ?? null,
    _notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as string;
};