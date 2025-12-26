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
        this.socket = io(CONFIG.SFU_SERVER_URL, {
            autoConnect: false,
            auth: {
                token: jwtToken || "",
            },
        });

        this.device = new Device();

        this.socket.on("connect", () => {
            if (this.socket.id) {
                useUserStore
                    .getState()
                    .updateUser({ socketId: this.socket.id });
            }
        });

        this.socket.on("connect_error", (error: Error) => {
            console.error(
                "MediaTransport socket connection error:",
                error.message,
            );
        });

        this.socket.on("disconnect", (reason: string) => {
            console.log("MediaTransport socket disconnected:", reason);
        });
    }

    public connect() {
        return new Promise<void>((resolve, reject) => {
            if (this.socket.connected) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error("MediaTransport connection timeout"));
            }, 10000);

            this.socket.once("sfuInitialized", () => {
                clearTimeout(timeout);
                resolve();
            });

            this.socket.once("connect_error", (error: Error) => {
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
        try {
            await this.initializeRtpCapabilities();

            await this.createReceiveTransport();

            await this.createSendTransport();

            this.setUserDataOnSfuServer();
        } catch (error) {
            this.recvTransport?.close();
            this.sendTransport?.close();
            this.recvTransport = null;
            this.sendTransport = null;

            const initError =
                error instanceof Error
                    ? new Error(`SFU initialization failed: ${error.message}`, {
                          cause: error,
                      })
                    : new Error(
                          "SFU initialization failed due to unknown error",
                      );

            throw initError;
        }
    }

    private setUserDataOnSfuServer() {
        const user = useUserStore.getState().user;

        if (this.socket.id) {
            useUserStore.getState().updateUser({ socketId: this.socket.id });
        }

        this.socket.emit("setUserInfo", user);
    }

    private async createReceiveTransport() {
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
                        resolve(info);
                    },
                );
            },
        );

        return transportInfo;
    }

    private async initializeRtpCapabilities() {
        if (this.device!.loaded) {
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
                        resolve(capabilities);
                    },
                );
            },
        );

        await this.device!.load({ routerRtpCapabilities });
    }
}
