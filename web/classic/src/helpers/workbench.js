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

/**
 * @typedef {'normal' | 'low' | 'empty'} AccountStatusLevel
 * @typedef {{ level: AccountStatusLevel, label: string }} AccountStatus
 */

/**
 * @param {number | undefined | null} quota
 * @param {number} last24hQuota
 * @param {(key: string) => string} t
 * @returns {AccountStatus}
 */
export function getAccountStatus(quota, last24hQuota, t) {
  const remaining = Number(quota) || 0;
  if (remaining <= 0) {
    return { level: 'empty', label: t('余额不足') };
  }
  if (last24hQuota > 0 && remaining < last24hQuota) {
    return { level: 'low', label: t('余额偏低') };
  }
  return { level: 'normal', label: t('正常') };
}

/**
 * @param {number | undefined | null} remainingQuota
 * @param {number} last24hQuota
 * @param {(key: string) => string} t
 * @returns {string}
 */
export function formatEstimatedDuration(remainingQuota, last24hQuota, t) {
  const remaining = Number(remainingQuota) || 0;
  if (!last24hQuota || last24hQuota <= 0) {
    return t('暂无估算');
  }
  const hoursRemaining = (remaining / last24hQuota) * 24;
  if (hoursRemaining < 1) {
    const minutes = Math.max(1, Math.round(hoursRemaining * 60));
    return t('约 {{minutes}} 分钟', { minutes });
  }
  if (hoursRemaining < 48) {
    return t('约 {{hours}} 小时', { hours: Math.round(hoursRemaining) });
  }
  const days = Math.round(hoursRemaining / 24);
  return t('约 {{days}} 天', { days });
}

/**
 * @param {unknown} payload
 * @returns {number}
 */
export function extractTokenTotal(payload) {
  if (!payload) return 0;
  if (typeof payload.total === 'number') return payload.total;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload.items)) return payload.items.length;
  return 0;
}
