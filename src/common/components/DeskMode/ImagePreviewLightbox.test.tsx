import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const getChatFilePreviewUrlMock = vi.fn();
const downloadChatFileMock = vi.fn();
const invalidateCachedUrlMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/communication/chatV2/uploadService", () => ({
    getChatFilePreviewUrl: (fileId: string) =>
        getChatFilePreviewUrlMock(fileId),
    downloadChatFile: (fileId: string) => downloadChatFileMock(fileId),
}));

vi.mock("@/communication/chatV2/urlCacheService", () => ({
    invalidateCachedUrl: (fileId: string) => invalidateCachedUrlMock(fileId),
}));

vi.mock("sonner", () => ({
    toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("next/image", () => {
    const NextImageMock = ({
        src,
        alt,
        onError,
    }: {
        src: string;
        alt: string;
        onError?: () => void;
    }) => (
        <img
            src={src}
            alt={alt}
            onError={onError}
            data-testid="lightbox-img"
        />
    );
    NextImageMock.displayName = "NextImageMock";
    return { default: NextImageMock };
});

vi.mock("framer-motion", () => {
    const passthrough = (Tag: keyof JSX.IntrinsicElements) => {
        const Component = ({
            children,
            drag: _drag,
            dragMomentum: _dragMomentum,
            dragElastic: _dragElastic,
            onDragEnd: _onDragEnd,
            style: _style,
            ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
            void _drag;
            void _dragMomentum;
            void _dragElastic;
            void _onDragEnd;
            void _style;
            return React.createElement(Tag as string, rest, children);
        };
        Component.displayName = `MotionMock(${String(Tag)})`;
        return Component;
    };
    return {
        motion: new Proxy(
            {},
            {
                get: (_target, prop: string) =>
                    passthrough(prop as keyof JSX.IntrinsicElements),
            },
        ),
        useMotionValue: (initial: number) => {
            let value = initial;
            return {
                get: () => value,
                set: (next: number) => {
                    value = next;
                },
            };
        },
        animate: (_value: unknown, _to: number) => {
            void _value;
            void _to;
            return { stop: () => undefined };
        },
    };
});

import ImagePreviewLightbox, {
    type LightboxImage,
} from "./ImagePreviewLightbox";

const makeImage = (
    overrides: Partial<LightboxImage> = {},
): LightboxImage => ({
    fileId: "file-1",
    imageUrl: "https://cdn/image.png",
    fileName: "photo.png",
    ...overrides,
});

const renderLightbox = (
    overrides: { gallery?: LightboxImage[]; onClose?: () => void } = {},
) => {
    const onClose = overrides.onClose ?? vi.fn();
    const current = overrides.gallery?.[0] ?? makeImage();
    render(
        <ImagePreviewLightbox
            onClose={onClose}
            current={current}
            gallery={overrides.gallery}
        />,
    );
    return { onClose };
};

beforeEach(() => {
    getChatFilePreviewUrlMock.mockReset();
    downloadChatFileMock.mockReset();
    invalidateCachedUrlMock.mockReset();
    toastMock.mockReset();
});

describe("ImagePreviewLightbox", () => {
    it("closes on Escape", () => {
        const { onClose } = renderLightbox();
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("navigates with ArrowLeft / ArrowRight when a gallery is provided", async () => {
        const gallery = [
            makeImage({ fileId: "a", imageUrl: "url-a", fileName: "a.png" }),
            makeImage({ fileId: "b", imageUrl: "url-b", fileName: "b.png" }),
            makeImage({ fileId: "c", imageUrl: "url-c", fileName: "c.png" }),
        ];
        renderLightbox({ gallery });

        expect(screen.getByText("a.png")).toBeTruthy();

        await act(async () => {
            fireEvent.keyDown(window, { key: "ArrowRight" });
        });
        expect(screen.getByText("b.png")).toBeTruthy();

        await act(async () => {
            fireEvent.keyDown(window, { key: "ArrowLeft" });
        });
        expect(screen.getByText("a.png")).toBeTruthy();
    });

    it("toggles the keyboard help overlay on '?'", () => {
        renderLightbox();
        expect(screen.queryByText(/shortcuts/i)).toBeNull();

        fireEvent.keyDown(window, { key: "?" });
        expect(screen.getByText(/shortcuts/i)).toBeTruthy();

        fireEvent.keyDown(window, { key: "?" });
        expect(screen.queryByText(/shortcuts/i)).toBeNull();
    });

    it("Esc closes the help overlay before closing the lightbox", () => {
        const { onClose } = renderLightbox();

        fireEvent.keyDown(window, { key: "?" });
        expect(screen.getByText(/shortcuts/i)).toBeTruthy();

        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByText(/shortcuts/i)).toBeNull();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("triggers the download on 'D'", async () => {
        downloadChatFileMock.mockResolvedValue(undefined);
        renderLightbox();
        await act(async () => {
            fireEvent.keyDown(window, { key: "D" });
        });
        expect(downloadChatFileMock).toHaveBeenCalledWith("file-1");
    });

    it("silently refreshes the image URL on first onError", async () => {
        getChatFilePreviewUrlMock.mockResolvedValue("https://cdn/fresh.png");
        renderLightbox();

        await act(async () => {
            fireEvent.error(screen.getByTestId("lightbox-img"));
        });

        expect(invalidateCachedUrlMock).toHaveBeenCalledWith("file-1");
        expect(getChatFilePreviewUrlMock).toHaveBeenCalledWith("file-1");
        expect(toastMock).not.toHaveBeenCalled();
    });

    it("shows a toast with Retry on the second onError within 30s", async () => {
        getChatFilePreviewUrlMock.mockResolvedValue("https://cdn/fresh.png");
        renderLightbox();

        await act(async () => {
            fireEvent.error(screen.getByTestId("lightbox-img"));
        });
        expect(toastMock).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.error(screen.getByTestId("lightbox-img"));
        });

        expect(toastMock).toHaveBeenCalledTimes(1);
        const [, opts] = toastMock.mock.calls[0];
        expect(opts).toBeDefined();
        expect((opts as { action?: { label?: string } }).action?.label).toBe(
            "Retry",
        );
    });

    it("clicking the close button invokes onClose", () => {
        const { onClose } = renderLightbox();
        fireEvent.click(screen.getByRole("button", { name: /close lightbox/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("clicking the download toolbar button triggers download when fileId is set", async () => {
        downloadChatFileMock.mockResolvedValue(undefined);
        renderLightbox();
        await act(async () => {
            fireEvent.click(
                screen.getByRole("button", { name: /download image/i }),
            );
        });
        expect(downloadChatFileMock).toHaveBeenCalledWith("file-1");
    });
});
