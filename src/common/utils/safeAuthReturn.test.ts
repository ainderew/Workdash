import { describe, expect, it } from 'vitest';
import { safeAuthReturn } from './safeAuthReturn';
describe('sign-in destination allowlist', () => {
    it('preserves the fixed guest destination and valid invites', () => {
        expect(safeAuthReturn('/try')).toBe('/try'); expect(safeAuthReturn('/invite/abc_123')).toBe('/invite/abc_123');
    });
    it('rejects external, protocol-relative, encoded and unexpected destinations', () => {
        for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/invite/../admin', '/invite/%2f%2fevil.example', '/try?next=https://evil.example', ['//evil.example'], null]) expect(safeAuthReturn(value)).toBe('/app');
    });
});
