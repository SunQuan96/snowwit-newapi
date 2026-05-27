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

import React, { useMemo } from 'react';
import { Button, Empty, Spin } from '@douyinfe/semi-ui';
import {
  IllustrationNoContent,
  IllustrationNoContentDark,
} from '@douyinfe/semi-illustrations';
import { Plus } from 'lucide-react';
import TokenKeyCard from './TokenKeyCard';
import { matchesTokenStatusFilter } from '../../../helpers/tokenPage';

// 状态优先级: 启用=0, 已耗尽=1, 已禁用=2, 已过期=3, 其它=4
const STATUS_RANK = { 1: 0, 4: 1, 2: 2, 3: 3 };
const getStatusRank = (status) =>
  STATUS_RANK[status] !== undefined ? STATUS_RANK[status] : 4;

const TokenKeyCardList = ({
  tokens,
  loading,
  statusFilter,
  searchMode,
  searchQuery,
  onCreate,
  onResetFilters,
  t,
  loadingTokenKeys,
  defaultTokenId,
  ...actionProps
}) => {
  const filteredTokens = useMemo(() => {
    const list = tokens.filter((record) =>
      matchesTokenStatusFilter(record, statusFilter),
    );
    return [...list].sort((a, b) => {
      // 默认 Key 永远置顶
      if (defaultTokenId) {
        if (a.id === defaultTokenId) return -1;
        if (b.id === defaultTokenId) return 1;
      }
      const rankA = getStatusRank(a.status);
      const rankB = getStatusRank(b.status);
      if (rankA !== rankB) return rankA - rankB;
      // 同状态下按 ID 倒序（创建时间近似）
      return (b.id || 0) - (a.id || 0);
    });
  }, [tokens, statusFilter, defaultTokenId]);

  const hasActiveFilters =
    (searchQuery && searchQuery.trim()) ||
    (statusFilter && statusFilter !== 'all');

  if (loading && tokens.length === 0) {
    return (
      <div className='flex justify-center py-16'>
        <Spin size='large' />
      </div>
    );
  }

  if (!loading && tokens.length === 0 && !searchMode) {
    return (
      <Empty
        image={
          <IllustrationNoContent style={{ width: 150, height: 150 }} />
        }
        darkModeImage={
          <IllustrationNoContentDark style={{ width: 150, height: 150 }} />
        }
        title={t('还没有 API Key')}
        description={t('创建第一个 API Key，即可在常用客户端中开始调用模型。')}
        style={{ padding: '40px 16px' }}
      >
        <Button
          theme='solid'
          type='primary'
          icon={<Plus size={16} />}
          onClick={onCreate}
          className='!rounded-full mt-2'
        >
          {t('创建 API Key')}
        </Button>
      </Empty>
    );
  }

  if (!loading && tokens.length === 0 && searchMode) {
    return (
      <Empty
        image={
          <IllustrationNoContent style={{ width: 120, height: 120 }} />
        }
        darkModeImage={
          <IllustrationNoContentDark style={{ width: 120, height: 120 }} />
        }
        title={t('未找到匹配的 API Key')}
        description={t('试试换个名称或密钥关键词，或清除筛选条件。')}
        style={{ padding: '32px 16px' }}
      >
        {hasActiveFilters && onResetFilters ? (
          <Button type='tertiary' onClick={onResetFilters} className='mt-2'>
            {t('重置筛选')}
          </Button>
        ) : null}
      </Empty>
    );
  }

  if (filteredTokens.length === 0) {
    return (
      <Empty
        image={
          <IllustrationNoContent style={{ width: 120, height: 120 }} />
        }
        darkModeImage={
          <IllustrationNoContentDark style={{ width: 120, height: 120 }} />
        }
        description={t('没有符合筛选条件的 API Key')}
        style={{ padding: '32px 16px' }}
      >
        {onResetFilters ? (
          <Button type='tertiary' onClick={onResetFilters} className='mt-2'>
            {t('重置筛选')}
          </Button>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className='relative'>
      {loading && tokens.length > 0 ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px]'>
          <Spin size='large' />
        </div>
      ) : null}
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4'>
        {filteredTokens.map((record) => (
          <TokenKeyCard
            key={record.id}
            record={record}
            t={t}
            loadingTokenKeys={loadingTokenKeys}
            {...actionProps}
          />
        ))}
      </div>
    </div>
  );
};

export default TokenKeyCardList;
