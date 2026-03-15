export const CONFIG = {
    SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
    SFU_SERVER_URL:
        process.env.NEXT_PUBLIC_SFU_SERVER_URL || "http://localhost:4000",
    // Server-only URL for API routes running inside Docker.
    // In Docker, "localhost" means the container itself, so server-side
    // fetches must use the Docker service name (e.g., "media-server:4000").
    // Falls back to SFU_SERVER_URL for non-Docker environments.
    INTERNAL_SFU_URL:
        process.env.INTERNAL_SFU_URL ||
        process.env.NEXT_PUBLIC_SFU_SERVER_URL ||
        "http://localhost:4000",
};
