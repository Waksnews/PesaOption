/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function callApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(fullUrl, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}
