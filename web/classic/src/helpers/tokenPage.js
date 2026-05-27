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

import { renderQuota } from './render';
import { timestamp2string } from './utils';

export const TOKEN_STATUS = {
  ALL: 'all',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  EXPIRED: 'expired',
  EXHAUSTED: 'exhausted',
};

/** 将统一搜索框输入解析为服务端 keyword / token 参数 */
export function parseTokenSearchQuery(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { searchKeyword: '', searchToken: '' };
  }

  const withoutPrefix = trimmed.replace(/^sk-/i, '');
  const looksLikeKey =
    /^sk-/i.test(trimmed) ||
    (/^[a-zA-Z0-9_-]+$/.test(withoutPrefix) && withoutPrefix.length >= 8);

  if (looksLikeKey) {
    return { searchKeyword: '', searchToken: withoutPrefix };
  }

  return { searchKeyword: trimmed, searchToken: '' };
}

export function getTokenStatusMeta(status, t) {
  if (status === 1) {
    return {
      enabled: true,
      label: t('已启用'),
      color: 'green',
      tone: 'success',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (status === 2) {
    return {
      enabled: false,
      label: t('已禁用'),
      color: 'red',
      tone: 'danger',
      dotClass: 'bg-red-500',
      textClass: 'text-red-700 dark:text-red-400',
      bgClass: 'bg-red-500/10 border-red-500/20',
    };
  }
  if (status === 3) {
    return {
      enabled: false,
      label: t('已过期'),
      color: 'orange',
      tone: 'warning',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 border-amber-500/20',
    };
  }
  if (status === 4) {
    return {
      enabled: false,
      label: t('已耗尽'),
      color: 'grey',
      tone: 'neutral',
      dotClass: 'bg-zinc-400',
      textClass: 'text-zinc-600 dark:text-zinc-400',
      bgClass: 'bg-zinc-500/10 border-zinc-500/20',
    };
  }
  return {
    enabled: false,
    label: t('未知状态'),
    color: 'grey',
    tone: 'neutral',
    dotClass: 'bg-zinc-400',
    textClass: 'text-zinc-600',
    bgClass: 'bg-zinc-500/10 border-zinc-500/20',
  };
}

export function getTokenQuotaLabel(record, t) {
  if (record?.unlimited_quota) {
    return t('无限制');
  }
  const remain = parseInt(record?.remain_quota, 10) || 0;
  const used = parseInt(record?.used_quota, 10) || 0;
  const total = remain + used;
  return `${t('自定义额度')} · ${renderQuota(remain)} / ${renderQuota(total)}`;
}

export function maskTokenKey(record) {
  const key = record?.key || '';
  if (!key) return 'sk-••••••••';
  if (key.includes('*') || key.includes('•')) {
    return key.startsWith('sk-') ? key : `sk-${key}`;
  }
  if (key.length <= 8) {
    return `sk-${key.slice(0, 2)}••••`;
  }
  return `sk-${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function matchesTokenSearch(record, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const name = (record?.name || '').toLowerCase();
  const key = (record?.key || '').toLowerCase();
  const normalized = q.replace(/^sk-/, '');
  return (
    name.includes(q) ||
    key.includes(normalized) ||
    key.includes(q)
  );
}

export function matchesTokenStatusFilter(record, statusFilter) {
  if (!statusFilter || statusFilter === TOKEN_STATUS.ALL) return true;
  if (statusFilter === TOKEN_STATUS.ENABLED) return record?.status === 1;
  if (statusFilter === TOKEN_STATUS.DISABLED) return record?.status === 2;
  if (statusFilter === TOKEN_STATUS.EXPIRED) return record?.status === 3;
  if (statusFilter === TOKEN_STATUS.EXHAUSTED) return record?.status === 4;
  return true;
}

export function getTokenQuotaProgress(record) {
  if (record?.unlimited_quota) return null;
  const remain = parseInt(record?.remain_quota, 10) || 0;
  const used = parseInt(record?.used_quota, 10) || 0;
  const total = remain + used;
  if (total <= 0) return null;
  return Math.min(100, Math.round((remain / total) * 100));
}

export function getTokenExpiredLabel(record, t) {
  const expired = record?.expired_time;
  if (expired === -1 || expired === undefined || expired === null) {
    return t('永不过期');
  }
  return timestamp2string(expired);
}

const DAY_SECONDS = 24 * 60 * 60;

/** 返回过期时间的相对描述与样式分级 */
export function getTokenExpiryInfo(record, t) {
  const expired = record?.expired_time;
  if (expired === -1 || expired === undefined || expired === null) {
    return { label: t('永不过期'), tone: 'normal', expired: false };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = expired - nowSec;
  if (diff <= 0) {
    const days = Math.floor(-diff / DAY_SECONDS);
    return {
      label: days <= 0 ? t('已过期') : t('已过期 {{days}} 天', { days }),
      absolute: timestamp2string(expired),
      tone: 'danger',
      expired: true,
    };
  }
  const days = Math.floor(diff / DAY_SECONDS);
  if (days <= 0) {
    const hours = Math.max(1, Math.floor(diff / 3600));
    return {
      label: t('{{hours}} 小时后过期', { hours }),
      absolute: timestamp2string(expired),
      tone: 'danger',
      expired: false,
    };
  }
  if (days <= 7) {
    return {
      label: t('{{days}} 天后过期', { days }),
      absolute: timestamp2string(expired),
      tone: 'warning',
      expired: false,
    };
  }
  if (days <= 30) {
    return {
      label: t('{{days}} 天后过期', { days }),
      absolute: timestamp2string(expired),
      tone: 'normal',
      expired: false,
    };
  }
  return {
    label: timestamp2string(expired),
    tone: 'normal',
    expired: false,
  };
}

/** 返回额度的已用 / 总额 / 剩余渲染字符串 */
export function getTokenQuotaParts(record) {
  if (record?.unlimited_quota) {
    return { unlimited: true };
  }
  const remain = parseInt(record?.remain_quota, 10) || 0;
  const used = parseInt(record?.used_quota, 10) || 0;
  const total = remain + used;
  return {
    unlimited: false,
    remain,
    used,
    total,
    remainText: renderQuota(remain),
    usedText: renderQuota(used),
    totalText: renderQuota(total),
  };
}

export function isTokenLowBalance(record) {
  if (record?.unlimited_quota) return false;
  const remain = parseInt(record?.remain_quota, 10) || 0;
  const used = parseInt(record?.used_quota, 10) || 0;
  const total = remain + used;
  if (total <= 0) return false;
  return remain / total <= 0.1;
}

export function buildUsageLogLink(tokenName) {
  const encoded = encodeURIComponent(tokenName || '');
  return `/console/log?token_name=${encoded}`;
}
