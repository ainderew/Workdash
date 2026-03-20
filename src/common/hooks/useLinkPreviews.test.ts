import { describe, it, expect } from 'vitest';
import type { ChatV2Message } from '@/communication/chatV2/_types';
import { collectUnresolvedUrls } from './useLinkPreviews';

function makeMessage(content: string): ChatV2Message {
  return {
    id: '1',
    roomId: 'r1',
    senderUserId: 1,
    clientMessageId: 'cm1',
    content,
    messageType: 'TEXT',
    replyToMessageId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    attachments: [],
  } as ChatV2Message;
}

describe('collectUnresolvedUrls', () => {
  it('extracts URLs from plain text', () => {
    const messages = [makeMessage('Check https://example.com for info')];
    const urls = collectUnresolvedUrls(messages, {}, {});
    expect(urls).toContain('https://example.com');
  });

  it('does NOT extract URLs from fenced code blocks', () => {
    const messages = [
      makeMessage('```\nhttps://code-example.com\n```'),
    ];
    const urls = collectUnresolvedUrls(messages, {}, {});
    expect(urls.size).toBe(0);
  });

  it('does NOT extract URLs from inline code', () => {
    const messages = [makeMessage('Use `https://inline-code.com` here')];
    const urls = collectUnresolvedUrls(messages, {}, {});
    expect(urls.size).toBe(0);
  });

  it('extracts text URLs but not code block URLs from mixed content', () => {
    const content = [
      'Visit https://real-link.com',
      '```',
      'https://code-url.com',
      '```',
      'Also https://another-link.com',
    ].join('\n');
    const messages = [makeMessage(content)];
    const urls = collectUnresolvedUrls(messages, {}, {});
    expect(urls).toContain('https://real-link.com');
    expect(urls).toContain('https://another-link.com');
    expect(urls.has('https://code-url.com')).toBe(false);
  });

  it('does NOT extract markdown link syntax from code blocks', () => {
    const messages = [
      makeMessage('```\n[click](https://hidden.com)\n```'),
    ];
    const urls = collectUnresolvedUrls(messages, {}, {});
    expect(urls.size).toBe(0);
  });

  it('skips deleted messages', () => {
    const msg = makeMessage('https://example.com');
    msg.deletedAt = new Date().toISOString();
    const urls = collectUnresolvedUrls([msg], {}, {});
    expect(urls.size).toBe(0);
  });

  it('skips already resolved URLs', () => {
    const messages = [makeMessage('https://example.com')];
    const previews = {
      'https://example.com': {
        url: 'https://example.com',
        title: 'Example',
        description: 'A site',
        image: 'img.png',
      },
    };
    const urls = collectUnresolvedUrls(messages, previews, {});
    expect(urls.size).toBe(0);
  });
});
