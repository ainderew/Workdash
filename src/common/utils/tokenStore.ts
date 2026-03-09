import type { BackendUser, BackendCharacter } from '@/types/auth';

let _jwt: string | undefined;
let _user: BackendUser | undefined;
let _character: BackendCharacter | undefined;

export const tokenStore = {
  getJwt: (): string => _jwt ?? '',
  setJwt: (jwt: string) => { _jwt = jwt; },

  getUser: (): BackendUser | undefined => _user,
  setUser: (user: BackendUser) => { _user = user; },
  updateUser: (patch: Partial<BackendUser>) => {
    if (_user) _user = { ..._user, ...patch };
  },

  getCharacter: (): BackendCharacter | undefined => _character,
  setCharacter: (character: BackendCharacter) => { _character = character; },
};
