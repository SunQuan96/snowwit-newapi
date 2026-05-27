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
import { Card, Button, Tag, Skeleton, Typography } from '@douyinfe/semi-ui';
import { Wallet, Clock, TrendingDown } from 'lucide-react';
import { renderQuota } from '../../../helpers';
import { WORKBENCH_CARD_CLASS } from '../../../constants/workbench.constants';

const { Text } = Typography;

const STATUS_COLOR = {
  normal: 'green',
  low: 'orange',
  empty: 'red',
};

const BalanceOverviewCard = ({
  remainingQuota,
  accountStatus,
  last24hQuota,
  estimatedDuration,
  loading,
  onTopUp,
  t,
}) => {
  return (
    <Card
      className={WORKBENCH_CARD_CLASS}
      title={
        <div className='flex items-center gap-2 text-semi-color-text-0'>
          <Wallet size={18} className='text-blue-500' />
          <span>{t('余额总览')}</span>
        </div>
      }
      bodyStyle={{ paddingTop: 8 }}
    >
      <div className='space-y-5'>
        <div>
          <Text type='tertiary' size='small'>
            {t('剩余额度')}
          </Text>
          <Skeleton loading={loading} active placeholder={<Skeleton.Title style={{ width: 160, height: 36 }} />}>
            <div className='text-3xl md:text-4xl font-bold text-semi-color-text-0 mt-1 tracking-tight'>
              {renderQuota(remainingQuota)}
            </div>
          </Skeleton>
          <div className='mt-2'>
            <Tag
              color={STATUS_COLOR[accountStatus.level] || 'grey'}
              size='large'
              shape='circle'
            >
              {t('账户状态')}：{accountStatus.label}
            </Tag>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3'>
            <div className='flex items-center gap-2 text-semi-color-text-2 text-xs mb-1'>
              <TrendingDown size={14} />
              {t('近 24 小时消耗')}
            </div>
            <Skeleton loading={loading} active placeholder={<Skeleton.Title style={{ width: 100, height: 20 }} />}>
              <div className='text-lg font-semibold text-semi-color-text-0'>
                {renderQuota(last24hQuota)}
              </div>
            </Skeleton>
          </div>
          <div className='rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3'>
            <div className='flex items-center gap-2 text-semi-color-text-2 text-xs mb-1'>
              <Clock size={14} />
              {t('预计可用时长')}
            </div>
            <Skeleton loading={loading} active placeholder={<Skeleton.Title style={{ width: 100, height: 20 }} />}>
              <div className='text-lg font-semibold text-semi-color-text-0'>
                {estimatedDuration}
              </div>
            </Skeleton>
          </div>
        </div>

        <Button
          theme='solid'
          type='primary'
          block
          size='large'
          className='!rounded-xl'
          onClick={onTopUp}
        >
          {t('前往钱包充值')}
        </Button>
      </div>
    </Card>
  );
};

export default BalanceOverviewCard;
