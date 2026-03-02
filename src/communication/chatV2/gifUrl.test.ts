import { extractSingleUrl, isGifUrl, getStandaloneGifUrl } from './gifUrl';

describe('extractSingleUrl', () => {
  it('returns the URL when content is a single URL', () => {
    expect(extractSingleUrl('https://example.com/page')).toBe(
      'https://example.com/page',
    );
  });

  it('returns null when content contains text alongside a URL', () => {
    expect(extractSingleUrl('check this out https://example.com')).toBeNull();
  });

  it('returns null for empty or whitespace-only content', () => {
    expect(extractSingleUrl('')).toBeNull();
    expect(extractSingleUrl('   ')).toBeNull();
  });

  it('trims surrounding whitespace before matching', () => {
    expect(extractSingleUrl('  https://example.com  ')).toBe(
      'https://example.com',
    );
  });
});

describe('isGifUrl', () => {
  it('returns true for giphy.com URLs', () => {
    expect(isGifUrl('https://giphy.com/gifs/abc123')).toBe(true);
  });

  it('returns true for media.giphy.com URLs', () => {
    expect(isGifUrl('https://media.giphy.com/media/abc/giphy.gif')).toBe(true);
  });

  it('returns true for tenor.com URLs', () => {
    expect(isGifUrl('https://tenor.com/view/funny-gif-123')).toBe(true);
  });

  it('returns true for URLs ending with .gif extension', () => {
    expect(isGifUrl('https://example.com/image.gif')).toBe(true);
  });

  it('returns false for regular non-gif URLs', () => {
    expect(isGifUrl('https://example.com/page')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isGifUrl('not-a-url')).toBe(false);
  });
});

describe('getStandaloneGifUrl', () => {
  it('returns the URL when content is a single gif URL', () => {
    const url = 'https://media.giphy.com/media/abc/giphy.gif';
    expect(getStandaloneGifUrl(url)).toBe(url);
  });

  it('returns null when the single URL is not a gif', () => {
    expect(getStandaloneGifUrl('https://example.com/page')).toBeNull();
  });

  it('returns null when content has text alongside a gif URL', () => {
    expect(
      getStandaloneGifUrl('look at this https://giphy.com/gifs/abc'),
    ).toBeNull();
  });
});
