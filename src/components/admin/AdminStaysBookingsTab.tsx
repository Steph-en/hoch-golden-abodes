import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Search, CheckCircle2, XCircle, DollarSign, CalendarDays,
  Users, Loader2, CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminBookings, updateBookingStatus } from "@/hooks/useRentals";
import type { RentalProperty, BookingWithDetails } from "@/hooks/useRentals";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  rentalProperties: RentalProperty[];
}

const BOOKING_STATUSES = ["all", "pending", "confirmed", "cancelled", "completed"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partial"];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    confirmed: "bg-emerald-500/10 text-emerald-600",
    cancelled: "bg-red-500/10 text-red-600",
    completed: "bg-blue-500/10 text-blue-600",
  };
  return map[status] || "bg-muted text-muted-foreground";
};

const paymentBadge = (status: string) => {
  const map: Record<string, string> = {
    unpaid: "bg-amber-500/10 text-amber-600",
    paid: "bg-emerald-500/10 text-emerald-600",
    refunded: "bg-blue-500/10 text-blue-600",
    partial: "bg-orange-500/10 text-orange-600",
  };
  return map[status] || "bg-muted text-muted-foreground";
};

const AdminStaysBookingsTab = ({ rentalProperties }: Props) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filters = {
    status: statusFilter,
    propertyId: propertyFilter !== "all" ? Number(propertyFilter) : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    search: search.trim() || undefined,
  };

  const { bookings, loading, refetch } = useAdminBookings(filters);

  const sendBookingEmail = async (
    type: "booking_confirmed" | "booking_cancelled",
    booking: BookingWithDetails
  ) => {
    try {
      await supabase.functions.invoke("send-booking-email", {
        body: {
          type,
          guestEmail: booking.guest_email,
          guestName: booking.guest_name,
          propertyTitle: booking.properties?.title || "your stay",
          roomName: booking.rooms?.name || "",
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          nights: booking.nights,
          total: booking.total_amount,
          currency: booking.currency,
          bookingRef: booking.id.slice(0, 8).toUpperCase(),
        },
      });
    } catch {
      // Non-fatal — email delivery is best-effort
    }
  };

  const handleStatusChange = async (
    booking: BookingWithDetails,
    status: string,
    paymentStatus?: string
  ) => {
    setUpdating(booking.id);
    try {
      await updateBookingStatus(booking.id, status, paymentStatus);
      toast({ title: `Booking ${status}` });
      if (status === "confirmed") await sendBookingEmail("booking_confirmed", booking);
      if (status === "cancelled") await sendBookingEmail("booking_cancelled", booking);
      refetch();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const totalRevenue = useMemo(
    () => bookings.filter((b) => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount), 0),
    [bookings]
  );
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: bookings.length, icon: CalendarCheck },
          { label: "Pending", value: pendingCount, icon: CalendarDays },
          { label: "Confirmed", value: bookings.filter((b) => b.status === "confirmed").length, icon: CheckCircle2 },
          { label: "Revenue (paid)", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-display font-semibold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest name / email…"
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All Statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
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

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-38"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-38"
            placeholder="To"
          />
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFromDate(""); setToDate(""); }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Loading bookings…</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <CalendarCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No bookings found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Property / Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const isUpdating = updating === booking.id;
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{booking.guest_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
                        {booking.guest_phone && (
                          <p className="text-xs text-muted-foreground">{booking.guest_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {booking.properties?.title || `Property #${booking.property_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.rooms?.name || "—"}
                          {booking.rooms?.room_type && ` · ${booking.rooms.room_type}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">
                          {format(new Date(booking.check_in), "d MMM")}
                          {" → "}
                          {format(new Date(booking.check_out), "d MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.nights} night{booking.nights !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {booking.guests}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm text-foreground">
                        ${Number(booking.total_amount).toLocaleString()} {booking.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(booking.nightly_price).toLocaleString()}/night
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.payment_status}
                        onValueChange={(v) =>
                          handleStatusChange(booking, booking.status, v)
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isUpdating && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {booking.status === "pending" && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => handleStatusChange(booking, "confirmed")}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => handleStatusChange(booking, "completed", "paid")}
                            disabled={isUpdating}
                          >
                            Complete
                          </Button>
                        )}
                        {["pending", "confirmed"].includes(booking.status) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs"
                                disabled={isUpdating}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The booking for {booking.guest_name} will be cancelled and they
                                  will receive a notification email.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleStatusChange(booking, "cancelled")}
                                >
                                  Cancel Booking
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminStaysBookingsTab;