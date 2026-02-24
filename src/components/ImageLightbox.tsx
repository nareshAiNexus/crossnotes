import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { X, ZoomIn, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    if (!src) return null;

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = src;
        link.download = alt || "image";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-fit h-fit max-h-[95vh] p-0 overflow-hidden bg-black/95 border-none">
                <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 flex flex-row items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <DialogTitle className="text-white text-sm font-medium truncate pointer-events-auto">
                        {alt || "Image Preview"}
                    </DialogTitle>
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={handleDownload}
                            title="Download image"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="relative flex items-center justify-center min-h-[50vh] min-w-[50vw]">
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-[95vh] object-contain transition-transform duration-300"
                        style={{ width: 'auto', height: 'auto' }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
