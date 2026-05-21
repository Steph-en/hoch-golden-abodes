import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format, differenceInCalendarDays } from "date-fns";
import {
  CalendarIcon, Users, Bed, Loader2, CheckCircle2, AlertCircle,
  ChevronLeft, User, Mail, Phone, MessageSquare, ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon, X, AlertTriangle,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoom, checkAvailability, createBooking } from "@/hooks/useRentals";
import { supabase } from "@/integrations/supabase/client";
import SEO, { breadcrumbLd, SITE_URL } from "@/components/SEO";

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  guests?: string;
  dates?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateForm(params: {
  name: string;
  email: string;
  phone: string;
  guests: number;
  capacity: number;
  range: DateRange | undefined;
  nights: number;
}): FormErrors {
  const errors: FormErrors = {};
  if (!params.name.trim()) errors.name = "Full name is required";
  else if (params.name.trim().length < 2) errors.name = "Please enter your full name";

  if (!params.email.trim()) errors.email = "Email address is required";
  else if (!validateEmail(params.email)) errors.email = "Please enter a valid email address";

  if (params.phone && params.phone.trim().length > 0 && params.phone.trim().length < 7)
    errors.phone = "Please enter a valid phone number";

  if (!params.range?.from || !params.range?.to || params.nights < 1)
    errors.dates = "Please select check-in and check-out dates";

  if (params.guests < 1) errors.guests = "At least 1 guest is required";
  else if (params.guests > params.capacity)
    errors.guests = `This room sleeps up to ${params.capacity} guest${params.capacity !== 1 ? "s" : ""}`;

  return errors;
}

// ─── Field wrapper with inline error ─────────────────────────────────────────

const Field = ({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label className={cn("text-sm font-medium", error && "text-destructive")}>
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {children}
    {error ? (
      <p className="flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

// ─── Image carousel ───────────────────────────────────────────────────────────

const ImageCarousel = ({ images, title }: { images: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-muted group">
        <img
          src={images[idx]}
          alt={`${title} — photo ${idx + 1}`}
          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
          onClick={() => setLightbox(true)}
          loading="eager"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === idx ? "bg-white scale-125" : "bg-white/50 hover:bg-white/80"
                  )}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
            {idx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
                i === idx ? "border-primary" : "border-transparent opacity-60 hover:opacity-90"
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={images[idx]}
            alt={title}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const RoomDetail = () => {
  const { propertyId, roomId } = useParams();
  const { room, property, loading } = useRoom(roomId);
  const { user, profile } = useAuth();

  // Form state
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [availability, setAvailability] = useState<
    "unknown" | "checking" | "available" | "unavailable"
  >("unknown");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ── Pre-fill from auth ─────────────────────────────────────────────────────
  // FIX: Always pre-fill name/email whether or not the user is logged in.
  // The original bug: fields were hidden for logged-in users (`{!user && ...}`)
  // but handleBook still validated them, causing "Name and email are required".
  useEffect(() => {
    if (user) {
      if (profile?.display_name) setName(profile.display_name);
      if (user.email) setEmail(user.email);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [user, profile]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.max(0, differenceInCalendarDays(range.to, range.from));
  }, [range]);

  const total = useMemo(
    () => nights * Number(room?.nightly_price || 0),
    [nights, room]
  );

  const fmt = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");

  // ── Availability check ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!room || !range?.from || !range?.to || nights < 1) {
      setAvailability("unknown");
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    checkAvailability(room.id, fmt(range.from), fmt(range.to))
      .then((ok) => { if (!cancelled) setAvailability(ok ? "available" : "unavailable"); })
      .catch(() => { if (!cancelled) setAvailability("unknown"); });
    return () => { cancelled = true; };
  }, [room, range, nights]);

  // Clear date error when dates change
  useEffect(() => {
    if (range?.from && range?.to) {
      setErrors((e) => ({ ...e, dates: undefined }));
    }
  }, [range]);

  // ── Blur handlers for inline validation ───────────────────────────────────

  const handleBlur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (!room) return;
    const errs = validateForm({ name, email, phone, guests, capacity: room.capacity, range, nights });
    setErrors(errs);
  };

  // ── Email confirmation helper ──────────────────────────────────────────────

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

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!room || submitting) return;

    // Mark all fields as touched so errors appear
    setTouched({ name: true, email: true, phone: true, guests: true, dates: true });

    const errs = validateForm({
      name, email, phone, guests, capacity: room.capacity, range, nights,
    });
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(errs)[0];
      document.getElementById(firstErrorKey)?.focus();
      toast.error("Please fix the errors before submitting");
      return;
    }

    if (availability === "unavailable") {
      toast.error("These dates are unavailable. Please choose different dates.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await createBooking({
        roomId: room.id,
        checkIn: fmt(range!.from),
        checkOut: fmt(range!.to),
        guests,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setBookingId(id);
      setSubmitted(true);
      toast.success("Reservation confirmed!");
      await sendConfirmationEmail(id);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Could not create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading room details…</p>
        </div>
      </div>
    );
  }
  if (!room) return <Navigate to="/stays" replace />;

  const images =
    room.images && room.images.length > 0
      ? room.images
      : property?.images?.length
        ? property.images
        : [property?.image_url || "/placeholder.svg"];

  // ── Confirmation screen ────────────────────────────────────────────────────

  if (submitted && bookingId) {
    return (
      <div className="min-h-screen bg-background py-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success card */}
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2 text-foreground">Booking confirmed!</h1>
            <p className="text-muted-foreground mb-1">
              Ref:{" "}
              <span className="font-mono font-semibold text-foreground">
                {bookingId.slice(0, 8).toUpperCase()}
              </span>
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              A confirmation has been sent to <strong>{email}</strong>
            </p>

            {/* Summary */}
            <div className="rounded-xl bg-muted/50 p-5 text-left text-sm space-y-3 mb-6 border border-border">
              {[
                ["Property", property?.title],
                ["Room", room.name],
                ["Check-in", range?.from ? format(range.from, "d MMM yyyy") : "—"],
                ["Check-out", range?.to ? format(range.to, "d MMM yyyy") : "—"],
                ["Nights", nights],
                ["Guests", guests],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-bold text-lg text-foreground">
                  ${total.toLocaleString()} {room.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment</span>
                <span className="text-amber-600 font-medium text-xs">Pay on arrival</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
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
      </div>
    );
  }

  // ── Main detail page ───────────────────────────────────────────────────────

  const bookingRules = room.booking_rules as Record<string, any> || {};
  const minNights = bookingRules.min_nights ?? 1;
  const maxNights = bookingRules.max_nights ?? 365;
  const checkInTime = bookingRules.check_in_time ?? "14:00";
  const checkOutTime = bookingRules.check_out_time ?? "12:00";

  const isFormValid = Object.keys(
    validateForm({ name, email, phone, guests, capacity: room.capacity, range, nights })
  ).length === 0;

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

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          to={`/stays/${propertyId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {property?.title || "stay"}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-10">

        {/* ── Left column: room details ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Image gallery */}
          <ImageCarousel images={images} title={room.name} />

          {/* Room header */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
                  {room.name}
                </h1>
                {room.room_type && (
                  <p className="text-muted-foreground mt-1">{room.room_type}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-serif text-2xl font-bold text-foreground">
                  ${Number(room.nightly_price).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground"> /{room.currency}/night</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground mt-4">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Sleeps {room.capacity}
              </span>
              {room.bed_config && (
                <span className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-primary" /> {room.bed_config}
                </span>
              )}
              {minNights > 1 && (
                <span className="text-xs bg-muted px-2.5 py-1 rounded-full">
                  Min {minNights} night{minNights !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {room.description && (
            <div>
              <h2 className="font-semibold text-lg mb-3 text-foreground">About this room</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {room.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-4 text-foreground">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {room.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking rules */}
          <div>
            <h2 className="font-semibold text-lg mb-3 text-foreground">Booking rules</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Min stay", `${minNights} night${minNights !== 1 ? "s" : ""}`],
                ["Max stay", `${maxNights} night${maxNights !== 1 ? "s" : ""}`],
                ["Check-in", checkInTime],
                ["Check-out", checkOutTime],
              ].map(([label, value]) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: booking widget ──────────────────────── */}
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-card shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-primary/5 border-b border-border px-6 py-4">
            <p className="font-serif text-2xl font-bold text-foreground">
              ${Number(room.nightly_price).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {room.currency}/night
              </span>
            </p>
            {nights > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {nights} night{nights !== 1 ? "s" : ""} · Total ${total.toLocaleString()}
              </p>
            )}
          </div>

          <div className="p-6 space-y-5">

            {/* Logged-in notice */}
            {user && (
              <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary px-3 py-2 rounded-lg border border-primary/20">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Booking as {profile?.display_name || user.email}</span>
              </div>
            )}

            {/* Date picker */}
            <Field label="Stay dates" required error={touched.dates ? errors.dates : undefined}>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="dates"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !range && "text-muted-foreground",
                      touched.dates && errors.dates && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    {range?.from
                      ? range.to
                        ? `${format(range.from, "d MMM")} → ${format(range.to, "d MMM yyyy")}`
                        : format(range.from, "d MMM yyyy")
                      : "Select check-in & check-out"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={(r) => {
                      setRange(r);
                      setTouched((t) => ({ ...t, dates: true }));
                      // Close after both dates selected
                      if (r?.from && r?.to) setCalendarOpen(false);
                    }}
                    numberOfMonths={2}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {range?.from && range?.to && nights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {nights} night{nights !== 1 ? "s" : ""}
                  {minNights > 1 && nights < minNights && (
                    <span className="text-amber-600 ml-1">
                      (minimum stay is {minNights} nights)
                    </span>
                  )}
                </p>
              )}
            </Field>

            {/* Guests */}
            <Field
              label="Number of guests"
              required
              error={touched.guests ? errors.guests : undefined}
              hint={`Up to ${room.capacity} guest${room.capacity !== 1 ? "s" : ""}`}
            >
              <Input
                id="guests"
                type="number"
                min={1}
                max={room.capacity}
                value={guests}
                onChange={(e) => {
                  setGuests(Math.max(1, Math.min(room.capacity, Number(e.target.value) || 1)));
                  setTouched((t) => ({ ...t, guests: true }));
                }}
                onBlur={() => handleBlur("guests")}
                className={cn(touched.guests && errors.guests && "border-destructive focus-visible:ring-destructive")}
              />
            </Field>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* FIX: Name field — always shown (was previously hidden for logged-in users) */}
            <Field
              label="Full name"
              required
              error={touched.name ? errors.name : undefined}
            >
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setTouched((t) => ({ ...t, name: true }));
                  }}
                  onBlur={() => handleBlur("name")}
                  className={cn(
                    "pl-9",
                    touched.name && errors.name && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="name"
                />
              </div>
            </Field>

            {/* FIX: Email field — always shown (was previously hidden for logged-in users) */}
            <Field
              label="Email address"
              required
              error={touched.email ? errors.email : undefined}
              hint="Booking confirmation will be sent here"
            >
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTouched((t) => ({ ...t, email: true }));
                  }}
                  onBlur={() => handleBlur("email")}
                  className={cn(
                    "pl-9",
                    touched.email && errors.email && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="email"
                />
              </div>
            </Field>

            {/* Phone */}
            <Field
              label="Phone number"
              error={touched.phone ? errors.phone : undefined}
              hint="Optional — helpful if we need to reach you"
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setTouched((t) => ({ ...t, phone: true }));
                  }}
                  onBlur={() => handleBlur("phone")}
                  className={cn(
                    "pl-9",
                    touched.phone && errors.phone && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoComplete="tel"
                />
              </div>
            </Field>

            {/* Special requests */}
            <Field label="Special requests">
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Textarea
                  id="notes"
                  placeholder="Any special requirements, accessibility needs, or requests…"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="pl-9 resize-none"
                />
              </div>
            </Field>

            {/* Availability status */}
            {availability === "checking" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking availability…
              </div>
            )}
            {availability === "unavailable" && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 px-3 py-2.5 rounded-lg border border-destructive/20">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>These dates aren't available. Please try different dates.</span>
              </div>
            )}
            {availability === "available" && nights > 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Dates are available!</span>
              </div>
            )}

            {/* Price summary */}
            {nights > 0 && (
              <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>${Number(room.nightly_price).toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""}</span>
                  <span>${total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
                  <span>Total</span>
                  <span>${total.toLocaleString()} {room.currency}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleBook}
              disabled={
                submitting ||
                availability === "unavailable" ||
                availability === "checking"
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Reserving…
                </>
              ) : (
                "Reserve now"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              No charge today. Payment is collected on arrival.
              Online payment coming soon.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RoomDetail;