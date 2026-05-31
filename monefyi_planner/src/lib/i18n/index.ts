export const id = {
  auth: {
    login: 'Masuk',
    signup: 'Daftar',
    inviteLink: 'Punya undangan?',
  },
  team: {
    title: 'Tim',
    invite: 'Undang Anggota',
    members: 'Anggota Aktif',
    requests: 'Join Requests',
    audit: 'Audit Log',
  },
  join: {
    accept: 'Terima & Bergabung',
    code: 'Masukkan kode undangan',
  },
} as const;

export const en = {
  auth: {
    login: 'Sign in',
    signup: 'Sign up',
    inviteLink: 'Have an invitation?',
  },
  team: {
    title: 'Team',
    invite: 'Invite Member',
    members: 'Active Members',
    requests: 'Join Requests',
    audit: 'Audit Log',
  },
  join: {
    accept: 'Accept & Join',
    code: 'Enter invite code',
  },
} as const;

export type Locale = typeof id;
