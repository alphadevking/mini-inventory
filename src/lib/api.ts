import { useState, useEffect, useCallback } from 'react';
import type {
  Sale, SaleCreateInput, SaleItem,
  Repair, RepairStatusTransitionInput, AddRepairPartInput, RepairPart,
  Return, StockMovement, AuditLogEntry,
} from '@/types';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:9000';

// ─── Core request helper ──────────────────────────────────────────────────────

export async function apiRequest<T>(
  url: string,
  options?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const fullUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  const buildHeaders = (opts: RequestInit & { idempotencyKey?: string } = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string>),
    };
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }
    return headers;
  };

  const executeRequest = async (opts: RequestInit & { idempotencyKey?: string } = {}) => {
    const { idempotencyKey, ...fetchOpts } = opts;
    return fetch(fullUrl, {
      ...fetchOpts,
      headers: buildHeaders(opts),
      credentials: 'include',
    });
  };

  let response = await executeRequest(options || {});

  // Try token refresh once on 401
  if (response.status === 401 && url !== '/api/auth/refresh' && url !== '/api/auth/login') {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshResponse.ok) {
        response = await executeRequest(options || {});
      }
    } catch {
      // refresh failed — fall through
    }
  }

  if (response.status === 401) {
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
    throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;

  return response.json();
}

// ─── Generic fetch hook ───────────────────────────────────────────────────────

export function useFetch<T>(url: string | null | undefined, options?: RequestInit) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiRequest<T>(url, options);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refetch = useCallback(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch };
}

// ─── Sales API ────────────────────────────────────────────────────────────────

export const salesApi = {
  list: (params?: { skip?: number; limit?: number; customer_name?: string; payment_status?: string; start_date?: string; end_date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.customer_name) qs.set('customer_name', params.customer_name);
    if (params?.payment_status) qs.set('payment_status', params.payment_status);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    return apiRequest<Sale[]>(`/api/sales?${qs}`);
  },

  get: (id: string) => apiRequest<Sale>(`/api/sales/${id}`),

  create: (payload: SaleCreateInput, idempotencyKey?: string) =>
    apiRequest<Sale>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    }),

  getAudit: (id: string) => apiRequest<AuditLogEntry[]>(`/api/sales/${id}/audit`),
};

// ─── Repairs API ──────────────────────────────────────────────────────────────

export const repairsApi = {
  list: (params?: { repair_status?: string; payment_status?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.repair_status) qs.set('repair_status', params.repair_status);
    if (params?.payment_status) qs.set('payment_status', params.payment_status);
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return apiRequest<Repair[]>(`/api/repairs?${qs}`);
  },

  get: (id: string) => apiRequest<Repair>(`/api/repairs/${id}`),

  create: (payload: object, idempotencyKey?: string) =>
    apiRequest<Repair>('/api/repairs', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    }),

  update: (id: string, payload: object) =>
    apiRequest<Repair>(`/api/repairs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** Transition status — logged immutably with who+when */
  transitionStatus: (id: string, payload: RepairStatusTransitionInput) =>
    apiRequest<Repair>(`/api/repairs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  addPart: (repairId: string, payload: AddRepairPartInput) =>
    apiRequest<RepairPart>(`/api/repairs/${repairId}/parts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removePart: (repairId: string, partId: string) =>
    apiRequest<void>(`/api/repairs/${repairId}/parts/${partId}`, { method: 'DELETE' }),

  getAudit: (id: string) => apiRequest<AuditLogEntry[]>(`/api/repairs/${id}/audit`),
};

// ─── Returns API ──────────────────────────────────────────────────────────────

export const returnsApi = {
  list: (params?: { return_status?: string; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.return_status) qs.set('return_status', params.return_status);
    if (params?.action) qs.set('action', params.action);
    return apiRequest<Return[]>(`/api/returns?${qs}`);
  },

  get: (id: string) => apiRequest<Return>(`/api/returns/${id}`),

  create: (payload: object) =>
    apiRequest<Return>('/api/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStatus: (id: string, payload: { new_status: string; notes?: string }) =>
    apiRequest<Return>(`/api/returns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getAudit: (id: string) => apiRequest<AuditLogEntry[]>(`/api/returns/${id}/audit`),
};

// ─── Stock API ────────────────────────────────────────────────────────────────

export const stockApi = {
  getMovements: (productId: string, params?: { skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    return apiRequest<StockMovement[]>(`/api/products/${productId}/movements?${qs}`);
  },
};
