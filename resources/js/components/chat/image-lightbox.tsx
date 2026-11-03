import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, XIcon } from 'lucide-react';
import {
    Dialog,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    src: string;
    alt?: string;
};

export default function ImageLightbox({ open, onOpenChange, src, alt }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/90" />
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex flex-col outline-none"
                    aria-describedby={undefined}
                >
                    <DialogTitle className="sr-only">{alt ?? 'Image preview'}</DialogTitle>

                    <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-end gap-1 p-3">
                        <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            aria-label="Download image"
                        >
                            <Download className="size-5" />
                        </a>
                        <DialogPrimitive.Close
                            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            aria-label="Close"
                        >
                            <XIcon className="size-5" />
                        </DialogPrimitive.Close>
                    </div>

                    <button
                        type="button"
                        className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-4 pt-14"
                        onClick={() => onOpenChange(false)}
                        aria-label="Close image preview"
                    >
                        <img
                            src={src}
                            alt={alt ?? 'attachment'}
                            className="max-h-[90vh] max-w-[90vw] object-contain"
                            onClick={(event) => event.stopPropagation()}
                        />
                    </button>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}
