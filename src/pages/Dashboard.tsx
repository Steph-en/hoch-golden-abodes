import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart, MessageSquare, User, Settings, MapPin, Bed, Bath, Square, Trash2, ArrowRight,
  Eye, Building2, FileSignature, CreditCard, Receipt, Download, Upload, Loader2,
  Hotel, CalendarDays, Users, XCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { properties as staticProperties } from "@/data/properties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";
import SignaturePad from "@/components/SignaturePad";
import { useMyBookings, cancelBooking } from "@/hooks/useRentals";
import { format, isPast, parseISO } from "date-fns";
import SEO from "@/components/SEO";
import AgreementDetailsModal from "@/components/agreements/AgreementDetailsModal";
import AgreementStatusBadge from "@/components/agreements/AgreementStatusBadge";
import { resolveStatus } from "@/hooks/useAgreements";
import DashboardSidebar, { SideNavItem } from "@/components/ui/DashboardSidebar";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Pending: "bg-amber-500/10 text-amber-600",
    pending: "bg-amber-500/10 text-amber-600",
    Approved: "bg-emerald-500/10 text-emerald-600",
    confirmed: "bg-emerald-500/10 text-emerald-600",
    Confirmed: "bg-emerald-500/10 text-emerald-600",
    responded: "bg-emerald-500/10 text-emerald-600",
    completed: "bg-blue-500/10 text-blue-600",
    Rejected: "bg-red-500/10 text-red-600",
    cancelled: "bg-red-500/10 text-red-600",
    closed: "bg-muted text-muted-foreground",
    unpaid: "bg-amber-500/10 text-amber-600",
    paid: "bg-emerald-500/10 text-emerald-600",
    refunded: "bg-blue-500/10 text-blue-600",
    partial: "bg-orange-500/10 text-orange-600",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
};

const EmptyState = ({
  icon: Icon, title, description, actionLabel, actionTo,
}: { icon: any; title: string; description: string; actionLabel?: string; actionTo?: string }) => (
  <div className="text-center py-20">
    <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6">{description}</p>
    {actionLabel && actionTo && (
      <Button asChild variant="outline"><Link to={actionTo}>{actionLabel}</Link></Button>
    )}
  </div>
);

const PropertyCard = ({ property, onRemove }: { property: any; onRemove: () => void }) => (
  <div className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img src={property.image} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <button onClick={onRemove} className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
      <div className="absolute bottom-3 left-3"><span className="text-xl font-display font-bold text-white">{property.price}</span></div>
    </div>
    <div className="p-5">
      <h3 className="font-semibold text-foreground mb-1">{property.title}</h3>
      <div className="flex items-center text-muted-foreground text-sm mb-3"><MapPin className="w-3.5 h-3.5 mr-1" />{property.location}</div>
      {property.beds > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground border-t border-border pt-3">
          <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.beds}</span>
          <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.baths}</span>
          <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5" />{property.sqft}</span>
        </div>
      )}
      <Link to={`/property/${property.id}`}>
        <Button variant="outline" size="sm" className="w-full mt-4 group/btn">
          View Details <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </Link>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// My Bookings section
// ─────────────────────────────────────────────────────────────

const MyBookingsTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const { bookings, loading, refetch } = useMyBookings(userId);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = bookings.filter((b) =>
    filter === "all" || b.status === filter
  );

  const upcoming = bookings.filter(
    (b) => !isPast(parseISO(b.check_in)) && b.status !== "cancelled"
  ).length;
  const past = bookings.filter(
    (b) => isPast(parseISO(b.check_out)) || b.status === "completed"
  ).length;

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await cancelBooking(id);
      toast({ title: "Booking cancelled" });
      refetch();
    } catch (err: any) {
      toast({ title: "Could not cancel", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">Loading your stays…</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Hotel}
        title="No stays yet"
        description="Explore hotels and serviced apartments and book your next stay."
        actionLabel="Browse Stays"
        actionTo="/stays"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Bookings", value: bookings.length },
          { label: "Upcoming", value: upcoming },
          { label: "Past", value: past },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-semibold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All Stays" : s}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No bookings match this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const isUpcoming =
              !isPast(parseISO(booking.check_in)) &&
              !["cancelled", "completed"].includes(booking.status);
            const canCancel =
              ["pending", "confirmed"].includes(booking.status) && isUpcoming;
            const isCancelling = cancelling === booking.id;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4 p-5">
                  {/* Left – details */}
                  <div className="flex-1 min-w-0">
                    {/* Property & room */}
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <h4 className="font-semibold text-foreground">
                        {(booking as any).properties?.title || `Property #${booking.property_id}`}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {(booking as any).rooms?.name || "Room"}
                        {(booking as any).rooms?.room_type
                          ? ` · ${(booking as any).rooms.room_type}`
                          : ""}
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        {format(parseISO(booking.check_in), "d MMM yyyy")}
                        {" → "}
                        {format(parseISO(booking.check_out), "d MMM yyyy")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Hotel className="w-4 h-4" />
                        {booking.nights} night{booking.nights !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Ref + notes */}
                    <p className="text-xs text-muted-foreground">
                      Ref: <span className="font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                    {booking.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{booking.notes}"</p>
                    )}
                  </div>

                  {/* Right – amount + status */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-display text-xl font-semibold text-foreground">
                      ${Number(booking.total_amount).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {booking.currency}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={booking.status} />
                      <StatusBadge status={booking.payment_status} />
                    </div>

                    {booking.payment_status === "unpaid" &&
                      booking.status !== "cancelled" && (
                        <p className="text-xs text-muted-foreground text-right">
                          Pay on arrival — online payment coming soon.
                        </p>
                      )}

                    {canCancel && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/5 mt-1"
                            disabled={isCancelling}
                          >
                            {isCancelling ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                            )}
                            Cancel Stay
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your stay at{" "}
                              <strong>
                                {(booking as any).properties?.title || "this property"}
                              </strong>{" "}
                              from{" "}
                              <strong>
                                {format(parseISO(booking.check_in), "d MMM yyyy")}
                              </strong>{" "}
                              will be cancelled. Please review the cancellation policy before
                              proceeding.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancel(booking.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Stay
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <Link
                      to={`/stays/${booking.property_id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View property <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { favorites, toggleFavorite } = useFavorites();

  type TabId =
    | "favorites" | "bookings" | "properties" | "agreements"
    | "payments" | "invoices" | "inquiries" | "profile";

  const [activeTab, setActiveTab] = useState<TabId>("favorites");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [myProperties, setMyProperties] = useState<number[]>([]);
  // ── FIX: store DB property records so cards render even when IDs
  //        don't exist in the local static properties array ──────────
  const [dbProperties, setDbProperties] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({ display_name: "", phone: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);

  const [inquiryFilter, setInquiryFilter] = useState("all");
  const [inquirySort, setInquirySort] = useState("newest");

  // Payment form
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Signature
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw");
  const [signingAgreementId, setSigningAgreementId] = useState<string | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [submittingSig, setSubmittingSig] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        display_name: profile.display_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    const [inqRes, agrRes, payRes, invRes] = await Promise.all([
      (supabase as any).from("inquiries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("agreements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setInquiries(inqRes.data || []);
    setAgreements(agrRes.data || []);
    setPayments(payRes.data || []);
    setInvoices(invRes.data || []);

    const approvedProps = (agrRes.data || [])
      .filter((a: any) => a.approval_status === "Approved")
      .map((a: any) => a.property_id);
    const uniquePropIds = [...new Set(approvedProps)] as number[];
    setMyProperties(uniquePropIds);

    // ── FIX: fetch all property IDs referenced across agreements,
    //         payments, invoices and inquiries from Supabase so cards
    //         render correctly regardless of static-data coverage ─────
    const allReferencedIds = [
      ...uniquePropIds,
      ...(payRes.data  || []).map((p: any) => p.property_id),
      ...(invRes.data  || []).map((i: any) => i.property_id),
      ...(inqRes.data  || []).map((i: any) => i.property_id),
      ...(agrRes.data  || []).map((a: any) => a.property_id),
    ].filter(Boolean);

    const uniqueRefIds = [...new Set(allReferencedIds)] as number[];

    if (uniqueRefIds.length > 0) {
      const { data: propsData } = await (supabase as any)
        .from("properties")
        .select("*")          // avoids 400 from unknown column names
        .in("id", uniqueRefIds);
      setDbProperties(propsData || []);
    }
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agreements" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const favoriteProperties = staticProperties.filter((p) => favorites.includes(p.id));

  const filteredInquiries = inquiries
    .filter((i: any) => inquiryFilter === "all" || i.status === inquiryFilter)
    .sort((a: any, b: any) => {
      if (inquirySort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile(profileForm);
    toast(error ? { title: "Error saving profile", variant: "destructive" as const } : { title: "Profile updated!" });
    setSaving(false);
  };

  // ── FIX: look up property from DB first, fall back to static array ──
  // Uses select("*") so we get whatever columns exist, then tries every
  // plausible column-name variant your schema might use.
  const getProperty = (id: number) => {
    const db = dbProperties.find((p) => p.id === id);
    if (db) {
      return {
        id:       db.id,
        title:    db.title    || db.name || `Property #${id}`,
        location: db.location || db.address || db.city || "",
        price:    db.price    || db.listing_price || "",
        // Try every image column name variant
        image:    db.image_url   || db.image      || db.thumbnail ||
                  db.cover_image || db.photo_url  || db.images?.[0] || "",
        // Try every bedroom/bathroom/area column name variant
        beds:     db.bedrooms  ?? db.beds  ?? db.bedroom_count  ?? 0,
        baths:    db.bathrooms ?? db.baths ?? db.bathroom_count ?? 0,
        sqft:     db.area ?? db.sqft ?? db.size ?? db.floor_area ?? "",
      };
    }
    // Fall back to local static data for properties that pre-date the DB
    return staticProperties.find((p) => p.id === id) ?? null;
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error || !data?.html) { toast({ title: "Failed to generate invoice", variant: "destructive" }); return; }
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.onload = () => win.print();
    } catch {
      toast({ title: "Failed to generate invoice", variant: "destructive" });
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPropertyId || !paymentAmount) return;
    setSubmittingPayment(true);

    let receiptPath: string | null = null;
    let receiptUrl: string | null = null;

    if (receiptFile) {
      const storagePath = `${user.id}/${Date.now()}_${receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(storagePath, receiptFile, { upsert: false });

      if (uploadErr) {
        toast({ title: "Receipt upload failed", description: uploadErr.message, variant: "destructive" });
        setSubmittingPayment(false);
        return;
      }

      receiptPath = storagePath;
      const { data: signedData } = await supabase.storage
        .from("receipts")
        .createSignedUrl(storagePath, 3600);
      receiptUrl = (signedData as any)?.signedUrl || null;
    }

    const { data: paymentRecord, error: payErr } = await (supabase as any)
      .from("payments")
      .insert({
        user_id: user.id,
        property_id: parseInt(selectedPropertyId),
        amount: parseFloat(paymentAmount),
        receipt_url: receiptUrl,
        receipt_path: receiptPath,
        status: "Pending",
        verification_status: "pending",
        payment_method: "bank_transfer",
      })
      .select("id")
      .single();

    if (payErr) {
      toast({ title: "Failed to submit payment", variant: "destructive" });
      setSubmittingPayment(false);
      return;
    }

    if (receiptPath && paymentRecord?.id) {
      await (supabase as any).from("payment_documents").insert({
        payment_id: paymentRecord.id,
        user_id: user.id,
        file_url: receiptUrl,
        file_path: receiptPath,
        file_name: receiptFile?.name || null,
        file_type: receiptFile?.type || null,
        file_size: receiptFile?.size || null,
        verification_status: "pending",
      });

      await (supabase as any).rpc("log_payment_action", {
        _payment_id: paymentRecord.id,
        _action: "submitted",
        _new_status: "pending",
        _metadata: {
          has_document: true,
          file_name: receiptFile?.name,
          file_type: receiptFile?.type,
        },
      });
    }

    toast({
      title: "Payment submitted!",
      description: "Your payment proof has been received and is pending verification.",
    });

    setPaymentAmount("");
    setReceiptFile(null);
    setSelectedPropertyId("");
    fetchAll();
    setSubmittingPayment(false);
  };

  const handleSignAgreement = async (agreementId: string) => {
    if (!user || !signatureData) return;
    setSubmittingSig(true);
    const blob = await fetch(signatureData).then((r) => r.blob());
    const sigPath = `${user.id}/${Date.now()}_signature.png`;
    await supabase.storage.from("signatures").upload(sigPath, blob);
    const { data: sigUrlData } = supabase.storage.from("signatures").getPublicUrl(sigPath);
    let signedDocUrl = null;
    if (signedFile) {
      const docPath = `${user.id}/${Date.now()}_${signedFile.name}`;
      await supabase.storage.from("agreements").upload(docPath, signedFile);
      const { data: docUrlData } = supabase.storage.from("agreements").getPublicUrl(docPath);
      signedDocUrl = docUrlData.publicUrl;
    }
    await (supabase as any).from("agreements").update({
      signature_url: sigUrlData.publicUrl, signature_type: signatureType,
      signed_document_url: signedDocUrl, updated_at: new Date().toISOString(),
    }).eq("id", agreementId);
    toast({ title: "Agreement signed!", description: "Awaiting admin approval." });
    setSigningAgreementId(null);
    setSignatureData(null);
    setSignedFile(null);
    fetchAll();
    setSubmittingSig(false);
  };

  if (loading || !user) return null;

  const propertyInvoiceMap: Record<number, any> = {};
  invoices.forEach((inv) => { propertyInvoiceMap[inv.property_id] = inv; });

  const navItems: SideNavItem[] = [
    { id: "favorites",   label: "Favorites",      icon: Heart,          count: favoriteProperties.length },
    { id: "bookings",    label: "My Stays",        icon: Hotel },
    { id: "properties",  label: "My Properties",   icon: Building2,      count: myProperties.length },
    { id: "agreements",  label: "Agreements",      icon: FileSignature,  count: agreements.length },
    { id: "payments",    label: "Payments",        icon: CreditCard,     count: payments.length },
    { id: "invoices",    label: "Invoices",        icon: Receipt,        count: invoices.length },
    { id: "inquiries",   label: "Inquiries",       icon: MessageSquare,  count: inquiries.length },
    { id: "profile",     label: "Profile",         icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <SEO
        title="Your Dashboard | Hoch Online"
        description="Manage your favourite properties, stays, enquiries, agreements and payments."
        path="/dashboard"
        noIndex
      />

      {/* ── Sidebar ── */}
      <DashboardSidebar
        items={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        heading={profile?.display_name || "My Dashboard"}
        subheading={user.email}
      />

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground capitalize">
              {navItems.find(n => n.id === activeTab)?.label ?? "Dashboard"}
            </h1>
          </motion.div>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

          {/* ── Favorites ── */}
          {activeTab === "favorites" && (
            favoriteProperties.length === 0 ? (
              <EmptyState icon={Heart} title="No favorites yet" description="Start exploring and save properties you love" actionLabel="Browse Properties" actionTo="/explore" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} onRemove={() => toggleFavorite(property.id)} />
                ))}
              </div>
            )
          )}

          {/* ── My Stays / Bookings ── */}
          {activeTab === "bookings" && user && <MyBookingsTab userId={user.id} />}

          {/* ── My Properties ── */}
          {activeTab === "properties" && (
            myProperties.length === 0 ? (
              <EmptyState icon={Building2} title="No properties yet" description="Properties with approved agreements will appear here" actionLabel="Browse Properties" actionTo="/explore" />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {myProperties.map((propId) => {
                  const prop = getProperty(propId);
                  const invoice = propertyInvoiceMap[propId];
                  const progress = invoice ? (invoice.amount_paid / invoice.total_amount) * 100 : 0;
                  if (!prop) return (
                    // Show a placeholder instead of silently dropping the card
                    <Card key={propId}>
                      <CardContent className="p-5 text-center text-muted-foreground text-sm">
                        Property #{propId} — details unavailable
                      </CardContent>
                    </Card>
                  );
                  return (
                    <Card key={propId}>
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-5">
                          <img src={prop.image} alt={prop.title} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{prop.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{prop.location}</p>
                            <p className="text-lg font-display font-semibold text-primary mt-2">{prop.price}</p>
                          </div>
                        </div>
                        {invoice && (
                          <div className="px-5 pb-5 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Payment Progress</span>
                              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Paid: ${invoice.amount_paid?.toLocaleString()}</span>
                              <span>Balance: ${invoice.balance?.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* ── Agreements ── */}
          {activeTab === "agreements" && (
            agreements.length === 0 ? (
              <EmptyState
                icon={FileSignature}
                title="No agreements yet"
                description="Agreements assigned by an admin will appear here"
              />
            ) : (
              <div className="space-y-4">
                {agreements.map((agr: any) => {
                  const prop = getProperty(agr.property_id);
                  const status = resolveStatus(agr);
                  const hasSigned = !!(agr.signed_document_url);
                  const isRejected = status === "rejected";
                  return (
                    <Card
                      key={agr.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                      onClick={() => setSelectedAgreement(agr)}
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {prop && (
                            <img
                              src={prop.image}
                              alt={prop.title}
                              className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">
                              {prop?.title || `Property #${agr.property_id}`}
                            </h4>
                            <div className="mt-1.5">
                              <AgreementStatusBadge status={status} size="sm" />
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <p className="text-xs text-muted-foreground">
                                Created {new Date(agr.created_at).toLocaleDateString()}
                              </p>
                              {agr.signed_uploaded_at && (
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(agr.signed_uploaded_at).toLocaleDateString()}
                                </p>
                              )}
                              {agr.verified_at && (
                                <p className="text-xs text-muted-foreground">
                                  Verified {new Date(agr.verified_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </Button>
                            {hasSigned && (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Document uploaded
                              </span>
                            )}
                            {status === "pending_signature" && (
                              <span className="text-xs text-amber-600 font-medium">
                                Signature required
                              </span>
                            )}
                          </div>
                        </div>
                        {isRejected && agr.verification_notes && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              <strong>Rejection reason:</strong> {agr.verification_notes}
                              {" "}— Please upload a corrected signed document.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* Agreement details modal */}
          <AgreementDetailsModal
            agreement={
              selectedAgreement
                ? { ...selectedAgreement, agreement_status: resolveStatus(selectedAgreement) }
                : null
            }
            open={!!selectedAgreement}
            onClose={() => setSelectedAgreement(null)}
            onStatusChange={() => { setSelectedAgreement(null); fetchAll(); }}
            isSuperAdmin={false}
            propertyTitle={
              selectedAgreement
                ? getProperty(selectedAgreement.property_id)?.title
                : undefined
            }
            propertyImage={
              selectedAgreement
                ? getProperty(selectedAgreement.property_id)?.image
                : undefined
            }
          />

          {/* ── Payments ── */}
          {activeTab === "payments" && (
            <div className="space-y-8">
              {myProperties.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-4">Submit Payment</h3>
                    <form onSubmit={handleSubmitPayment} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Property</Label>
                          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                            <SelectContent>
                              {myProperties.map((id) => {
                                const p = getProperty(id);
                                return p ? <SelectItem key={id} value={String(id)}>{p.title}</SelectItem> : null;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount ($)</Label>
                          <Input type="number" min="1" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter amount" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Upload Receipt</Label>
                        <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                      </div>
                      <Button type="submit" disabled={submittingPayment || !selectedPropertyId || !paymentAmount}>
                        {submittingPayment ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Submit Payment
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-display text-xl font-semibold text-foreground mb-4">Payment History</h3>
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No payments submitted yet</p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((pay: any) => {
                        const prop = getProperty(pay.property_id);
                        return (
                          <div key={pay.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{prop?.title || "Property"}</p>
                              <p className="text-sm text-muted-foreground">{new Date(pay.payment_date).toLocaleDateString()}</p>
                            </div>
                            <p className="font-display font-semibold text-foreground">${pay.amount?.toLocaleString()}</p>
                            <StatusBadge status={pay.status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Invoices ── */}
          {activeTab === "invoices" && (
            invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices yet" description="Invoices will appear here once your agreement is approved" />
            ) : (
              <div className="space-y-4">
                {invoices.map((inv: any) => {
                  const prop = getProperty(inv.property_id);
                  const progress = (inv.amount_paid / inv.total_amount) * 100;
                  return (
                    <Card key={inv.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {prop && <img src={prop.image} alt={prop.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{prop?.title || "Property"}</h4>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                              <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">${inv.total_amount?.toLocaleString()}</span></div>
                              <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium text-emerald-600">${inv.amount_paid?.toLocaleString()}</span></div>
                              <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium text-amber-600">${inv.balance?.toLocaleString()}</span></div>
                            </div>
                            <Progress value={progress} className="h-2 mt-3" />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(inv.id)}>
                            <Download className="w-4 h-4 mr-1" /> Download Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* ── Inquiries ── */}
          {activeTab === "inquiries" && (
            inquiries.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No inquiries yet" description="Your property inquiries will appear here" actionLabel="Browse Properties" actionTo="/explore" />
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Select value={inquiryFilter} onValueChange={setInquiryFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={inquirySort} onValueChange={setInquirySort}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  {filteredInquiries.map((inquiry: any) => {
                    const prop = getProperty(inquiry.property_id);
                    return (
                      <div
                        key={inquiry.id}
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="bg-card rounded-xl p-5 border border-border flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        {prop && <img src={prop.image} alt={prop.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{prop?.title || "General Inquiry"}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{inquiry.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(inquiry.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={inquiry.status} />
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                  {filteredInquiries.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground">No enquiries match your filters</p>
                  )}
                </div>
              </>
            )
          )}

          {/* ── Profile ── */}
          {activeTab === "profile" && (
            <div className="max-w-lg">
              <div className="bg-card rounded-2xl p-8 border border-border">
                <h3 className="font-display text-2xl font-semibold text-foreground mb-6">Profile Settings</h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={profileForm.display_name} onChange={(e) => setProfileForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+233 XXX XXX XXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself…" rows={4} />
                  </div>
                  <Button onClick={handleSaveProfile} className="btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        </div>
      </main>

      <EnquiryDetailModal inquiry={selectedInquiry} open={!!selectedInquiry} onClose={() => setSelectedInquiry(null)} onStatusChange={fetchAll} />
    </div>
  );
};

export default Dashboard;