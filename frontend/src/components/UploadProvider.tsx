import React, { createContext, useContext, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { uploadFileInChunks, type ChunkUploadResult } from "@/lib/chunkUpload";

interface UploadContextType {
  upload: (file: File, fieldName: string) => Promise<ChunkUploadResult>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = async (file: File, _fieldName: string): Promise<ChunkUploadResult> => {
    setFilename(file.name);
    setProgress(0);
    setIsOpen(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await uploadFileInChunks(file, {
        signal: abortController.signal,
        onProgress: (p) => {
          setProgress(p);
        },
      });
      setIsOpen(false);
      return result;
    } catch (err: any) {
      setIsOpen(false);
      if (err.name === "AbortError" || err.message === "Upload cancelled by user.") {
        throw new Error("Upload cancelled by user.");
      }
      throw err;
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(false);
  };

  return (
    <UploadContext.Provider value={{ upload }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Prevent closing the dialog by clicking outside or pressing Escape
        if (!open && abortControllerRef.current) {
          return;
        }
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xl rounded-2xl p-6 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight font-sans">
              Uploading File...
            </DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 font-sans text-sm mt-1">
              Please wait while your file is uploaded in chunks to bypass server limits.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="truncate max-w-[240px] text-neutral-700 dark:text-neutral-300 font-sans">{filename}</span>
              <span className="text-primary font-mono text-base">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="font-sans border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UploadContext.Provider>
  );
};
export default UploadProvider;
