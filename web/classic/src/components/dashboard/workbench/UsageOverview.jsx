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
import { Card, Skeleton, Typography, Empty } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { BarChart3 } from 'lucide-react';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { renderQuota } from '../../../helpers';
import { getTrendSpec } from '../../../helpers/dashboard';
import { CHART_CONFIG } from '../../../constants/dashboard.constants';
import { WORKBENCH_CARD_CLASS } from '../../../constants/workbench.constants';

const { Text } = Typography;

const MetricItem = ({ label, value, loading }) => (
  <div className='rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3'>
    <Text type='tertiary' size='small' className='block mb-1'>
      {label}
    </Text>
    <Skeleton loading={loading} active placeholder={<Skeleton.Title style={{ width: 80, height: 22 }} />}>
      <div className='text-lg font-semibold text-semi-color-text-0'>{value}</div>
    </Skeleton>
  </div>
);

const UsageOverview = ({
  last24hQuota,
  usedQuota,
  requestCount,
  consumeTrend,
  hasTrendChart,
  loading,
  t,
}) => {
  return (
    <Card
      className={WORKBENCH_CARD_CLASS}
      title={
        <div className='flex items-center gap-2 text-semi-color-text-0'>
          <BarChart3 size={18} className='text-indigo-500' />
          <span>{t('用量概览')}</span>
        </div>
      }
      bodyStyle={{ paddingTop: 8 }}
    >
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4'>
        <MetricItem
          label={t('近 24 小时消耗')}
          value={renderQuota(last24hQuota)}
          loading={loading}
        />
        <MetricItem
          label={t('历史总消耗')}
          value={renderQuota(usedQuota)}
          loading={loading}
        />
        <MetricItem
          label={t('总请求数')}
          value={Number(requestCount || 0).toLocaleString()}
          loading={loading}
        />
      </div>

      <div className='rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/20 p-3 min-h-[120px]'>
        <Text type='tertiary' size='small' className='block mb-2'>
          {t('最近调用趋势')}
        </Text>
        {loading ? (
          <Skeleton placeholder={<Skeleton.Image style={{ width: '100%', height: 80 }} />} active />
        ) : hasTrendChart ? (
          <div className='h-[80px] w-full'>
            <VChart
              spec={getTrendSpec(consumeTrend, '#6366f1')}
              option={CHART_CONFIG}
            />
          </div>
        ) : (
          <Empty
            image={<IllustrationNoResult style={{ width: 80, height: 80 }} />}
            darkModeImage={
              <IllustrationNoResultDark style={{ width: 80, height: 80 }} />
            }
            description={t('暂无调用数据，创建 API Key 并开始第一次请求吧')}
            style={{ padding: '8px 0' }}
          />
        )}
      </div>
    </Card>
  );
};

export default UsageOverview;
