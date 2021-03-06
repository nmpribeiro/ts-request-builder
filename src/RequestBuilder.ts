import { DEFAULT_TIMEOUT, fetchWithTimeout } from './FetchWithTimeout';

export enum HTTPMethod {
  // eslint-disable-next-line no-unused-vars
  POST = 'POST',
  // eslint-disable-next-line no-unused-vars
  GET = 'GET',
  // eslint-disable-next-line no-unused-vars
  PATCH = 'PATCH',
  // eslint-disable-next-line no-unused-vars
  PUT = 'PUT',
  // eslint-disable-next-line no-unused-vars
  DELETE = 'DELETE',
  // eslint-disable-next-line no-unused-vars
  HEAD = 'HEAD',
  // eslint-disable-next-line no-unused-vars
  CONNECT = 'CONNECT',
  // eslint-disable-next-line no-unused-vars
  TRACE = 'TRACE',
}

type ErrorHandlerType<T = any> = (
  error: T,
  status?: number,
  statusText?: string
) => void;

export class RequestBuilder {
  private route = '';

  private body: Record<string, unknown> | null = null;

  private plainBody: string | null = null;

  private headers: Headers = new Headers();

  private method: HTTPMethod = HTTPMethod.GET;

  private mode: RequestMode | null = null;

  private errorHandling: ErrorHandlerType<any> | null = null;

  private timeout: number = DEFAULT_TIMEOUT;

  private redirect?: RequestRedirect | undefined;

  private credentials?: RequestCredentials | undefined;

  constructor(route: string, private debug = false) {
    this.route = route;
    return this;
  }

  withErrorHandling<T>(callback: ErrorHandlerType<T>) {
    this.errorHandling = callback;
    return this;
  }

  withBody(body: Record<string, unknown> = {}) {
    this.body = body;
    return this;
  }

  withPlainBody(body: string = '') {
    this.plainBody = body;
    return this;
  }

  withHeaders(headers: Headers) {
    this.headers = headers;
    return this;
  }

  withMethod(method: HTTPMethod) {
    this.method = method;
    return this;
  }

  withMode(mode: RequestMode) {
    this.mode = mode;
    return this;
  }

  withTimeout(timeout: number) {
    this.timeout = timeout;
    return this;
  }

  withRedirect(redirect: RequestRedirect) {
    this.redirect = redirect;
    return this;
  }

  withCredentials(credentials: RequestCredentials) {
    this.credentials = credentials;
    return this;
  }

  private request() {
    if (this.debug) {
      const debugHeaders: Record<string, string> = {};
      this.headers.forEach((value: string, key: string) => {
        debugHeaders[key] = value;
      });
      // eslint-disable-next-line no-console
      console.log(
        'will request: ',
        this.route,
        this.method,
        JSON.stringify(debugHeaders),
        JSON.stringify(this.body)
      );
    }

    const opts: RequestInit = {
      method: this.method,
      headers: this.headers,
      redirect: this.redirect,
      credentials: this.credentials,
    };
    if (this.mode) opts.mode = this.mode;
    if (
      this.method !== HTTPMethod.GET &&
      this.method !== HTTPMethod.HEAD &&
      (this.body || this.plainBody)
    )
      opts.body = this.body ? JSON.stringify(this.body) : this.plainBody || '';
    return fetchWithTimeout(this.route, opts, this.timeout);
  }

  async build<T>(): Promise<T> {
    try {
      let result: T;
      const res = await this.request();
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1)
        result = await res.json();
      else result = ((await res.text()) as unknown) as T;

      if (this.debug)
        // eslint-disable-next-line no-console
        console.log(
          'request yielded: ',
          result,
          ' was it successfull? ',
          res.ok ? 'yes' : 'no'
        );

      if (!res.ok && this.errorHandling)
        this.errorHandling(result, res.status, res.statusText);
      return result as T;
    } catch (e) {
      if (this.errorHandling) this.errorHandling(e);
      throw e;
    }
  }

  async buildAsJson<T>(): Promise<T> {
    try {
      const res = await this.request();
      const result = await res.json();
      if (this.debug)
        // eslint-disable-next-line no-console
        console.log(
          'request yielded json: ',
          result,
          ' was it successfull? ',
          res.ok ? 'yes' : 'no'
        );

      if (!res.ok && this.errorHandling)
        this.errorHandling(result, res.status, res.statusText);
      return result as T;
    } catch (e) {
      if (this.errorHandling) this.errorHandling(e);
      throw e;
    }
  }

  async buildAsText(): Promise<string> {
    try {
      const res = await this.request();
      const result = await res.text();
      if (this.debug)
        // eslint-disable-next-line no-console
        console.log(
          'request yielded text: ',
          result,
          ' was it successfull? ',
          res.ok ? 'yes' : 'no'
        );

      if (!res.ok && this.errorHandling)
        this.errorHandling(result, res.status, res.statusText);
      return result;
    } catch (e) {
      if (this.errorHandling) this.errorHandling(e);
      throw e;
    }
  }

  async buildAsBlob() {
    try {
      const res = await this.request();
      const blob = await res.blob();
      if (this.debug)
        // eslint-disable-next-line no-console
        console.log(
          'request yielded blob: ',
          blob,
          ' was it successfull? ',
          res.ok ? 'yes' : 'no'
        );

      if (!res.ok && this.errorHandling)
        this.errorHandling(res, res.status, res.statusText);
      return blob;
    } catch (e) {
      if (this.errorHandling) this.errorHandling(e);
      throw e;
    }
  }
}
