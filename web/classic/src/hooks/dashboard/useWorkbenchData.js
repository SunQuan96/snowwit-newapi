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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API, copy, showError, showSuccess } from '../../helpers';
import { getServerAddress, fetchTokenKey } from '../../helpers/token';
import {
  buildAccessPackageText,
  clearDefaultTokenId,
  formatApiKey,
  getDefaultTokenId,
  resolveDefaultToken,
  setDefaultTokenId,
} from '../../helpers/defaultToken';
import { maskTokenKey } from '../../helpers/tokenPage';
import {
  processRawData,
  calculateTrendData,
  initializeMaps,
  updateMapValue,
} from '../../helpers/dashboard';
import {
  extractTokenTotal,
  formatEstimatedDuration,
  getAccountStatus,
} from '../../helpers/workbench';
import { useMinimumLoadingTime } from '../common/useMinimumLoadingTime';

/**
 * @typedef {Object} WorkbenchUsageStat
 * @property {number} quota
 * @property {number} token
 * @property {number} rpm
 * @property {number} tpm
 */

const EMPTY_STAT = { quota: 0, token: 0, rpm: 0, tpm: 0 };

/**
 * @param {object} userState
 * @param {(action: { type: string, payload?: unknown }) => void} userDispatch
 * @param {object} statusState
 */
export const useWorkbenchData = (userState, userDispatch, statusState) => {
  const { t } = useTranslation();
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinimumLoadingTime(loading);

  /** @type {[WorkbenchUsageStat, Function]} */
  const [last24hStat, setLast24hStat] = useState(EMPTY_STAT);
  /** @type {[number[], Function]} */
  const [consumeTrend, setConsumeTrend] = useState([]);
  /** @type {[number, Function]} */
  const [tokenTotal, setTokenTotal] = useState(0);
  /** @type {[object | null, Function]} */
  const [defaultToken, setDefaultToken] = useState(null);
  /** @type {[number, Function]} */
  const [last24hRequestCount, setLast24hRequestCount] = useState(0);

  const primaryBaseUrl = useMemo(() => {
    return (
      statusState?.status?.server_address ||
      getServerAddress() ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    );
  }, [statusState?.status?.server_address]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get('/api/user/self');
      const { success, message, data } = res.data || {};
      if (success && data) {
        userDispatch({ type: 'login', payload: data });
        return data;
      }
      if (!success && message) {
        showError(message);
      }
    } catch (err) {
      console.error('Failed to refresh user profile', err);
    }
    return null;
  }, [userDispatch]);

  const fetchLast24hStat = useCallback(async () => {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 86400;
    try {
      const url = `/api/log/self/stat?type=0&token_name=&model_name=&start_timestamp=${start}&end_timestamp=${now}&group=`;
      const res = await API.get(encodeURI(url));
      const { success, data } = res.data || {};
      if (success && data) {
        setLast24hStat({
          quota: Number(data.quota) || 0,
          token: Number(data.token) || 0,
          rpm: Number(data.rpm) || 0,
          tpm: Number(data.tpm) || 0,
        });
        return Number(data.quota) || 0;
      }
    } catch (err) {
      console.error('Failed to load 24h usage stat', err);
    }
    setLast24hStat(EMPTY_STAT);
    return 0;
  }, []);

  const fetchHourlyTrend = useCallback(async () => {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 86400;
    try {
      const url = `/api/data/self/?start_timestamp=${start}&end_timestamp=${now}&default_time=hour`;
      const res = await API.get(url);
      const { success, data } = res.data || {};
      if (success && Array.isArray(data) && data.length > 0) {
        const processed = processRawData(
          data,
          'hour',
          initializeMaps,
          updateMapValue,
        );
        const trend = calculateTrendData(
          processed.timePoints,
          processed.timeQuotaMap,
          processed.timeTokensMap,
          processed.timeCountMap,
          'hour',
        );
        setConsumeTrend(trend.consumeQuota || []);
        setLast24hRequestCount(
          (trend.times || []).reduce((sum, val) => sum + (Number(val) || 0), 0),
        );
        return trend.consumeQuota || [];
      }
    } catch (err) {
      console.error('Failed to load hourly trend', err);
    }
    setConsumeTrend([]);
    setLast24hRequestCount(0);
    return [];
  }, []);

  const fetchDefaultToken = useCallback(async () => {
    const preferredId = getDefaultTokenId();

    if (preferredId) {
      try {
        const res = await API.get(`/api/token/${preferredId}`);
        const { success, data } = res.data || {};
        if (success && data?.status === 1) {
          setDefaultToken(data);
          return data;
        }
        clearDefaultTokenId();
      } catch (err) {
        console.error('Failed to load preferred default token', err);
        clearDefaultTokenId();
      }
    }

    try {
      const res = await API.get('/api/token/?p=1&size=20');
      const { success, data } = res.data || {};
      if (!success) {
        setDefaultToken(null);
        return null;
      }
      const items = data?.items || [];
      const resolved = resolveDefaultToken(items, null);
      if (resolved?.id) {
        setDefaultTokenId(resolved.id);
      }
      setDefaultToken(resolved);
      return resolved;
    } catch (err) {
      console.error('Failed to load default token', err);
      setDefaultToken(null);
      return null;
    }
  }, []);

  const copyDefaultAccessPackage = useCallback(async () => {
    const token = defaultToken;
    const baseUrl = primaryBaseUrl;
    if (!token?.id) {
      showError(t('没有可用的 API Key'));
      return;
    }
    if (!baseUrl) {
      showError(t('无法获取 Base URL'));
      return;
    }
    try {
      const key = await fetchTokenKey(token.id);
      const text = buildAccessPackageText(baseUrl, key);
      if (await copy(text)) {
        showSuccess(t('已复制接入信息到剪贴板'));
      }
    } catch (error) {
      showError(error?.message || t('复制失败'));
    }
  }, [defaultToken, primaryBaseUrl, t]);

  const copyDefaultApiKey = useCallback(async () => {
    if (!defaultToken?.id) {
      showError(t('没有可用的 API Key'));
      return;
    }
    try {
      const key = await fetchTokenKey(defaultToken.id);
      if (await copy(formatApiKey(key))) {
        showSuccess(t('已复制到剪贴板！'));
      }
    } catch (error) {
      showError(error?.message || t('复制失败'));
    }
  }, [defaultToken, t]);

  const fetchTokenTotal = useCallback(async () => {
    try {
      const res = await API.get('/api/token/?p=1&size=1');
      const { success, data } = res.data || {};
      if (success) {
        const total = extractTokenTotal(data);
        setTokenTotal(total);
        return total;
      }
    } catch (err) {
      console.error('Failed to load token count', err);
    }
    setTokenTotal(0);
    return 0;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        refreshUser(),
        fetchLast24hStat(),
        fetchHourlyTrend(),
        fetchTokenTotal(),
        fetchDefaultToken(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshUser, fetchLast24hStat, fetchHourlyTrend, fetchTokenTotal, fetchDefaultToken]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refresh();
    }
  }, [refresh]);

  const remainingQuota = userState?.user?.quota ?? 0;
  const usedQuota = userState?.user?.used_quota ?? 0;
  const requestCount = userState?.user?.request_count ?? 0;

  const accountStatus = useMemo(
    () => getAccountStatus(remainingQuota, last24hStat.quota, t),
    [remainingQuota, last24hStat.quota, t],
  );

  const estimatedDuration = useMemo(
    () => formatEstimatedDuration(remainingQuota, last24hStat.quota, t),
    [remainingQuota, last24hStat.quota, t],
  );

  const getGreeting = useMemo(() => {
    const hours = new Date().getHours();
    let greeting = t('晚上好');
    if (hours >= 5 && hours < 12) greeting = t('早上好');
    else if (hours >= 12 && hours < 14) greeting = t('中午好');
    else if (hours >= 14 && hours < 18) greeting = t('下午好');
    const username = userState?.user?.username || '';
    return username ? `${greeting}，${username}` : greeting;
  }, [t, userState?.user?.username]);

  const hasTrendChart = consumeTrend.length >= 2;

  const defaultTokenPreview = useMemo(() => {
    if (!defaultToken) return null;
    return {
      id: defaultToken.id,
      name: defaultToken.name,
      maskedKey: maskTokenKey(defaultToken),
    };
  }, [defaultToken]);

  return {
    loading: showLoading,
    refresh,
    getGreeting,
    primaryBaseUrl,
    remainingQuota,
    usedQuota,
    requestCount,
    last24hQuota: last24hStat.quota,
    last24hTokens: last24hStat.token,
    last24hRequestCount,
    consumeTrend,
    hasTrendChart,
    tokenTotal,
    hasApiKey: tokenTotal > 0,
    defaultToken,
    defaultTokenPreview,
    copyDefaultAccessPackage,
    copyDefaultApiKey,
    accountStatus,
    estimatedDuration,
    t,
  };
};
