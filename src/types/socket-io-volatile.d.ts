export {};

// The application runs socket.io-client 4.x, but existing code still uses the
// legacy @types/socket.io-client namespace. Model its supported volatile API.
declare global {
    namespace SocketIOClient {
        interface Socket {
            readonly volatile: Socket;
        }
    }
}
