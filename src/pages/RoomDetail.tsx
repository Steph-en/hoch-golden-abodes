import { useState, useMemo, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, Users, Bed, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoom, checkAvailability, createBooking } from "@/hooks/useRentals";
import { supabase } from "@/integrations/supabase/client";
import SEO, { breadcrumbLd, SITE_URL } from "@/components/SEO";

const RoomDetail = () => {
  const { propertyId, roomId } = useParams();
  const { room, property, loading } = useRoom(roomId);
  const { user, profile } = useAuth();

  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    "unknown" | "checking" | "available" | "unavailable"
  >("unknown");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setName(profile?.display_name || "");
    }
  }, [user, profile]);

  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.max(0, differenceInCalendarDays(range.to, range.from));
  }, [range]);

  const total = useMemo(
    () => nights * Number(room?.nightly_price || 0),
    [nights, room]
  );

  const fmt = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");

  useEffect(() => {
    if (!room || !range?.from || !range?.to || nights < 1) {
      setAvailability("unknown");
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    checkAvailability(room.id, fmt(range.from), fmt(range.to))
      .then((ok) => {
        if (!cancelled) setAvailability(ok ? "available" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setAvailability("unknown");
      });
    return () => { cancelled = true; };
  }, [room, range, nights]);

  const sendConfirmationEmail = async (bid: string) => {
    if (!room || !property || !range?.from || !range?.to) return;
    try {
      await supabase.functions.invoke("send-booking-email", {
        body: {
          type: "booking_created",
          guestEmail: email.trim(),
          guestName: name.trim(),
          propertyTitle: property.title,
          roomName: room.name,
          checkIn: fmt(range.from),
          checkOut: fmt(range.to),
          nights,
          total,
          currency: room.currency,
          bookingRef: bid.slice(0, 8).toUpperCase(),
        },
      });
    } catch {
      // Non-fatal — booking succeeded regardless
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!room) return <Navigate to="/stays" replace />;

  const handleBook = async () => {
    if (!range?.from || !range?.to || nights < 1) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (guests > room.capacity) {
      toast.error(`This room sleeps up to ${room.capacity} guests`);
      return;
    }
    setSubmitting(true);
    try {
      const id = await createBooking({
        roomId: room.id,
        checkIn: fmt(range.from),
        checkOut: fmt(range.to),
        guests,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setBookingId(id);
      toast.success("Reservation created!");
      await sendConfirmationEmail(id);
    } catch (err: any) {
      toast.error(err?.message || "Could not create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const images =
    room.images && room.images.length > 0
      ? room.images
      : property?.images?.length
        ? property.images
        : [property?.image_url || "/placeholder.svg"];

  // ── Confirmation screen ──────────────────────────────────
  if (bookingId) {
    return (
      <div className="min-h-screen bg-background py-20 px-4">
        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold mb-2">Booking confirmed</h1>
          <p className="text-muted-foreground mb-6">
            Reservation reference{" "}
            <span className="font-mono font-semibold text-foreground">
              {bookingId.slice(0, 8).toUpperCase()}
            </span>
            . A confirmation has been sent to{" "}
            <strong>{email}</strong>.
          </p>
          <div className="rounded-xl bg-muted p-5 text-left text-sm space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium">{property?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{room.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">{format(range!.from!, "d MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-out</span>
              <span className="font-medium">{format(range!.to!, "d MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nights</span>
              <span className="font-medium">{nights}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guests</span>
              <span className="font-medium">{guests}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-semibold text-foreground">
                ${total.toLocaleString()} {room.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="text-amber-600 font-medium">Pay on arrival — online payments coming soon</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link to="/stays">
              <Button variant="outline">Browse more stays</Button>
            </Link>
            {user && (
              <Link to="/dashboard">
                <Button>View my bookings</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Room detail + booking widget ─────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${room.name} — ${property?.title || "Book a room"}`}
        description={(
          room.description ||
          `Book ${room.name} at ${property?.title}. From $${room.nightly_price}/night.`
        ).slice(0, 160)}
        path={`/stays/${propertyId}/rooms/${room.id}`}
        image={images[0]}
        jsonLd={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Stays", path: "/stays" },
            { name: property?.title || "Stay", path: `/stays/${propertyId}` },
            { name: room.name, path: `/stays/${propertyId}/rooms/${room.id}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "HotelRoom",
            name: room.name,
            description: room.description,
            occupancy: { "@type": "QuantitativeValue", maxValue: room.capacity },
            offers: {
              "@type": "Offer",
              price: room.nightly_price,
              priceCurrency: room.currency,
              url: `${SITE_URL}/stays/${propertyId}/rooms/${room.id}`,
            },
          },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          to={`/stays/${propertyId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {property?.title || "stay"}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Carousel className="rounded-2xl overflow-hidden">
            <CarouselContent>
              {images.map((img, i) => (
                <CarouselItem key={i}>
                  <div className="aspect-[16/10] bg-muted">
                    <img
                      src={img}
                      alt={`${room.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-3" />
                <CarouselNext className="right-3" />
              </>
            )}
          </Carousel>

          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">{room.name}</h1>
            {room.room_type && (
              <p className="text-muted-foreground mt-1">{room.room_type}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> Sleeps {room.capacity}
              </span>
              {room.bed_config && (
                <span className="flex items-center gap-1">
                  <Bed className="w-4 h-4" /> {room.bed_config}
                </span>
              )}
            </div>
          </div>

          {room.description && (
            <div>
              <h2 className="font-semibold text-lg mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-line">{room.description}</p>
            </div>
          )}

          {room.amenities && room.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a) => (
                  <span key={a} className="px-3 py-1.5 rounded-full bg-muted text-sm">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {room.booking_rules && Object.keys(room.booking_rules).length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-2">Booking rules</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                {Object.entries(room.booking_rules).map(([k, v]) => (
                  <li key={k}>
                    <span className="capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Booking widget */}
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <p className="font-serif text-3xl font-bold">
              ${Number(room.nightly_price).toLocaleString()}
              <span className="text-base font-normal text-muted-foreground"> /night</span>
            </p>
          </div>

          {/* Date picker */}
          <div className="space-y-1">
            <Label>Check-in / Check-out</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !range && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "LLL d")} → ${format(range.to, "LLL d, yyyy")}`
                      : format(range.from, "PPP")
                    : "Select dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guests */}
          <div className="space-y-1">
            <Label htmlFor="guests">Guests (max {room.capacity})</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={room.capacity}
              value={guests}
              onChange={(e) =>
                setGuests(Math.max(1, Math.min(room.capacity, Number(e.target.value) || 1)))
              }
            />
          </div>

          {/* Guest details (pre-filled if logged in) */}
          {!user && (
            <>
              <div className="space-y-1">
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Price summary */}
          {nights > 0 && (
            <div className="rounded-xl bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>${Number(room.nightly_price).toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""}</span>
                <span>${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>Total</span>
                <span>${total.toLocaleString()} {room.currency}</span>
              </div>
            </div>
          )}

          {/* Availability indicator */}
          {availability === "unavailable" && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>These dates are unavailable. Please try different dates.</span>
            </div>
          )}
          {availability === "available" && (
            <div className="flex items-start gap-2 text-sm text-primary bg-primary/10 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Dates are available!</span>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleBook}
            disabled={
              submitting ||
              availability === "unavailable" ||
              availability === "checking" ||
              nights < 1
            }
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Reserve
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            No charge today — pay on arrival. Online payments coming soon.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default RoomDetail;