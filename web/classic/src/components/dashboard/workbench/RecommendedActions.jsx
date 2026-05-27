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
import { Typography } from '@douyinfe/semi-ui';
import {
  FlaskConical,
  KeyRound,
  ScrollText,
  Tags,
  BookOpen,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';
import { WORKBENCH_CARD_CLASS } from '../../../constants/workbench.constants';

const { Title, Text } = Typography;

/**
 * @param {object} props
 * @param {(path: string) => void} props.onNavigate
 * @param {() => void} props.onOpenGuide
 * @param {(key: string) => string} props.t
 */
const RecommendedActions = ({ onNavigate, onOpenGuide, t }) => {
  const actions = [
    {
      key: 'playground',
      icon: FlaskConical,
      title: t('游乐场'),
      desc: t('在线测试模型'),
      onClick: () => onNavigate('/console/playground'),
      accent: 'text-violet-500',
    },
    {
      key: 'token',
      icon: KeyRound,
      title: t('API Key'),
      desc: t('创建和管理密钥'),
      onClick: () => onNavigate('/console/token'),
      accent: 'text-blue-500',
    },
    {
      key: 'log',
      icon: ScrollText,
      title: t('使用记录'),
      desc: t('查看请求、错误和扣费'),
      onClick: () => onNavigate('/console/log'),
      accent: 'text-emerald-500',
    },
    {
      key: 'pricing',
      icon: Tags,
      title: t('模型定价'),
      desc: t('调用前查看价格'),
      onClick: () => onNavigate('/pricing'),
      accent: 'text-amber-500',
    },
    {
      key: 'data-dashboard',
      icon: LayoutDashboard,
      title: t('查看数据分析'),
      desc: t('图表与模型统计'),
      onClick: () => onNavigate('/console/detail'),
      accent: 'text-indigo-500',
    },
    {
      key: 'guide',
      icon: BookOpen,
      title: t('接入教程'),
      desc: t('配置常见客户端'),
      onClick: onOpenGuide,
      accent: 'text-cyan-500',
    },
  ];

  return (
    <section className='mb-5'>
      <Title heading={5} className='!mb-3 !text-semi-color-text-0'>
        {t('推荐操作')}
      </Title>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3'>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type='button'
              onClick={action.onClick}
              className={`${WORKBENCH_CARD_CLASS} text-left p-4 transition-all hover:shadow-md hover:border-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div
                  className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ${action.accent}`}
                >
                  <Icon size={20} />
                </div>
                <ChevronRight
                  size={16}
                  className='text-semi-color-text-2 mt-1 flex-shrink-0'
                />
              </div>
              <div className='mt-3'>
                <div className='font-medium text-semi-color-text-0 text-sm'>
                  {action.title}
                </div>
                <Text type='tertiary' size='small' className='mt-1 block'>
                  {action.desc}
                </Text>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedActions;
