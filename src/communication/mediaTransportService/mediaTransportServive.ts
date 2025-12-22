import useUserStore from "@/common/store/useStore";
import { CONFIG } from "@/common/utils/config";
import { Device } from "mediasoup-client";
import {
    DtlsParameters,
    MediaKind,
    RtpCapabilities,
    RtpParameters,
    Transport,
    TransportOptions,
} from "mediasoup-client/types";
import io from "socket.io-client";

/**
 * Don't touch singleton pattern
 * used so we don't create multiple connections when sharing audio and screenshare
 **/
export class MediaTransportService {
    private static instance: MediaTransportService | null = null;
    public socket: SocketIOClient.Socket;
    public device: Device | null = null;

    public recvTransport: Transport | null = null;
    public sendTransport: Transport | null = null;

    constructor(jwtToken?: string) {
        console.log(
            "MediaTransportService constructor - JWT token:",
            jwtToken ? "present" : "MISSING",
        );

        this.socket = io(CONFIG.SFU_SERVER_URL, {
            autoConnect: false,
            auth: {
                token: jwtToken || "",
            },
        });

        this.device = new Device();

        this.socket.on("connect", () => {
            console.log("MediaTransport socket connected successfully");
        });

        this.socket.on("connect_error", (error) => {
            console.error(
                "MediaTransport socket connection error:",
                error.message,
            );
            console.error("Full error:", error);
        });

        this.socket.on("disconnect", (reason) => {
            console.log("MediaTransport socket disconnected:", reason);
        });
    }

    public connect() {
        return new Promise<void>((resolve, reject) => {
            if (this.socket.connected) {
                console.log("MediaTransport socket already connected");
                resolve();
                return;
            }

            console.log("MediaTransport: Connecting to SFU server...");

            const timeout = setTimeout(() => {
                reject(new Error("MediaTransport connection timeout"));
            }, 10000);

            this.socket.once("sfuInitialized", () => {
                clearTimeout(timeout);
                console.log("MediaTransport: SFU Initialized and Ready!");
                resolve();
            });

            this.socket.once("connect_error", (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            this.socket.connect();
        });
    }

    public static getInstance(jwtToken?: string) {
        if (MediaTransportService.instance)
            return MediaTransportService.instance;

        MediaTransportService.instance = new MediaTransportService(jwtToken);
        return MediaTransportService.instance;
    }

    public disconnect() {
        this.recvTransport?.close();
        this.sendTransport?.close();
        this.socket.disconnect();
    }

    public async initializeSfu() {
        console.log("Initializing SFU");

        try {
            console.log("Step 1: Initializing RTP capabilities...");
            await this.initializeRtpCapabilities();
            console.log("Step 1: RTP capabilities initialized ✓");

            console.log("Step 2: Creating receive transport...");
            await this.createReceiveTransport();
            console.log("Step 2: Receive transport created ✓");

            console.log("Step 3: Creating send transport...");
            await this.createSendTransport();
            console.log("Step 3: Send transport created ✓");

            console.log("Step 4: Setting user data on SFU server...");
            this.setUserDataOnSfuServer();
            console.log("Step 4: User data set ✓");

            console.log("SFU initialization complete!");
        } catch (error) {
            console.error("SFU initialization failed:", error);
            throw error;
        }
    }

    private setUserDataOnSfuServer() {
        const user = useUserStore.getState().user;
        this.socket.emit("setUserInfo", user);
    }

    private async createReceiveTransport() {
        // If we already have a transport, don't recreate it
        if (this.recvTransport && !this.recvTransport.closed) return;

        const receiveTransportOptions =
            await this.createTransportOptions("recv");

        this.recvTransport = this.device!.createRecvTransport(
            receiveTransportOptions,
        );
        this.recvTransport.on(
            "connect",
            this.handleConnect(this.recvTransport),
        );
    }

    private async createSendTransport() {
        // If we already have a transport, don't recreate it
        if (this.sendTransport && !this.sendTransport.closed) return;

        const sendTransportOptions = await this.createTransportOptions("send");

        this.sendTransport =
            this.device!.createSendTransport(sendTransportOptions);

        this.sendTransport.on(
            "connect",
            this.handleConnect(this.sendTransport),
        );
        this.sendTransport.on("produce", this.handleProduce);
    }

    private handleProduce = async (
        {
            kind,
            rtpParameters,
            appData,
        }: {
            kind: MediaKind;
            rtpParameters: RtpParameters;
            appData: Record<string, unknown>;
        },
        callback: (data: { id: string }) => void,
        errback: (err: Error) => void,
    ) => {
        try {
            const { id } = await new Promise<{ id: string }>((resolve) =>
                this.socket.emit(
                    "produce",
                    {
                        kind,
                        rtpParameters,
                        transportId: this.sendTransport!.id,
                        appData,
                    },
                    resolve,
                ),
            );
            console.log("PRODUCING AUDIO ID");
            console.log(id);
            callback({ id });
        } catch (err) {
            errback(err as Error);
        }
    };

    private handleConnect(transport: Transport) {
        return async (
            { dtlsParameters }: { dtlsParameters: DtlsParameters },
            callback: () => void,
            errback: (err: Error) => void,
        ) => {
            try {
                await new Promise((resolve) => {
                    this.socket.emit(
                        "connectTransport",
                        {
                            transportId: transport.id,
                            dtlsParameters,
                        },
                        resolve,
                    );
                });
                callback();
            } catch (err) {
                errback(err as Error);
            }
        };
    }

    private async createTransportOptions(
        type: "send" | "recv",
    ): Promise<TransportOptions> {
        const transportInfo: TransportOptions = await new Promise(
            (resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout creating ${type} transport`));
                }, 5000);

                this.socket.emit(
                    "createTransport",
                    { type },
                    (info: TransportOptions) => {
                        clearTimeout(timeout);
                        console.log(`${type} transport options received`);
                        resolve(info);
                    },
                );
            },
        );

        return transportInfo;
    }

    private async initializeRtpCapabilities() {
        // FIX: Check if already loaded to prevent InvalidStateError
        if (this.device!.loaded) {
            console.log("Device already loaded with RTP capabilities");
            return;
        }

        const routerRtpCapabilities: RtpCapabilities = await new Promise(
            (resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(
                        new Error(
                            "Timeout waiting for router RTP capabilities",
                        ),
                    );
                }, 5000);

                this.socket.emit(
                    "getRouterRtpCapabilities",
                    {},
                    (capabilities: RtpCapabilities) => {
                        clearTimeout(timeout);
                        console.log("Received RTP capabilities from server");
                        resolve(capabilities);
                    },
                );
            },
        );

        console.log("Loading device with RTP capabilities...");
        await this.device!.load({ routerRtpCapabilities });
        console.log("Device loaded successfully");
    }
}
