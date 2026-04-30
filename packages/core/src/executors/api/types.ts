export interface ApiReadOptions {
  path: string;
  query?: Record<string, string | number | boolean>;
}

export interface ApiWriteOptions {
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean>;
}
