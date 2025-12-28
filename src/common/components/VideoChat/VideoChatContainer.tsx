import React from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { VideoChatViewer } from "@/communication/videoChat/videoChatViewer";
import useUserStore from "@/common/store/useStore";

function VideoChatContainer({
    producerId,
    isExpanded,
    handleExpand,
    hasMoreThanOneSharing,
}: {
    producerId: string;
    isExpanded: boolean;
    handleExpand: (producerId: string) => void;
    hasMoreThanOneSharing: boolean;
}) {
    function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        handleExpand(producerId);
    }

    const name = useUserStore((state) => state.user.name);

    return (
        <>
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
                            ? "fixed w-[80vw] h-[85vh] top-1/2  -translate-y-1/2 z-50 border-4 border-blue-500 shadow-2xl"
                            : "relative w-48 h-32 cursor-pointer border-2 border-white/70 hover:border-blue-400 hover:scale-105"
                    }
                    ${hasMoreThanOneSharing ? "right-20" : "left-1/2 -translate-x-1/2"}
                `}
            >
                <div
                    id={producerId}
                    className="w-full h-full relative flex items-center justify-center"
                />

                <div
                    className={`
                        absolute top-0 left-0 right-0 
                        bg-gradient-to-b from-black/80 via-black/50 to-transparent 
                        p-3 flex justify-between items-center z-90
                        ${isExpanded ? "opacity-100" : "opacity-0 hover:opacity-100"}
                        transition-opacity duration-200
                    `}
                >
                    <span className="text-white text-sm font-medium drop-shadow-lg">
                        Video Chat
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={handleClick}
                            className="text-white bg-black/30 hover:bg-blue-600 p-2 rounded-md transition-colors"
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
                                className="text-white bg-black/30 hover:bg-red-600 p-2 rounded-md transition-colors"
                                title="Minimize"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="transition-all duration-300 absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40  opacity-0 hover:opacity-100">
                        <div className="bg-black/60 backdrop-blur-sm p-3 rounded-full">
                            <Maximize2 className="text-white" size={28} />
                        </div>
                    </div>
                )}

                <div className="absolute flex gap-2 items-center bottom-3 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-mono z-50">
                    <div className="green w-2 h-2 bg-green-500 rounded-full"></div>
                    {VideoChatViewer.getInstance().videoChatOwnerMap[
                        producerId
                    ] === name
                        ? "You"
                        : VideoChatViewer.getInstance().videoChatOwnerMap[
                              producerId
                          ]}
                </div>

                <div className="container"></div>
            </div>
        </>
    );
}

export default VideoChatContainer;
