import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart, MessageSquare, User, Settings, MapPin, Bed, Bath, Square, Trash2, ArrowRight,
  Eye, Building2, FileSignature, CreditCard, Receipt, Download, Upload, Loader2, Filter, BedDouble, CalendarRange
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { properties as staticProperties } from "@/data/properties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";
import SignaturePad from "@/components/SignaturePad";
import SEO from "@/components/SEO";
import { useMyBookings } from "@/hooks/useRentals";

const Dashboard = () => {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { favorites, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<"favorites" | "properties" | "agreements" | "payments" | "invoices" | "inquiries" | "bookings" | "profile">("favorites");
  const { bookings: myBookings, refetch: refetchBookings } = useMyBookings(user?.id);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({ display_name: "", phone: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
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

    // My properties = those with approved agreements
    const approvedProps = (agrRes.data || [])
      .filter((a: any) => a.approval_status === "Approved")
      .map((a: any) => a.property_id);
    setMyProperties([...new Set(approvedProps)] as number[]);
  };

  // Realtime subscriptions
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

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error || !data?.html) {
        toast({ title: "Failed to generate invoice", variant: "destructive" });
        return;
      }
      // Open invoice HTML in new tab for printing/saving as PDF
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => { win.print(); };
      }
    } catch {
      toast({ title: "Failed to generate invoice", variant: "destructive" });
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPropertyId || !paymentAmount) return;
    setSubmittingPayment(true);

    let receiptUrl = null;
    if (receiptFile) {
      const path = `${user.id}/${Date.now()}_${receiptFile.name}`;
      const { data: uploadData } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }
    }

    const { error } = await (supabase as any).from("payments").insert({
      user_id: user.id,
      property_id: parseInt(selectedPropertyId),
      amount: parseFloat(paymentAmount),
      receipt_url: receiptUrl,
      status: "Pending",
    });

    if (error) {
      toast({ title: "Failed to submit payment", variant: "destructive" });
    } else {
      toast({ title: "Payment submitted!", description: "Awaiting admin confirmation." });
      setPaymentAmount("");
      setReceiptFile(null);
      fetchAll();
    }
    setSubmittingPayment(false);
  };

  const handleSignAgreement = async (agreementId: string) => {
    if (!user || !signatureData) return;
    setSubmittingSig(true);

    // Upload signature image
    const blob = await fetch(signatureData).then(r => r.blob());
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
      signature_url: sigUrlData.publicUrl,
      signature_type: signatureType,
      signed_document_url: signedDocUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", agreementId);

    toast({ title: "Agreement signed!", description: "Awaiting admin approval." });
    setSigningAgreementId(null);
    setSignatureData(null);
    setSignedFile(null);
    fetchAll();
    setSubmittingSig(false);
  };

  if (loading || !user) return null;

  const getStaticProp = (id: number) => staticProperties.find(p => p.id === id);

  const propertyInvoiceMap: Record<number, any> = {};
  invoices.forEach(inv => { propertyInvoiceMap[inv.property_id] = inv; });

  const tabs = [
    { id: "favorites" as const, label: "Favorites", icon: Heart, count: favoriteProperties.length },
    { id: "properties" as const, label: "My Properties", icon: Building2, count: myProperties.length },
    { id: "bookings" as const, label: "My Bookings", icon: BedDouble, count: myBookings.length },
    { id: "agreements" as const, label: "Agreements", icon: FileSignature, count: agreements.length },
    { id: "payments" as const, label: "Payments", icon: CreditCard, count: payments.length },
    { id: "invoices" as const, label: "Invoices", icon: Receipt, count: invoices.length },
    { id: "inquiries" as const, label: "Inquiries", icon: MessageSquare, count: inquiries.length },
    { id: "profile" as const, label: "Profile", icon: Settings },
  ];

  const cancelBooking = async (id: string) => {
    const booking = myBookings.find(x => x.id === id);
    const { error } = await (supabase as any).from("bookings").update({ status: "cancelled" }).eq("id", id);
    toast(error ? { title: "Cancel failed", variant: "destructive" as const } : { title: "Booking cancelled" });
    if (!error && booking) {
      supabase.functions.invoke("send-notification-email", {
        body: {
          type: "booking_cancelled",
          to: booking.guest_email,
          recipientName: booking.guest_name,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          status: "cancelled",
        },
      }).catch(() => {});
    }
    refetchBookings();
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = myBookings.filter(b => b.check_out >= today && b.status !== "cancelled");
  const pastBookings = myBookings.filter(b => b.check_out < today || b.status === "cancelled");

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <SEO
        title="Your Dashboard | Hoch Online"
        description="Manage your favourite properties, enquiries, agreements and payments in your Hoch Online dashboard."
        path="/dashboard"
        noIndex
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                {profile?.display_name || "My Dashboard"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-10 border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <div>
              {favoriteProperties.length === 0 ? (
                <EmptyState icon={Heart} title="No favorites yet" description="Start exploring and save properties you love" actionLabel="Browse Properties" actionTo="/explore" />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} onRemove={() => toggleFavorite(property.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Properties Tab */}
          {activeTab === "properties" && (
            <div>
              {myProperties.length === 0 ? (
                <EmptyState icon={Building2} title="No properties yet" description="Properties with approved agreements will appear here" actionLabel="Browse Properties" actionTo="/explore" />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {(myProperties as number[]).map((propId) => {
                    const prop = getStaticProp(propId);
                    const invoice = propertyInvoiceMap[propId];
                    const progress = invoice ? (invoice.amount_paid / invoice.total_amount) * 100 : 0;
                    if (!prop) return null;
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
              )}
            </div>
          )}

          {/* Agreements Tab */}
          {activeTab === "agreements" && (
            <div>
              {agreements.length === 0 ? (
                <EmptyState icon={FileSignature} title="No agreements yet" description="Agreements assigned by the admin will appear here" />
              ) : (
                <div className="space-y-4">
                  {agreements.map((agr: any) => {
                    const prop = getStaticProp(agr.property_id);
                    const isSigning = signingAgreementId === agr.id;
                    return (
                      <Card key={agr.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-start gap-4">
                            {prop && <img src={prop.image} alt={prop.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{prop?.title || "Property"}</h4>
                              <StatusBadge status={agr.approval_status} />
                              <p className="text-xs text-muted-foreground mt-2">{new Date(agr.created_at).toLocaleDateString()}</p>
                              {agr.document_url && (
                                <a href={agr.document_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1">
                                  <Download className="w-3 h-3" /> View Agreement Document
                                </a>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {agr.approval_status === "Pending" && !agr.signature_url && (
                                <Button size="sm" onClick={() => setSigningAgreementId(isSigning ? null : agr.id)}>
                                  <FileSignature className="w-4 h-4 mr-1" /> {isSigning ? "Cancel" : "Sign"}
                                </Button>
                              )}
                              {agr.signature_url && (
                                <span className="text-xs text-emerald-600 font-medium">✓ Signed</span>
                              )}
                            </div>
                          </div>
                          {isSigning && (
                            <div className="mt-6 border-t border-border pt-6 space-y-4">
                              <h5 className="font-semibold text-foreground">Sign Agreement</h5>
                              <SignaturePad onSignatureChange={(data, type) => { setSignatureData(data); setSignatureType(type); }} />
                              <div className="space-y-2">
                                <Label>Upload Signed Document (optional)</Label>
                                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setSignedFile(e.target.files?.[0] || null)} />
                              </div>
                              <Button onClick={() => handleSignAgreement(agr.id)} disabled={!signatureData || submittingSig}>
                                {submittingSig ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                                Submit Signature
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-8">
              {/* Payment Form */}
              {myProperties.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Submit Payment</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitPayment} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Property</Label>
                          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                            <SelectContent>
                              {(myProperties as number[]).map(id => {
                                const p = getStaticProp(id);
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

              {/* Payment summary per property */}
              {selectedPropertyId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Summary — {getStaticProp(parseInt(selectedPropertyId))?.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const inv = propertyInvoiceMap[parseInt(selectedPropertyId)];
                      if (!inv) return <p className="text-muted-foreground">No invoice yet for this property.</p>;
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 bg-muted/50 rounded-xl text-center">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-xl font-display font-semibold text-foreground">${inv.total_amount?.toLocaleString()}</p>
                          </div>
                          <div className="p-4 bg-emerald-500/10 rounded-xl text-center">
                            <p className="text-sm text-muted-foreground">Paid</p>
                            <p className="text-xl font-display font-semibold text-emerald-600">${inv.amount_paid?.toLocaleString()}</p>
                          </div>
                          <div className="p-4 bg-amber-500/10 rounded-xl text-center">
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className="text-xl font-display font-semibold text-amber-600">${inv.balance?.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Payment History */}
              <Card>
                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No payments submitted yet</p>
                  ) : (
                    <div className="space-y-3">
                      {payments
                        .filter(p => !selectedPropertyId || p.property_id === parseInt(selectedPropertyId))
                        .map((pay: any) => {
                          const prop = getStaticProp(pay.property_id);
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

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="Invoices will appear here once your agreement is approved" />
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv: any) => {
                    const prop = getStaticProp(inv.property_id);
                    const progress = (inv.amount_paid / inv.total_amount) * 100;
                    return (
                      <Card key={inv.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {prop && <img src={prop.image} alt={prop.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{prop?.title || "Property"}</h4>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                <div><span className="text-muted-foreground">Total:</span> <span className="font-medium text-foreground">${inv.total_amount?.toLocaleString()}</span></div>
                                <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium text-emerald-600">${inv.amount_paid?.toLocaleString()}</span></div>
                                <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium text-amber-600">${inv.balance?.toLocaleString()}</span></div>
                              </div>
                              <Progress value={progress} className="h-2 mt-3" />
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(inv.id)}>
                                <Download className="w-4 h-4 mr-1" /> Download Invoice
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inquiries Tab */}
          {activeTab === "inquiries" && (
            <div>
              {inquiries.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No inquiries yet" description="Your property inquiries will appear here" actionLabel="Browse Properties" actionTo="/explore" />
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <Select value={inquiryFilter} onValueChange={setInquiryFilter}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={inquirySort} onValueChange={setInquirySort}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    {filteredInquiries.map((inquiry: any) => {
                      const prop = staticProperties.find((p) => p.id === inquiry.property_id);
                      return (
                        <div key={inquiry.id} onClick={() => setSelectedInquiry(inquiry)} className="bg-card rounded-xl p-5 border border-border flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
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
                    {filteredInquiries.length === 0 && <p className="text-center py-10 text-muted-foreground">No enquiries match your filters</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div className="space-y-8">
              {myBookings.length === 0 ? (
                <EmptyState icon={BedDouble} title="No bookings yet" description="Reserve a stay to see your reservations here" actionLabel="Browse Stays" actionTo="/stays" />
              ) : (
                <>
                  {[
                    { title: "Upcoming & current", items: upcomingBookings, allowCancel: true },
                    { title: "Past & cancelled", items: pastBookings, allowCancel: false },
                  ].map((section) => (
                    <Card key={section.title}>
                      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange className="w-5 h-5 text-primary" /> {section.title} ({section.items.length})</CardTitle></CardHeader>
                      <CardContent>
                        {section.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {section.items.map((b: any) => (
                              <div key={b.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-muted/30">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground">Booking #{b.id.slice(0, 8)}</p>
                                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s)</p>
                                </div>
                                <p className="font-display font-semibold text-foreground">{b.currency} {Number(b.total_amount).toLocaleString()}</p>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={b.status} />
                                  <PaymentBadge status={b.payment_status} />
                                </div>
                                <Link to={`/stays/${b.property_id}/rooms/${b.room_id}`}>
                                  <Button size="sm" variant="outline">View</Button>
                                </Link>
                                {section.allowCancel && b.status !== "cancelled" && (
                                  <Button size="sm" variant="destructive" onClick={() => cancelBooking(b.id)}>Cancel</Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Profile Tab */}
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
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={4} />
                  </div>
                  <Button onClick={handleSaveProfile} className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <EnquiryDetailModal inquiry={selectedInquiry} open={!!selectedInquiry} onClose={() => setSelectedInquiry(null)} onStatusChange={fetchAll} />
    </div>
  );
};

// Helper components
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Pending: "bg-amber-500/10 text-amber-600",
    pending: "bg-amber-500/10 text-amber-600",
    Approved: "bg-emerald-500/10 text-emerald-600",
    Confirmed: "bg-emerald-500/10 text-emerald-600",
    responded: "bg-emerald-500/10 text-emerald-600",
    Rejected: "bg-red-500/10 text-red-600",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
};

const PaymentBadge = ({ status }: { status?: string }) => {
  const s = (status || "unpaid").toLowerCase();
  const styles: Record<string, string> = {
    unpaid: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/10 text-amber-600",
    paid: "bg-emerald-500/10 text-emerald-600",
    refunded: "bg-blue-500/10 text-blue-600",
    failed: "bg-red-500/10 text-red-600",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[s] || styles.unpaid}`}>
      {s}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, description, actionLabel, actionTo }: { icon: any; title: string; description: string; actionLabel?: string; actionTo?: string }) => (
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
      <button onClick={onRemove} className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        <Button variant="outline" size="sm" className="w-full mt-4 group/btn">View Details <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" /></Button>
      </Link>
    </div>
  </div>
);

export default Dashboard;
