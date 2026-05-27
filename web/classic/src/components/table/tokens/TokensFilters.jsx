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

import React from 'react';
import { Button, Input, Spin, Typography } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';
import { TOKEN_STATUS } from '../../../helpers/tokenPage';

const { Text } = Typography;

const STATUS_CHIPS = (t) => [
  { value: TOKEN_STATUS.ALL, label: t('全部') },
  { value: TOKEN_STATUS.ENABLED, label: t('已启用') },
  { value: TOKEN_STATUS.DISABLED, label: t('已禁用') },
  { value: TOKEN_STATUS.EXPIRED, label: t('已过期') },
  { value: TOKEN_STATUS.EXHAUSTED, label: t('已耗尽') },
];

const TokensFilters = ({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  searching,
  searchMode,
  tokenCount,
  pageTokenCount,
  filteredCount,
  hasActiveFilters,
  rightSlot = null,
  t,
}) => {
  const showFilteredHint =
    statusFilter !== TOKEN_STATUS.ALL &&
    pageTokenCount > 0 &&
    filteredCount !== pageTokenCount;

  const chips = STATUS_CHIPS(t);

  return (
    <div className='mb-5 space-y-3'>
      <div className='flex flex-col md:flex-row gap-3'>
        <div className='flex-1 min-w-0 relative'>
          <Input
            prefix={<IconSearch />}
            placeholder={t('搜索名称或密钥（支持 sk- 前缀）')}
            value={searchQuery}
            onChange={onSearchQueryChange}
            showClear
            size='large'
            className='!rounded-xl'
          />
          {searching ? (
            <div className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none'>
              <Spin size='small' />
            </div>
          ) : null}
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {hasActiveFilters ? (
            <Button
              type='tertiary'
              size='large'
              onClick={onResetFilters}
              className='!rounded-xl'
            >
              {t('重置筛选')}
            </Button>
          ) : null}
          {rightSlot}
        </div>
      </div>

      <div
        className='flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin'
        role='tablist'
        aria-label={t('状态筛选')}
      >
        {chips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <Button
              key={chip.value}
              size='small'
              theme={active ? 'solid' : 'light'}
              type={active ? 'primary' : 'tertiary'}
              onClick={() => onStatusFilterChange(chip.value)}
              className='!rounded-full shrink-0'
              role='tab'
              aria-selected={active}
            >
              {chip.label}
            </Button>
          );
        })}
      </div>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-semi-color-text-2'>
        {searchMode && searchQuery.trim() ? (
          <Text type='tertiary' size='small'>
            {t('搜索到 {{count}} 个 API Key', { count: tokenCount })}
          </Text>
        ) : (
          <Text type='tertiary' size='small'>
            {t('共 {{count}} 个 API Key', { count: tokenCount })}
          </Text>
        )}
        {showFilteredHint ? (
          <Text type='tertiary' size='small'>
            {t('当前页显示 {{filtered}} / {{total}}', {
              filtered: filteredCount,
              total: pageTokenCount,
            })}
          </Text>
        ) : null}
      </div>
    </div>
  );
};

export default TokensFilters;
