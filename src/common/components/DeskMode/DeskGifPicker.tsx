import React, { useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import type { IGif } from "@giphy/js-types";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeskGifPickerProps {
    onSelectGif: (gifUrl: string) => void;
    onClose: () => void;
    inputId: string;
}

const giphyApiKey = process.env.NEXT_PUBLIC_GIPHY_PICKER;
const giphyFetch = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;

function DeskGifPicker({ onSelectGif, onClose, inputId }: DeskGifPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const fetchGifs = (offset: number) => {
        if (!giphyFetch) {
            return Promise.reject(new Error("Giphy API key is not configured"));
        }
        if (searchQuery.trim().length > 0) {
            return giphyFetch.search(searchQuery, { offset, limit: 12 });
        }
        return giphyFetch.trending({ offset, limit: 12 });
    };

    const handleGifClick = (gif: IGif, event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();

        onSelectGif(gif.images.fixed_height.url);
        onClose();

        document.getElementById(inputId)?.focus();
    };

    return (
        <div className="absolute bottom-full left-0 right-0 mb-3 rounded-lg border wd-border-subtle wd-bg-panel shadow-[0_10px_40px_rgba(0,0,0,0.45)] z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b wd-border-subtle">
                <p className="text-xs font-semibold uppercase tracking-wide wd-text-secondary">
                    GIF Picker
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="wd-btn-ghost h-7 w-7 p-0"
                    onClick={onClose}
                    onMouseDown={(event) => event.preventDefault()}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-3">
                <label className="relative block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 wd-text-muted" />
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="wd-input pl-9 h-9"
                        placeholder="Search GIFs"
                    />
                </label>
            </div>

            {!giphyFetch ? (
                <div className="px-3 pb-3 text-xs wd-text-warning">
                    GIF picker is unavailable. Add `NEXT_PUBLIC_GIPHY_PICKER` to enable it.
                </div>
            ) : (
                <div className="h-80 overflow-y-auto px-3 pb-3">
                    <Grid
                        key={searchQuery}
                        columns={3}
                        width={336}
                        fetchGifs={fetchGifs}
                        onGifClick={handleGifClick}
                        gutter={6}
                    />
                </div>
            )}
        </div>
    );
}

export default DeskGifPicker;
