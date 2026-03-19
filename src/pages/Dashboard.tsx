import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquare, User, Settings, MapPin, Bed, Bath, Square, Trash2, ArrowRight, Clock, CheckCircle2, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { properties } from "@/data/properties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";

const Dashboard = () => {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { favorites, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<"favorites" | "inquiries" | "profile">("favorites");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    phone: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inquiryFilter, setInquiryFilter] = useState("all");
  const [inquirySort, setInquirySort] = useState("newest");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
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
    fetchInquiries();
  }, [user]);

  const fetchInquiries = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("inquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setInquiries(data || []);
  };

  const favoriteProperties = properties.filter((p) => favorites.includes(p.id));

  // Filtered & sorted inquiries
  const filteredInquiries = inquiries
    .filter((i: any) => inquiryFilter === "all" || i.status === inquiryFilter)
    .sort((a: any, b: any) => {
      if (inquirySort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile(profileForm);
    if (error) {
      toast({ title: "Error saving profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  if (loading || !user) return null;

  const tabs = [
    { id: "favorites" as const, label: "Favorites", icon: Heart, count: favoriteProperties.length },
    { id: "inquiries" as const, label: "Inquiries", icon: MessageSquare, count: inquiries.length },
    { id: "profile" as const, label: "Profile", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
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
        <div className="flex gap-2 mb-10 border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "favorites" && (
            <div>
              {favoriteProperties.length === 0 ? (
                <div className="text-center py-20">
                  <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-6">Start exploring and save properties you love</p>
                  <Button asChild variant="outline">
                    <Link to="/explore">Browse Properties</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteProperties.map((property) => (
                    <div key={property.id} className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={property.image} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <button
                          onClick={() => toggleFavorite(property.id)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-3">
                          <span className="text-xl font-display font-bold text-white">{property.price}</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-foreground mb-1">{property.title}</h3>
                        <div className="flex items-center text-muted-foreground text-sm mb-3">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {property.location}
                        </div>
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "inquiries" && (
            <div>
              {inquiries.length === 0 ? (
                <div className="text-center py-20">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No inquiries yet</h3>
                  <p className="text-muted-foreground">Your property inquiries will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inquiry: any) => {
                    const prop = properties.find((p) => p.id === inquiry.property_id);
                    return (
                      <div key={inquiry.id} className="bg-card rounded-xl p-5 border border-border flex flex-col md:flex-row md:items-center gap-4">
                        {prop && (
                          <img src={prop.image} alt={prop.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{prop?.title || "General Inquiry"}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{inquiry.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(inquiry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          inquiry.status === "pending"
                            ? "bg-primary/10 text-primary"
                            : inquiry.status === "responded"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-lg">
              <div className="bg-card rounded-2xl p-8 border border-border">
                <h3 className="font-display text-2xl font-semibold text-foreground mb-6">Profile Settings</h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, display_name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+233 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
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
    </div>
  );
};

export default Dashboard;
