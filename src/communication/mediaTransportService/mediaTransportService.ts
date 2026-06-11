import { signOutWithCleanup } from "@/common/utils/signOutWithCleanup";
import useUserStore from "@/common/store/useStore";
import { CONFIG } from "@/common/utils/config";
import { logger } from "@/common/utils/logger";
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
import { StatusClientService } from "@/communication/status/statusService";
import { ActivityClientService } from "@/communication/activity/activityService";
import { SfuEvents } from "@/types/sfuEvents";
import {
    emitWithTimeout,
    SFU_TIMEOUTS,
    validateNoError,
} from "@/communication/utils/emitWithTimeout";


export class MediaTransportService {
    private static instance: MediaTransportService | null = null;
    public socket: ReturnType<typeof io>;
    public device: Device | null = null;

    public recvTransport: Transport | null = null;
    public sendTransport: Transport | null = null;
    public resetting = false;
    private isFirstSfuInit = true;

    constructor(jwtToken?: string) {
        this.socket = io(CONFIG.SFU_SERVER_URL, {
            autoConnect: false,
            auth: {
                token: jwtToken || "",
                chatProtocolVersion: 2,
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
            logger.log(
                "MediaTransport socket connection error:",
                error.message,
            );
        });

        this.socket.on("disconnect", (reason: string) => {
            logger.log("MediaTransport socket disconnected:", reason);
        });

        this.socket.on(SfuEvents.SFU_INITIALIZED, async () => {
            const statusClient = StatusClientService.init(this.socket);
            statusClient.setupListeners();
            statusClient.fetchDefinitions().catch((err) => logger.error("Failed to fetch status definitions:", err));

            ActivityClientService.getInstance().init(this.socket).setupListeners();

            // On reconnect (not first connect), re-initialize SFU transports
            if (!this.isFirstSfuInit) {
                logger.log("Socket reconnected — re-initializing SFU transports");
                await this.reinitializeSfu();

                // Re-consume existing producers if in a call
                const { default: useCallStore } = await import("@/common/store/callStore");
                if (useCallStore.getState().currentCall) {
                    const { CallSignalingService } = await import("@/communication/callSignaling/callSignalingService");
                    CallSignalingService.getInstance().loadCallProducers();
                }
            }
            this.isFirstSfuInit = false;
        });

        this.socket.on(SfuEvents.SFU_RESET, async () => {
            logger.log("SFU worker reset detected — re-initializing transports");
            await this.reinitializeSfu();
        });
    }

    /** Shared re-initialization logic for both sfuReset and socket reconnect */
    private async reinitializeSfu(): Promise<void> {
        if (this.resetting) return;
        this.resetting = true;
        this.sendTransport = null;
        this.recvTransport = null;

        const { AudioChat } = await import("@/communication/audioChat/audioChat");
        const audioChat = AudioChat.getInstance();
        const producer = audioChat.getAudioProducer();
        const hadProducer = !!producer && !producer.closed;
        audioChat.stopMic();
        audioChat.closeAllAudioConsumers();

        try {
            await this.initializeSfu();
            if (hadProducer) {
                await audioChat.joinVoiceChat();
            }
        } catch (err) {
            logger.error("Failed to re-initialize SFU:", err);
        } finally {
            this.resetting = false;
        }
    }

    public setAuthToken(jwtToken: string) {
        const token = jwtToken.trim();
        // socket.io-client v4 supports `auth` at runtime but types omit it
        const sock = this.socket as unknown as {
            auth: { token?: string; chatProtocolVersion?: number };
        };
        const auth = sock.auth ?? {};
        auth.token = token;
        auth.chatProtocolVersion = 2;
        sock.auth = auth;
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

            this.socket.once(SfuEvents.SFU_INITIALIZED, () => {
                clearTimeout(timeout);
                resolve();
            });

            this.socket.once("connect_error", (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            });

            this.socket.once("authError", (data: { code: string }) => {
                clearTimeout(timeout);
                logger.error("Server auth error:", data.code);
                if (data.code === "USER_NOT_FOUND") {
                    signOutWithCleanup({ callbackUrl: "/login" });
                }
                reject(new Error(`Auth error: ${data.code}`));
            });

            this.socket.connect();
        });
    }

    public static getInstance(jwtToken?: string) {
        if (MediaTransportService.instance) {
            if (jwtToken) {
                MediaTransportService.instance.setAuthToken(jwtToken);
            }
            return MediaTransportService.instance;
        }

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
            const t0 = performance.now();

            await this.initializeRtpCapabilities();
            console.info(`[init-timing] SFU rtpCapabilities: ${(performance.now() - t0).toFixed(1)}ms`);

            const t1 = performance.now();
            await this.createReceiveTransport();
            console.info(`[init-timing] SFU createRecvTransport: ${(performance.now() - t1).toFixed(1)}ms`);

            const t2 = performance.now();
            await this.createSendTransport();
            console.info(`[init-timing] SFU createSendTransport: ${(performance.now() - t2).toFixed(1)}ms`);

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
            const { id } = await emitWithTimeout<{ id: string }>({
                socket: this.socket,
                event: "produce",
                data: {
                    kind,
                    rtpParameters,
                    transportId: this.sendTransport!.id,
                    appData,
                },
                timeoutMs: SFU_TIMEOUTS.PRODUCE,
                validate: validateNoError,
            });
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
                await emitWithTimeout<unknown>({
                    socket: this.socket,
                    event: "connectTransport",
                    data: {
                        transportId: transport.id,
                        dtlsParameters,
                    },
                    timeoutMs: SFU_TIMEOUTS.CONNECT_TRANSPORT,
                    validate: validateNoError,
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
