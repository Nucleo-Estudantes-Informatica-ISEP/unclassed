type RequestOptions = Omit<RequestInit, "method" | "body">;

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
    public readonly headers: Headers
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class HttpClient {
  private async request<T>(
    method: string,
    url: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        if (response.ok) throw error;
      }
    }
    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : `Erro: ${response.status}`;
      throw new HttpError(message, response.status, data, response.headers);
    }
    return data as T;
  }

  get<T = unknown>(url: string, options?: RequestOptions) {
    return this.request<T>("GET", url, undefined, options);
  }
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("POST", url, body, options);
  }
  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("PATCH", url, body, options);
  }
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("PUT", url, body, options);
  }
  delete<T = unknown>(url: string, options?: RequestOptions) {
    return this.request<T>("DELETE", url, undefined, options);
  }
}

export const httpClient = new HttpClient();
