export const AUTH_CHANGE_EVENT = "darobooks:auth-changed";

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function storeAccessToken(token: string): void {
  window.sessionStorage.setItem("darobooksAccessToken", token);
  notifyAuthChanged();
}
