import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeBackground, loadImageFromUrl } from "@/utils/backgroundRemoval";
import logo from "@/assets/logo.jpeg";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";

const LogoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const processLogo = async () => {
    setIsProcessing(true);
    try {
      toast({
        title: "Processing Logo",
        description: "Removing white background... This may take a moment.",
      });

      // Load the original logo
      const imageElement = await loadImageFromUrl(logo);
      
      // Remove background
      const processedBlob = await removeBackground(imageElement);
      
      // Create URL for the processed image
      const url = URL.createObjectURL(processedBlob);
      setProcessedLogoUrl(url);
      
      toast({
        title: "Background Removed Successfully!",
        description: "The logo now has a transparent background.",
      });
    } catch (error) {
      console.error('Error processing logo:', error);
      toast({
        title: "Processing Failed",
        description: "There was an error removing the background. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessedLogo = () => {
    if (processedLogoUrl) {
      const link = document.createElement('a');
      link.href = processedLogoUrl;
      link.download = 'hoch-online-logo-transparent.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-background border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold mb-3">Logo Background Removal</h3>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Original Logo:</p>
          <img src={logo} alt="Original Logo" className="h-16 w-auto border rounded" />
        </div>
        
        {processedLogoUrl && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Processed Logo:</p>
            <img 
              src={processedLogoUrl} 
              alt="Processed Logo" 
              className="h-16 w-auto border rounded bg-gray-100" 
            />
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={processLogo} 
            disabled={isProcessing}
            size="sm"
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Remove Background'
            )}
          </Button>
          
          {processedLogoUrl && (
            <Button 
              onClick={downloadProcessedLogo}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoProcessor;