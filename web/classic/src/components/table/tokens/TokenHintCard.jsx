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

import React, { useState } from 'react';
import { Button, Tooltip, Typography } from '@douyinfe/semi-ui';
import { IconTickCircle } from '@douyinfe/semi-icons';
import { BookOpen, Copy, KeyRound, Package, Star } from 'lucide-react';
import { WORKBENCH_HERO_CLASS } from '../../../constants/workbench.constants';
import { maskTokenKey } from '../../../helpers/tokenPage';
import { copy, showSuccess } from '../../../helpers';
import { fetchTokenKey } from '../../../helpers/token';
import { formatApiKey } from '../../../helpers/defaultToken';

const { Text } = Typography;

const InlineCopy = ({ value, t, ariaLabel, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    if (!value) return;
    let ok;
    if (onCopy) {
      ok = await onCopy();
    } else {
      ok = await copy(value);
      if (ok) showSuccess(t('已复制到剪贴板！'));
    }
    if (ok !== false) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };
  return (
    <Tooltip content={copied ? t('已复制') : t('复制')}>
      <Button
        size='small'
        theme='borderless'
        type='tertiary'
        icon={
          copied ? (
            <IconTickCircle style={{ color: 'var(--semi-color-success)' }} />
          ) : (
            <Copy size={14} />
          )
        }
        aria-label={ariaLabel}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

const TokenHintCard = ({
  baseUrl,
  defaultToken,
  onOpenGuide,
  onCopyAccessPackage,
  t,
}) => {
  const hasDefault = Boolean(defaultToken?.id);
  const maskedKey = hasDefault ? maskTokenKey(defaultToken) : '';

  const copyDefaultKey = async () => {
    if (!defaultToken?.id) return false;
    try {
      const key = await fetchTokenKey(defaultToken.id);
      const ok = await copy(formatApiKey(key));
      if (ok) showSuccess(t('已复制到剪贴板！'));
      return ok;
    } catch {
      return false;
    }
  };

  return (
    <div className={`${WORKBENCH_HERO_CLASS} mb-5 !p-4 md:!p-5`}>
      <div className='flex items-start gap-3'>
        <div className='rounded-xl bg-blue-500/15 p-2.5 shrink-0 hidden sm:block'>
          <KeyRound size={20} className='text-blue-600 dark:text-blue-400' />
        </div>
        <div className='min-w-0 flex-1'>
          {hasDefault ? (
            <>
              <div className='flex flex-wrap items-center gap-2 mb-3'>
                <Star size={14} className='text-amber-500 shrink-0' />
                <Text strong className='!text-sm'>
                  {t('默认 Key')} ·{' '}
                  <span className='text-semi-color-text-1'>
                    {defaultToken.name || t('未命名 Key')}
                  </span>
                </Text>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-3'>
                <div className='flex items-center gap-2 min-w-0 rounded-lg bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-700/40 px-3 py-2'>
                  <span className='text-xs text-semi-color-text-2 shrink-0'>
                    Base URL
                  </span>
                  <code className='text-xs font-mono text-semi-color-text-1 truncate flex-1'>
                    {baseUrl || '-'}
                  </code>
                  <InlineCopy
                    value={baseUrl}
                    t={t}
                    ariaLabel={t('复制 Base URL')}
                  />
                </div>
                <div className='flex items-center gap-2 min-w-0 rounded-lg bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-700/40 px-3 py-2'>
                  <span className='text-xs text-semi-color-text-2 shrink-0'>
                    API Key
                  </span>
                  <code className='text-xs font-mono text-semi-color-text-1 truncate flex-1'>
                    {maskedKey}
                  </code>
                  <InlineCopy
                    value={maskedKey}
                    t={t}
                    ariaLabel={t('复制 API Key')}
                    onCopy={copyDefaultKey}
                  />
                </div>
              </div>

              <div className='flex flex-col sm:flex-row flex-wrap gap-2'>
                <Button
                  theme='solid'
                  type='primary'
                  icon={<Package size={16} />}
                  onClick={onCopyAccessPackage}
                  className='!rounded-full'
                >
                  {t('一键复制接入包')}
                </Button>
                <Button
                  type='tertiary'
                  icon={<BookOpen size={16} />}
                  onClick={onOpenGuide}
                  className='!rounded-full'
                >
                  {t('查看接入教程')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Text className='block mb-1 text-base font-semibold text-semi-color-text-0'>
                {t('还没有默认 API Key')}
              </Text>
              <Text type='secondary' className='block mb-3 text-sm leading-relaxed'>
                {t('创建第一个 API Key 后，即可在 Cherry Studio / Cursor / Chatbox 等客户端中调用模型。')}
              </Text>
              {baseUrl ? (
                <div className='flex items-center gap-2 min-w-0 rounded-lg bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-700/40 px-3 py-2 mb-3 max-w-md'>
                  <span className='text-xs text-semi-color-text-2 shrink-0'>
                    Base URL
                  </span>
                  <code className='text-xs font-mono text-semi-color-text-1 truncate flex-1'>
                    {baseUrl}
                  </code>
                  <InlineCopy
                    value={baseUrl}
                    t={t}
                    ariaLabel={t('复制 Base URL')}
                  />
                </div>
              ) : null}
              <Button
                type='tertiary'
                icon={<BookOpen size={16} />}
                onClick={onOpenGuide}
                className='!rounded-full'
              >
                {t('查看接入教程')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenHintCard;
