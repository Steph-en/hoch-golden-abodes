import { GitCompareArrows } from "lucide-react";
import { useComparison } from "@/contexts/ComparisonContext";
import { Property } from "@/data/properties";
import { useToast } from "@/hooks/use-toast";

interface CompareButtonProps {
  property: Property;
  className?: string;
}

const CompareButton = ({ property, className = "" }: CompareButtonProps) => {
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useComparison();
  const { toast } = useToast();
  const inCompare = isInCompare(property.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inCompare) {
      removeFromCompare(property.id);
    } else {
      if (compareList.length >= 3) {
        toast({
          title: "Comparison limit reached",
          description: "You can compare up to 3 properties at a time.",
          variant: "destructive",
        });
        return;
      }
      addToCompare(property);
      toast({
        title: "Added to comparison",
        description: `${property.title} added. ${3 - compareList.length - 1} slots remaining.`,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
        inCompare
          ? "bg-primary text-primary-foreground"
          : "bg-white/20 text-white hover:bg-white/40"
      } ${className}`}
      title={inCompare ? "Remove from comparison" : "Add to comparison"}
    >
      <GitCompareArrows className="w-4 h-4" />
    </button>
  );
};

export default CompareButton;
