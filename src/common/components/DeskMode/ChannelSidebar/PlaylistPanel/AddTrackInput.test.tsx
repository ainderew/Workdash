import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddTrackInput } from "./AddTrackInput";

vi.mock("@/communication/music/playlistApi", () => ({
  searchTracks: vi.fn().mockResolvedValue([]),
}));

describe("AddTrackInput", () => {
  const defaultProps = {
    playlistId: "pl-1",
    onAddTrack: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input with placeholder", () => {
    render(<AddTrackInput {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search or paste URL"),
    ).toBeInTheDocument();
  });

  it("submits on Enter key", async () => {
    const onAddTrack = vi.fn().mockResolvedValue(undefined);
    render(<AddTrackInput {...defaultProps} onAddTrack={onAddTrack} />);

    const input = screen.getByPlaceholderText("Search or paste URL");
    fireEvent.change(input, { target: { value: "https://youtube.com/watch?v=test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onAddTrack).toHaveBeenCalledWith(
        "pl-1",
        "https://youtube.com/watch?v=test",
      );
    });
  });

  it("clears input on successful add", async () => {
    render(<AddTrackInput {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search or paste URL");
    fireEvent.change(input, { target: { value: "https://youtube.com/watch?v=abc" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("shows error on failure", async () => {
    const onAddTrack = vi.fn().mockRejectedValue(new Error("Track not found"));
    render(<AddTrackInput {...defaultProps} onAddTrack={onAddTrack} />);

    const input = screen.getByPlaceholderText("Search or paste URL");
    fireEvent.change(input, { target: { value: "https://youtube.com/watch?v=broken" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Track not found")).toBeInTheDocument();
    });
  });

  it("does not submit when input is empty", () => {
    render(<AddTrackInput {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search or paste URL");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onAddTrack).not.toHaveBeenCalled();
  });
});
