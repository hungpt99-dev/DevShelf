export function isApplePlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function shortcutHint(apple: boolean): string {
  return apple ? "⌘K" : "Ctrl K";
}

export function subscribePlatform(): () => void {
  return () => {};
}

export function getApplePlatformSnapshot(): boolean {
  return typeof navigator === "undefined" ? false : isApplePlatform(navigator.platform || navigator.userAgent);
}

export function getApplePlatformServerSnapshot(): boolean {
  return false;
}
