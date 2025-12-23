import type {
  DevToolsEvent,
  EventType,
  HttpInterceptorOptions,
  HttpRequestInfo,
  HttpResponseInfo,
} from "./types.ts";
import { DevToolsStorage, type StorageOptions } from "./storage.ts";

const DEFAULT_MAX_BODY_SIZE = 10 * 1024; // 10KB

let sharedStorage: DevToolsStorage | null = null;

/**
 * Get or create the shared storage instance
 */
function getStorage(options?: StorageOptions): DevToolsStorage {
  if (!sharedStorage) {
    sharedStorage = DevToolsStorage.create(options);
  }
  return sharedStorage;
}

/**
 * Write an HTTP event to storage
 */
function writeHttpEvent(
  type: EventType,
  data: Record<string, unknown>,
  storageOptions?: StorageOptions,
): DevToolsEvent {
  const storage = getStorage(storageOptions);
  const event: DevToolsEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data,
  };
  storage.insert(event);
  return event;
}

/**
 * Check if a URL should be ignored
 */
function shouldIgnoreUrl(url: string, ignoreUrls: (string | RegExp)[]): boolean {
  for (const pattern of ignoreUrls) {
    if (typeof pattern === "string") {
      if (url.includes(pattern)) return true;
    } else if (pattern.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract headers as a plain object
 */
function extractHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Normalize headers to a plain object
 */
function normalizeHeaders(
  headers: Headers | Record<string, string> | [string, string][] | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return extractHeaders(headers);
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

/**
 * Safely extract body content with size limit
 */
async function extractBody(
  body: ReadableStream<Uint8Array> | null,
  maxSize: number,
): Promise<string | undefined> {
  if (!body) return undefined;

  try {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > maxSize) {
        void reader.cancel();
        return `[Body truncated at ${maxSize} bytes]`;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(chunks.flatMap((c) => Array.from(c))));
  } catch {
    return "[Failed to read body]";
  }
}

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Create a wrapped fetch function that intercepts HTTP requests
 * and writes them to SQLite storage
 *
 * @example
 * ```typescript
 * import { wrapFetch } from "boune/devtools";
 *
 * // Wrap global fetch
 * const originalFetch = globalThis.fetch;
 * globalThis.fetch = wrapFetch(originalFetch, {
 *   captureHeaders: true,
 *   captureBody: true,
 * }) as typeof fetch;
 *
 * // All fetch calls will now be captured to .boune/devtools.db
 * await fetch("https://api.example.com/users");
 * ```
 */
export function wrapFetch(
  originalFetch: FetchFn,
  options: Omit<HttpInterceptorOptions, "url" | "silent"> & { dbPath?: string } = {},
): FetchFn {
  const {
    dbPath,
    devOnly = true,
    captureHeaders = false,
    captureBody = false,
    captureResponseBody = false,
    maxBodySize = DEFAULT_MAX_BODY_SIZE,
    ignoreUrls = [],
    metadata = {},
  } = options;

  // Skip in production if devOnly is true
  if (devOnly && process.env.NODE_ENV === "production") {
    return originalFetch;
  }

  const storageOptions: StorageOptions | undefined = dbPath ? { path: dbPath } : undefined;

  return async function wrappedFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const requestUrl =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Skip ignored URLs
    if (shouldIgnoreUrl(requestUrl, ignoreUrls)) {
      return originalFetch(input, init);
    }

    const startTime = performance.now();

    // Build request info
    const requestInfo: HttpRequestInfo = {
      method: init?.method || "GET",
      url: requestUrl,
    };

    if (captureHeaders && init?.headers) {
      requestInfo.headers =
        init.headers instanceof Headers
          ? extractHeaders(init.headers)
          : Array.isArray(init.headers)
            ? Object.fromEntries(init.headers)
            : (init.headers as Record<string, string>);
    }

    if (captureBody && init?.body) {
      if (typeof init.body === "string") {
        requestInfo.body =
          init.body.length > maxBodySize ? `[Body truncated at ${maxBodySize} bytes]` : init.body;
      } else {
        requestInfo.body = "[Non-string body]";
      }
    }

    // Write request:out event
    writeHttpEvent("request:out", { ...requestInfo, ...metadata }, storageOptions);

    try {
      // Make the actual request
      const response = await originalFetch(input, init);
      const duration = performance.now() - startTime;

      // Build response info
      const responseInfo: HttpResponseInfo = {
        status: response.status,
        statusText: response.statusText,
        duration,
      };

      if (captureHeaders) {
        responseInfo.headers = extractHeaders(response.headers);
      }

      // Clone response for body capture if needed
      if (captureResponseBody) {
        const clonedResponse = response.clone();
        responseInfo.body = await extractBody(clonedResponse.body, maxBodySize);
      }

      // Write request:in event
      writeHttpEvent(
        "request:in",
        {
          request: requestInfo,
          response: responseInfo,
          ...metadata,
        },
        storageOptions,
      );

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Write error event
      writeHttpEvent(
        "request:in",
        {
          request: requestInfo,
          error: error instanceof Error ? error.message : String(error),
          duration,
          ...metadata,
        },
        storageOptions,
      );

      throw error;
    }
  };
}

/**
 * Create an instrumented HTTP client that captures all requests to SQLite
 *
 * @example
 * ```typescript
 * import { createHttpClient } from "boune/devtools";
 *
 * const http = createHttpClient({
 *   captureHeaders: true,
 *   captureBody: true,
 * });
 *
 * // Use it for API calls - all captured to .boune/devtools.db
 * const response = await http.fetch("https://api.example.com/users");
 * const data = await http.get("https://api.example.com/users");
 * ```
 */
export function createHttpClient(
  options: Omit<HttpInterceptorOptions, "url" | "silent"> & { dbPath?: string } = {},
) {
  const wrappedFetch = wrapFetch(globalThis.fetch, options);

  return {
    /**
     * Make a fetch request with interception
     */
    fetch: wrappedFetch,

    /**
     * Make a GET request and parse JSON response
     */
    async get<T = unknown>(url: string, init?: RequestInit): Promise<T> {
      const response = await wrappedFetch(url, { ...init, method: "GET" });
      return response.json() as Promise<T>;
    },

    /**
     * Make a POST request with JSON body
     */
    async post<T = unknown>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
      const response = await wrappedFetch(url, {
        ...init,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...normalizeHeaders(init?.headers),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json() as Promise<T>;
    },

    /**
     * Make a PUT request with JSON body
     */
    async put<T = unknown>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
      const response = await wrappedFetch(url, {
        ...init,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...normalizeHeaders(init?.headers),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json() as Promise<T>;
    },

    /**
     * Make a DELETE request
     */
    async delete<T = unknown>(url: string, init?: RequestInit): Promise<T> {
      const response = await wrappedFetch(url, { ...init, method: "DELETE" });
      return response.json() as Promise<T>;
    },

    /**
     * Make a PATCH request with JSON body
     */
    async patch<T = unknown>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
      const response = await wrappedFetch(url, {
        ...init,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...normalizeHeaders(init?.headers),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json() as Promise<T>;
    },
  };
}

/**
 * Install the HTTP interceptor globally
 *
 * @example
 * ```typescript
 * import { installHttpInterceptor } from "boune/devtools";
 *
 * // Install globally - all fetch calls will be captured to SQLite
 * const restore = installHttpInterceptor({
 *   captureHeaders: true,
 * });
 *
 * // Later, restore original fetch
 * restore();
 * ```
 */
export function installHttpInterceptor(
  options: Omit<HttpInterceptorOptions, "url" | "silent"> & { dbPath?: string } = {},
): () => void {
  const originalFetch = globalThis.fetch;
  (globalThis as { fetch: FetchFn }).fetch = wrapFetch(originalFetch, options);

  return () => {
    globalThis.fetch = originalFetch;
  };
}
