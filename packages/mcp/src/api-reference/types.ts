export interface ApiFilterOperatorSpec {
  description?: string;
}

export interface ApiFilterSpec {
  type?: string;
  format?: string;
  description?: string;
  enum?: Array<string | number>;
  operators?: Record<string, ApiFilterOperatorSpec>;
}

export interface ApiQueryParamSpec {
  type?: string;
  description?: string;
}

export interface ApiMethodSpec {
  summary: string;
  query?: Record<string, ApiQueryParamSpec>;
  filters?: Record<string, ApiFilterSpec>;
  sort?: string[];
  pathParams?: Record<string, ApiQueryParamSpec>;
  supportsBody?: boolean;
}

export interface ApiEndpointSpec {
  path: string;
  methods: Partial<Record<'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', ApiMethodSpec>>;
}

export type ApiReference = Record<string, ApiEndpointSpec>;
