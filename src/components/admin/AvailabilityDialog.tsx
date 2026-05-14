import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash2, Plus } from "lucide-react";
import type { DateRange } from "react-day-picker";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useRoomAvailability,
  addAvailabilityBlock,
  deleteAvailabilityBlock,
} from "@/hooks/useRentals";
import type { Room } from "@/hooks/useRentals";

interface Props {
  open: boolean;
  onClose: () => void;
  room: Room | null;
}

const AvailabilityDialog = ({ open, onClose, room }: Props) => {
  const { toast } = useToast();
  const { blocks, loading, refetch } = useRoomAvailability(open ? room?.id : undefined);
  const [range, setRange] = useState<DateRange | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!room || !range?.from || !range?.to) {
      toast({ title: "Please select a date range", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await addAvailabilityBlock(
        room.id,
        format(range.from, "yyyy-MM-dd"),
        format(range.to, "yyyy-MM-dd"),
        notes.trim() || undefined
      );
      toast({ title: "Block added" });
      setRange(undefined);
      setNotes("");
      refetch();
    } catch (err: any) {
      toast({ title: "Failed to add block", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailabilityBlock(id);
      toast({ title: "Block removed" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Availability — {room?.name || "Room"}
          </DialogTitle>
        </DialogHeader>

        {/* Add new block */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
          <p className="text-sm font-semibold text-foreground">Block dates</p>

          <div className="space-y-1">
            <Label className="text-xs">Date range</Label>
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
                      ? `${format(range.from, "d MMM yyyy")} → ${format(range.to, "d MMM yyyy")}`
                      : format(range.from, "d MMM yyyy")
                    : "Select dates to block"}
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
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Maintenance, Owner stay…"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={saving || !range?.from || !range?.to}
            size="sm"
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Block
          </Button>
        </div>

        {/* Existing blocks */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Existing blocks ({blocks.length})
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No availability blocks yet.
            </p>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(block.start_date), "d MMM yyyy")}
                    {" → "}
                    {format(new Date(block.end_date), "d MMM yyyy")}
                  </p>
                  {block.notes && (
                    <p className="text-xs text-muted-foreground truncate">{block.notes}</p>
                  )}
                  {block.booking_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                      Linked to booking
                    </span>
                  )}
                </div>
                {!block.booking_id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove block?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will unblock these dates and make them available for booking again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(block.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvailabilityDialog;