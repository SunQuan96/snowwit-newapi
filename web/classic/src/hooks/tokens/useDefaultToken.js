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

import { useCallback, useMemo, useState } from 'react';
import { copy, showError, showSuccess } from '../../helpers';
import { fetchTokenKey } from '../../helpers/token';
import {
  buildAccessPackageText,
  formatApiKey,
  getDefaultTokenId,
  resolveDefaultToken,
  setDefaultTokenId,
} from '../../helpers/defaultToken';

export function useDefaultToken(tokens, baseUrl, t) {
  const [preferredId, setPreferredId] = useState(() => getDefaultTokenId());

  const defaultToken = useMemo(
    () => resolveDefaultToken(tokens, preferredId),
    [tokens, preferredId],
  );

  const setAsDefault = useCallback((tokenId) => {
    setDefaultTokenId(tokenId);
    setPreferredId(tokenId);
  }, []);

  const isDefault = useCallback(
    (tokenId) => defaultToken?.id === tokenId,
    [defaultToken?.id],
  );

  const copyAccessPackage = useCallback(
    async (tokenRecord) => {
      const record = tokenRecord || defaultToken;
      if (!record?.id) {
        showError(t('没有可用的 API Key'));
        return;
      }
      if (!baseUrl) {
        showError(t('无法获取 Base URL'));
        return;
      }
      try {
        const key = await fetchTokenKey(record.id);
        const text = buildAccessPackageText(baseUrl, key);
        if (await copy(text)) {
          showSuccess(t('已复制接入信息到剪贴板'));
        }
      } catch (error) {
        showError(error?.message || t('复制失败'));
      }
    },
    [baseUrl, defaultToken, t],
  );

  const copyApiKey = useCallback(
    async (tokenRecord) => {
      const record = tokenRecord || defaultToken;
      if (!record?.id) {
        showError(t('没有可用的 API Key'));
        return;
      }
      try {
        const key = await fetchTokenKey(record.id);
        if (await copy(formatApiKey(key))) {
          showSuccess(t('已复制到剪贴板！'));
        }
      } catch (error) {
        showError(error?.message || t('复制失败'));
      }
    },
    [defaultToken, t],
  );

  return {
    defaultToken,
    preferredId,
    setAsDefault,
    isDefault,
    copyAccessPackage,
    copyApiKey,
  };
}
