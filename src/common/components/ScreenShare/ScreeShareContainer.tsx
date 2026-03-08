import React from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { ScreenShareViewer } from "@/communication/screenShare/screenShareViewer";

function ScreeShareContainer({
    producerId,
    isExpanded,
    handleExpand,
    
}: {
    producerId: string;
    isExpanded: boolean;
    handleExpand: (producerId: string) => void;
    hasMoreThanOneSharing: boolean;
}) {
    function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        console.log("🖱️ Clicked video:", producerId, "isExpanded:", isExpanded);
        handleExpand(producerId);
    }

    return (
        <>
            {}
            {isExpanded && (
                <div
                    className="backdrop fixed inset-0 bg-black/85 z-40 backdrop-blur-sm"
                    onClick={handleClick}
                />
            )}

            <div
                onClick={!isExpanded ? handleClick : undefined}
                className={`
                    rounded-lg overflow-hidden 
                    transition-all duration-300 ease-in-out
                    bg-black

                    ${
                        isExpanded
                            ? "fixed w-[80vw] h-[85vh] right-20 top-1/2  -translate-y-1/2 z-50 border-4 border-[var(--wd-accent)] shadow-2xl"
                            : "relative w-48 h-32 cursor-pointer left-0 border-2 wd-border-strong hover:border-[var(--wd-accent)] hover:scale-105"
                    }
                `}
            >
                {/*Attach Video*/}
                <div
                    id={producerId}
                    className="w-full h-full relative flex items-center justify-center"
                />

                <div
                    className={`
                        absolute top-0 left-0 right-0 
                        bg-gradient-to-b from-black/80 via-black/50 to-transparent 
                        p-3 flex justify-between items-center z-50
                        ${isExpanded ? "opacity-100" : "opacity-0 hover:opacity-100"}
                        transition-opacity duration-200
                    `}
                >
                    <span className="text-white text-sm font-medium drop-shadow-lg">
                        Screen Share
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={handleClick}
                            className="text-white bg-black/30 hover:bg-[var(--wd-accent)] p-2 rounded-md transition-colors"
                            title={isExpanded ? "Minimize" : "Maximize"}
                        >
                            {isExpanded ? (
                                <Minimize2 size={18} />
                            ) : (
                                <Maximize2 size={18} />
                            )}
                        </button>

                        {isExpanded && (
                            <button
                                onClick={handleClick}
                                className="text-white bg-black/30 hover:bg-[var(--wd-danger)] p-2 rounded-md transition-colors"
                                title="Minimize"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-sm p-3 rounded-full">
                            <Maximize2 className="text-white" size={28} />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-mono z-50">
                    {ScreenShareViewer.getInstance().videoOwnerMap[producerId]}
                </div>
            </div>
        </>
    );
}

export default ScreeShareContainer;
