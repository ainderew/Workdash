import React, { useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import type { IGif } from "@giphy/js-types";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_PICKER!);

interface GiphyPickerProps {
    onSelectGif: (gifUrl: string) => void;
    onClose: () => void;
}

function GiphyPicker({ onSelectGif, onClose }: GiphyPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const fetchGifs = (offset: number) => {
        if (searchQuery) {
            return gf.search(searchQuery, { offset, limit: 10 });
        }
        return gf.trending({ offset, limit: 10 });
    };

    const handleGifClick = (gif: IGif, e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectGif(gif.images.fixed_height.url);

        document.getElementById("chat-input")?.focus();
        onClose();
    };

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl z-100">
            <div className="flex items-center justify-between p-3 border-b border-neutral-700">
                <span className="font-semibold text-white text-sm">
                    Choose a GIF
                </span>
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                        onKeyDown={(e) => {
                            e.stopPropagation();
                        }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search GIFs"
                        className="pl-10 bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white placeholder:text-neutral-500"
                    />
                </div>
            </div>

            <div className="h-80 overflow-y-auto px-3 pb-3">
                <Grid
                    key={searchQuery}
                    columns={3}
                    width={352}
                    fetchGifs={fetchGifs}
                    onGifClick={handleGifClick}
                />
            </div>
        </div>
    );
}

export default GiphyPicker;
