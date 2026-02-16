import { RtpParameters } from "mediasoup-client/types";

export interface Room {
    participants: Map<string, string>; 
    producers: Map<string, string>; 
    consumers: Map<string, string>; 

    createdAt: Date;
    settings: {
        maxSharers: number;
        recordingEnabled: boolean;
        metadata: {
            roomName: string;
            hostUserId: string;
        };
    };
}

export interface ConsumerData {
    id: string;
    producerId: string;
    kind: "audio" | "video";
    rtpParameters: RtpParameters;
    producerPaused: boolean;
}
