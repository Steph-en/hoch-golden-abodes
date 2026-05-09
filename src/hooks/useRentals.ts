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
  created_at: string;
}

const RENTAL_KINDS = ["rental_property", "hotel", "commercial_rental"];

export const useStays = (kind?: string | null) => {
  const [stays, setStays] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = (supabase as any).from("properties").select("*").in("listing_kind", RENTAL_KINDS).order("featured", { ascending: false });
      if (kind && kind !== "all") q = (supabase as any).from("properties").select("*").eq("listing_kind", kind).order("featured", { ascending: false });
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
        (supabase as any).from("rooms").select("*").eq("property_id", id).eq("status", "active").order("nightly_price"),
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
      const { data: r } = await (supabase as any).from("rooms").select("*").eq("id", roomId).maybeSingle();
      setRoom(r as Room);
      if (r?.property_id) {
        const { data: p } = await (supabase as any).from("properties").select("*").eq("id", r.property_id).maybeSingle();
        setProperty(p as RentalProperty);
      }
      setLoading(false);
    })();
  }, [roomId]);

  return { room, property, loading };
};

export const useMyBookings = (userId: string | undefined) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = async () => {
    if (!userId) { setBookings([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any).from("bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  };
  useEffect(() => { refetch(); }, [userId]);
  return { bookings, loading, refetch };
};

export const checkAvailability = async (roomId: string, checkIn: string, checkOut: string) => {
  const { data, error } = await (supabase as any).rpc("check_room_availability", {
    _room_id: roomId, _check_in: checkIn, _check_out: checkOut,
  });
  if (error) throw error;
  return Boolean(data);
};

export const createBooking = async (params: {
  roomId: string; checkIn: string; checkOut: string; guests: number;
  guestName: string; guestEmail: string; guestPhone?: string; notes?: string;
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
