import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 25;

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

interface Props {
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const AgreementUploadPanel = ({
  onFileSelect,
  selectedFile,
  disabled,
  className,
  label = "Drop your signed agreement here or click to browse",
}: Props) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a PDF, JPG, PNG, or DOCX.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  };

  const processFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setValidationError(err);
        onFileSelect(null);
        return;
      }
      setValidationError(null);
      // Preview for images
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setValidationError(null);
    onFileSelect(null);
  }, [preview, onFileSelect]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  /* ── File selected ── */
  if (selectedFile) {
    const isImage = selectedFile.type.startsWith("image/");
    const FileIcon = isImage ? Image : FileText;

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileIcon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Ready to upload
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={clearFile}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ── Drop zone ── */
  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          className="hidden"
          onChange={handleInput}
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            dragOver ? "bg-primary/20" : "bg-muted"
          )}>
            <Upload className={cn("w-5 h-5", dragOver ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG, DOCX — Max {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {validationError}
        </div>
      )}
    </div>
  );
};

export default AgreementUploadPanel;