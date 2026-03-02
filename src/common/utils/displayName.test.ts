import {
  getDisplayName,
  getDisplayNameFromParts,
  getNameAliases,
} from './displayName';

describe('getDisplayName', () => {
  it('returns nickname when both nickname and name are present', () => {
    expect(getDisplayName({ nickname: 'Nick', name: 'Andrew' })).toBe('Nick');
  });

  it('falls back to name when nickname is absent', () => {
    expect(getDisplayName({ nickname: null, name: 'Andrew' })).toBe('Andrew');
    expect(getDisplayName({ name: 'Andrew' })).toBe('Andrew');
  });

  it('returns the default fallback when user is null or undefined', () => {
    expect(getDisplayName(null)).toBe('User');
    expect(getDisplayName(undefined)).toBe('User');
  });

  it('treats whitespace-only values as empty', () => {
    expect(getDisplayName({ nickname: '   ', name: '  ' })).toBe('User');
    expect(getDisplayName({ nickname: '  ', name: 'Andrew' })).toBe('Andrew');
  });
});

describe('getDisplayNameFromParts', () => {
  it('prefers nickname over name', () => {
    expect(getDisplayNameFromParts('Nick', 'Andrew')).toBe('Nick');
  });

  it('falls back to name when nickname is null', () => {
    expect(getDisplayNameFromParts(null, 'Andrew')).toBe('Andrew');
  });

  it('uses the provided custom fallback when both are empty', () => {
    expect(getDisplayNameFromParts(null, null, 'Anonymous')).toBe('Anonymous');
  });

  it('uses the default fallback when no custom fallback is given', () => {
    expect(getDisplayNameFromParts(null, null)).toBe('User');
  });
});

describe('getNameAliases', () => {
  it('returns both nickname and name when they differ', () => {
    expect(getNameAliases({ nickname: 'Nick', name: 'Andrew' })).toEqual([
      'Nick',
      'Andrew',
    ]);
  });

  it('returns a single entry when nickname and name are the same', () => {
    expect(getNameAliases({ nickname: 'Andrew', name: 'Andrew' })).toEqual([
      'Andrew',
    ]);
  });

  it('trims whitespace from values', () => {
    expect(getNameAliases({ nickname: '  Nick  ', name: '  Andrew  ' })).toEqual(
      ['Nick', 'Andrew'],
    );
  });

  it('returns an empty array for a null or undefined user', () => {
    expect(getNameAliases(null)).toEqual([]);
    expect(getNameAliases(undefined)).toEqual([]);
  });

  it('omits blank or whitespace-only values', () => {
    expect(getNameAliases({ nickname: '  ', name: 'Andrew' })).toEqual([
      'Andrew',
    ]);
  });
});
