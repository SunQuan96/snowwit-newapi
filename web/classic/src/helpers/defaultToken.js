/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

const DEFAULT_TOKEN_ID_KEY = 'workbench:default_token_id';

export function getDefaultTokenId() {
  try {
    const raw = localStorage.getItem(DEFAULT_TOKEN_ID_KEY);
    if (!raw) return null;
    const id = parseInt(raw, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setDefaultTokenId(id) {
  try {
    if (id == null) {
      localStorage.removeItem(DEFAULT_TOKEN_ID_KEY);
      return;
    }
    localStorage.setItem(DEFAULT_TOKEN_ID_KEY, String(id));
  } catch {
    // ignore storage errors
  }
}

export function clearDefaultTokenId() {
  setDefaultTokenId(null);
}

/**
 * @param {Array<{ id: number, status?: number }>} tokens
 * @param {number | null | undefined} preferredId
 */
export function resolveDefaultToken(tokens, preferredId) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  if (preferredId) {
    const preferred = tokens.find(
      (item) => item.id === preferredId && item.status === 1,
    );
    if (preferred) return preferred;
  }

  const enabled = tokens.filter((item) => item.status === 1);
  const pool = enabled.length > 0 ? enabled : tokens;
  return [...pool].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
}

export function buildAccessPackageText(baseUrl, apiKey) {
  const normalizedBase = (baseUrl || '').trim();
  const key = (apiKey || '').trim();
  const fullKey = key.startsWith('sk-') ? key : `sk-${key}`;
  return `Base URL: ${normalizedBase}\nAPI Key: ${fullKey}`;
}

export function formatApiKey(apiKey) {
  const key = (apiKey || '').trim();
  return key.startsWith('sk-') ? key : `sk-${key}`;
}
