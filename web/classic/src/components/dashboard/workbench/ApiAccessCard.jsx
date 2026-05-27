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
import { Card, Button, Typography } from '@douyinfe/semi-ui';
import { Link2, Copy, Gauge, BookOpen, FlaskConical, Package, KeyRound } from 'lucide-react';
import { WORKBENCH_BACKUP_BASE_URL, WORKBENCH_CARD_CLASS } from '../../../constants/workbench.constants';
import { handleCopyUrl, handleSpeedTest } from '../../../helpers/dashboard';

const { Text } = Typography;

const EndpointRow = ({ label, url, onCopy, onTest, t, showTest }) => {
  if (!url) return null;

  return (
    <div className='rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 bg-zinc-50/80 dark:bg-zinc-800/30 p-3'>
      <Text type='tertiary' size='small' className='block mb-2'>
        {label}
      </Text>
      <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
        <code className='flex-1 text-sm text-semi-color-primary break-all font-mono'>
          {url}
        </code>
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Button
            size='small'
            icon={<Copy size={14} />}
            onClick={() => onCopy(url)}
            className='!rounded-lg'
          >
            {t('复制')}
          </Button>
          {showTest ? (
            <Button
              size='small'
              type='tertiary'
              icon={<Gauge size={14} />}
              onClick={() => onTest(url)}
              className='!rounded-lg'
            >
              {t('测速')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ApiAccessCard = ({
  primaryBaseUrl,
  hasApiKey,
  defaultTokenPreview,
  onOpenGuide,
  onTryPlayground,
  onCopyAccessPackage,
  onCopyApiKey,
  onManageKeys,
  t,
}) => {
  const backupUrl = (WORKBENCH_BACKUP_BASE_URL || '').trim();

  const handleCopy = (url) => handleCopyUrl(url, t);

  return (
    <Card
      className={WORKBENCH_CARD_CLASS}
      title={
        <div className='flex items-center gap-2 text-semi-color-text-0'>
          <Link2 size={18} className='text-cyan-500' />
          <span>{t('API 接入信息')}</span>
        </div>
      }
      bodyStyle={{ paddingTop: 8 }}
    >
      <div className='space-y-3'>
        <Text type='secondary' size='small' className='block'>
          {hasApiKey
            ? t('默认 Key 与 Base URL 可直接复制，填入客户端即可使用。')
            : t('将以下地址填入客户端的 Base URL / API 地址栏即可。')}
        </Text>

        {hasApiKey && defaultTokenPreview ? (
          <div className='rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/10 p-3 space-y-2'>
            <div className='flex items-center gap-2'>
              <KeyRound size={16} className='text-cyan-600 dark:text-cyan-400' />
              <Text strong size='small'>
                {defaultTokenPreview.name || t('未命名 Key')}
              </Text>
              <Text type='tertiary' size='small'>
                {t('默认 Key')}
              </Text>
            </div>
            <code className='block text-xs md:text-sm font-mono text-semi-color-text-1 break-all'>
              {defaultTokenPreview.maskedKey}
            </code>
            <div className='flex flex-col sm:flex-row gap-2'>
              <Button
                theme='solid'
                type='primary'
                size='small'
                icon={<Package size={14} />}
                onClick={onCopyAccessPackage}
                className='!rounded-lg flex-1'
              >
                {t('一键复制接入包')}
              </Button>
              <Button
                type='tertiary'
                size='small'
                icon={<Copy size={14} />}
                onClick={onCopyApiKey}
                className='!rounded-lg flex-1'
              >
                {t('复制 Key')}
              </Button>
            </div>
          </div>
        ) : null}

        <EndpointRow
          label={t('主线路 Base URL')}
          url={primaryBaseUrl}
          onCopy={handleCopy}
          onTest={handleSpeedTest}
          showTest
          t={t}
        />

        {backupUrl ? (
          <EndpointRow
            label={t('备用线路 Base URL')}
            url={backupUrl}
            onCopy={handleCopy}
            onTest={handleSpeedTest}
            showTest
            t={t}
          />
        ) : (
          <div className='rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-3'>
            <Text type='tertiary' size='small'>
              {t('备用线路暂未配置，主线路不可用时请联系管理员。')}
            </Text>
          </div>
        )}

        <div className='flex flex-col sm:flex-row gap-2 pt-1'>
          <Button
            type='tertiary'
            icon={<BookOpen size={16} />}
            onClick={onOpenGuide}
            className='!rounded-xl flex-1'
          >
            {t('查看接入教程')}
          </Button>
          {hasApiKey ? (
            <Button
              type='tertiary'
              icon={<KeyRound size={16} />}
              onClick={onManageKeys}
              className='!rounded-xl flex-1'
            >
              {t('管理 API Key')}
            </Button>
          ) : (
            <Button
              type='tertiary'
              icon={<FlaskConical size={16} />}
              onClick={onTryPlayground}
              className='!rounded-xl flex-1'
            >
              {t('在线测试')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ApiAccessCard;
