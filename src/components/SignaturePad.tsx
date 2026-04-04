import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eraser, PenTool, Type } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null, type: "draw" | "type") => void;
}

const SignaturePad = ({ onSignatureChange }: SignaturePadProps) => {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "hsl(var(--foreground))";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx || !lastPoint.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL("image/png"), "draw");
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange(null, "draw");
  };

  useEffect(() => {
    if (mode === "type" && typedName) {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = "italic 48px 'Georgia', serif";
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedName, 300, 75);
        onSignatureChange(canvas.toDataURL("image/png"), "type");
      }
    }
  }, [typedName, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("draw")}
        >
          <PenTool className="w-4 h-4 mr-1" /> Draw
        </Button>
        <Button
          type="button"
          variant={mode === "type" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("type")}
        >
          <Type className="w-4 h-4 mr-1" /> Type
        </Button>
      </div>

      {mode === "draw" ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full h-32 border-2 border-dashed border-border rounded-xl cursor-crosshair bg-background touch-none"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="absolute top-2 right-2"
          >
            <Eraser className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-1">Draw your signature above</p>
        </div>
      ) : (
        <div>
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className="text-lg"
          />
          {typedName && (
            <div className="mt-3 p-4 border border-border rounded-xl bg-background">
              <p className="text-3xl italic font-serif text-foreground text-center">{typedName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
