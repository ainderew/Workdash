import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";

// Mock DeskModalShell to render children when open
vi.mock("@/common/components/DeskMode/modals/DeskModalShell", () => ({
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

describe("CreatePlaylistDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    mode: "create" as const,
    onCreate: vi.fn().mockResolvedValue(undefined),
    onRename: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name input and type toggle in create mode", () => {
    render(<CreatePlaylistDialog {...defaultProps} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  it("shows only name input in rename mode", () => {
    render(
      <CreatePlaylistDialog
        {...defaultProps}
        mode="rename"
        existingPlaylist={{
          id: "pl-1",
          name: "Old Name",
          type: "PERSONAL",
          workspaceId: "ws-1",
          creatorId: "user-1",
          trackCount: 3,
          createdAt: "2026-01-01",
        }}
      />,
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByText("Personal")).not.toBeInTheDocument();
  });

  it("submits form data on create button click", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePlaylistDialog {...defaultProps} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "My Chill Playlist" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith("My Chill Playlist", "PERSONAL");
    });
  });

  it("shows error message on failure", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Duplicate name"));
    render(<CreatePlaylistDialog {...defaultProps} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Existing" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Duplicate name")).toBeInTheDocument();
    });
  });

  it("closes on cancel", () => {
    const onClose = vi.fn();
    render(<CreatePlaylistDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("validates that name is required", async () => {
    render(<CreatePlaylistDialog {...defaultProps} />);

    // Submit with empty input
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(defaultProps.onCreate).not.toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    render(<CreatePlaylistDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("switches between Personal and Shared type", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePlaylistDialog {...defaultProps} onCreate={onCreate} />);

    fireEvent.click(screen.getByText("Shared"));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Team Playlist" },
    });
    fireEvent.click(screen.getByText("Create"));

    waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith("Team Playlist", "WORKSPACE");
    });
  });
});
