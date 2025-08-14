import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Phone, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ConsultationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    propertyInterest: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Consultation Request Sent!",
      description: "We'll contact you within 24 hours to schedule your consultation.",
    });
    setIsOpen(false);
    setFormData({ name: "", email: "", phone: "", message: "", propertyInterest: "" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="consultation-btn">
          <MessageCircle className="w-5 h-5 mr-2" />
          Request Consultation
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif-luxury text-2xl text-center">
            Schedule Your Free Consultation
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Get expert advice on your real estate needs in East Legon and Greater Accra
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="+233 123 456 789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="propertyInterest">Property Interest</Label>
            <select
              id="propertyInterest"
              name="propertyInterest"
              value={formData.propertyInterest}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
            >
              <option value="">Select your interest</option>
              <option value="buying">Buying a Property</option>
              <option value="selling">Selling a Property</option>
              <option value="renting">Renting a Property</option>
              <option value="development">Development Project</option>
              <option value="architecture">Architecture & Design</option>
              <option value="consultation">General Consultation</option>
            </select>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Tell us about your specific needs, location preferences, budget range, or any questions you have..."
              rows={4}
            />
          </div>

          <div className="flex flex-col space-y-4">
            <Button type="submit" className="w-full btn-gold">
              <Send className="w-4 h-4 mr-2" />
              Send Consultation Request
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Or contact us directly:</p>
              <div className="flex justify-center space-x-6">
                <a 
                  href="tel:+233123456789" 
                  className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call Now
                </a>
                <a 
                  href="mailto:info@hochonline.com" 
                  className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email Us
                </a>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationButton;