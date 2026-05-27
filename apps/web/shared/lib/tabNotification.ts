let originalTitle: string | null = null;
let originalFaviconHref: string | null = null;
let badgeFaviconHref: string | null = null;
let blinkInterval: ReturnType<typeof setInterval> | null = null;
let currentUnreadCount = 0;

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]');
}

function buildBadgeFavicon(): Promise<string> {
  return new Promise((resolve) => {
    const link = getFaviconLink();
    const src = link?.href ?? '/favicon.ico';

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(src); return; }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      ctx.beginPath();
      ctx.arc(canvas.width - 4, 4, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function applyBadge(n: number): Promise<void> {
  if (typeof document === 'undefined') return;
  if (n <= 0) {
    restoreFavicon();
    return;
  }
  const dataUrl = await buildBadgeFavicon();
  badgeFaviconHref = dataUrl;
  const link = getFaviconLink();
  if (link) link.href = dataUrl;
}

function restoreFavicon(): void {
  if (typeof document === 'undefined') return;
  if (originalFaviconHref === null) return;
  const link = getFaviconLink();
  if (link) link.href = originalFaviconHref;
}

function startBlink(): void {
  if (blinkInterval !== null) return;
  let toggled = false;
  blinkInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      stopBlink();
      return;
    }
    document.title = toggled
      ? originalTitle ?? document.title
      : `(${currentUnreadCount}) ${originalTitle ?? ''}`;
    toggled = !toggled;
  }, 1000);
}

function stopBlink(): void {
  if (blinkInterval !== null) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
  if (originalTitle !== null) {
    document.title = originalTitle;
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    stopBlink();
  }
}

function ensureInit(): void {
  if (originalTitle === null) {
    originalTitle = document.title;
  }
  if (originalFaviconHref === null) {
    const link = getFaviconLink();
    originalFaviconHref = link?.href ?? null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function setUnreadCount(n: number): void {
  if (typeof document === 'undefined') return;
  ensureInit();
  currentUnreadCount = n;

  void applyBadge(n);

  if (n > 0) {
    document.title = `(${n}) ${originalTitle ?? ''}`;
    if (document.visibilityState === 'hidden') {
      startBlink();
    }
  } else {
    stopBlink();
    if (originalTitle !== null) document.title = originalTitle;
  }
}

export function clearTabNotification(): void {
  if (typeof document === 'undefined') return;
  currentUnreadCount = 0;
  stopBlink();
  restoreFavicon();
}
