type Handler = (data: string) => void;

interface Conn {
  source: EventSource;
  handlers: Map<string, Set<Handler>>;
  refCount: number;
  retryDelay: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  registeredTypes: Set<string>;
}

class SsePool {
  private pool = new Map<string, Conn>();

  subscribe(url: string, eventType: string, handler: Handler): () => void {
    const conn = this.getOrCreate(url);
    conn.refCount++;

    if (!conn.handlers.has(eventType)) {
      conn.handlers.set(eventType, new Set());
      this.attachListener(conn, eventType);
    }
    conn.handlers.get(eventType)!.add(handler);

    return () => {
      conn.handlers.get(eventType)?.delete(handler);
      conn.refCount--;
      if (conn.refCount <= 0) {
        this.destroy(url);
      }
    };
  }

  private getOrCreate(url: string): Conn {
    if (!this.pool.has(url)) {
      const conn: Conn = {
        source: null!,
        handlers: new Map(),
        refCount: 0,
        retryDelay: 1000,
        retryTimer: null,
        registeredTypes: new Set(),
      };
      this.pool.set(url, conn);
      this.connect(url, conn);
    }
    return this.pool.get(url)!;
  }

  private attachListener(conn: Conn, eventType: string): void {
    if (conn.registeredTypes.has(eventType)) return;
    conn.registeredTypes.add(eventType);
    conn.source.addEventListener(eventType, (e: Event) => {
      conn.retryDelay = 1000;
      conn.handlers.get(eventType)?.forEach((h) => h((e as MessageEvent<string>).data));
    });
  }

  private connect(url: string, conn: Conn): void {
    conn.source = new EventSource(url);
    conn.registeredTypes = new Set();

    conn.handlers.forEach((_, eventType) => {
      this.attachListener(conn, eventType);
    });

    conn.source.onerror = () => {
      conn.source.close();
      if (!this.pool.has(url)) return;
      conn.retryTimer = setTimeout(() => {
        if (!this.pool.has(url)) return;
        conn.retryDelay = Math.min(conn.retryDelay * 2, 30_000);
        this.connect(url, conn);
      }, conn.retryDelay);
    };
  }

  private destroy(url: string): void {
    const conn = this.pool.get(url);
    if (!conn) return;
    if (conn.retryTimer !== null) clearTimeout(conn.retryTimer);
    conn.source.close();
    this.pool.delete(url);
  }
}

export const ssePool = new SsePool();
