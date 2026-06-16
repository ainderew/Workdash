import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import DeskSearchResultsPanel from './DeskSearchResultsPanel';
import type {
  ChatV2Attachment,
  ChatV2Message,
  ChatV2Room,
} from '@/communication/chatV2/_types';

const ROOM_ID = 'room-1';

function makeRoom(name: string): ChatV2Room {
  return {
    id: ROOM_ID,
    workspaceId: 'ws-1',
    categoryId: null,
    position: 0,
    name,
    slug: name,
    topic: null,
    visibility: 'PUBLIC',
    type: 'TEXT',
    isArchived: false,
    createdAt: '2026-06-17T00:00:00.000Z',
    updatedAt: '2026-06-17T00:00:00.000Z',
  };
}

function makeMessage(overrides: Partial<ChatV2Message>): ChatV2Message {
  return {
    id: 'm-1',
    roomId: ROOM_ID,
    senderUserId: 7,
    sender: { id: 7, name: 'Casey', image: null },
    clientMessageId: 'c-1',
    content: '',
    messageType: 'TEXT',
    replyToMessageId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: '2026-06-17T00:00:00.000Z',
    attachments: [],
    ...overrides,
  };
}

function makeImageAttachment(): ChatV2Attachment {
  return {
    id: 'a-1',
    messageId: 'm-2',
    storageProvider: 'S3',
    objectKey: 'k',
    originalFileName: 'pic.png',
    mimeType: 'image/png',
    sizeBytes: '1',
    sha256: 'x',
    isImage: true,
    width: 10,
    height: 10,
    blurhash: null,
    hasPoster: false,
    durationMs: null,
    expiresAt: null,
    expiredAt: null,
    createdAt: '2026-06-17T00:00:00.000Z',
  };
}

const noop = () => {};

function renderPanel(
  messages: ChatV2Message[],
  query: string,
  roomName = 'general',
) {
  return render(
    <DeskSearchResultsPanel
      messages={messages}
      roomsById={{ [ROOM_ID]: makeRoom(roomName) }}
      totalCount={messages.length}
      sort="LATEST"
      isLoading={false}
      error={null}
      query={query}
      onSortChange={noop}
      onSelectResult={noop}
    />,
  );
}

const markTexts = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('mark')).map((m) => m.textContent);

describe('DeskSearchResultsPanel highlighting', () => {
  it('highlights the matched term in the message body', () => {
    const { container } = renderPanel(
      [makeMessage({ content: 'ship the deploy now' })],
      'deploy',
    );
    expect(markTexts(container)).toContain('deploy');
  });

  it('highlights the sender name and room heading when they match', () => {
    const { container } = renderPanel(
      [
        makeMessage({
          content: 'nothing relevant',
          sender: { id: 7, name: 'Deploybot', image: null },
        }),
      ],
      'deploy',
      'deploy-zone',
    );
    const marks = markTexts(container);
    // Sender "Deploybot" and room "deploy-zone" both contain "deploy".
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(marks.every((t) => t?.toLowerCase() === 'deploy')).toBe(true);
  });

  it('does not highlight the attachment fallback label', () => {
    const { container, getByText } = renderPanel(
      [makeMessage({ id: 'm-2', content: '', attachments: [makeImageAttachment()] })],
      'image',
    );
    expect(getByText('Image attachment')).toBeInTheDocument();
    expect(markTexts(container)).toHaveLength(0);
  });

  it('renders no highlights for an empty (filter-only) query', () => {
    const { container } = renderPanel(
      [makeMessage({ content: 'ship the deploy now' })],
      '',
    );
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });
});
