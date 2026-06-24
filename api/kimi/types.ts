export interface OAuthUserInfo {
  unionId: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface SessionData {
  userId: number;
  unionId: string;
  name: string;
  email?: string;
  iat: number;
}
