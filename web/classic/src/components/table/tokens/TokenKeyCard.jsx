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
import {
  Button,
  Dropdown,
  Modal,
  Progress,
  Tooltip,
  Typography,
  Toast,
} from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconEdit,
  IconDelete,
  IconStop,
  IconPlay,
  IconTickCircle,
} from '@douyinfe/semi-icons';
import { Copy, ExternalLink, MoreHorizontal, Package, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { timestamp2string } from '../../../helpers';
import {
  buildUsageLogLink,
  getTokenExpiryInfo,
  getTokenQuotaParts,
  getTokenStatusMeta,
  isTokenLowBalance,
  maskTokenKey,
} from '../../../helpers/tokenPage';
import { WORKBENCH_CARD_CLASS } from '../../../constants/workbench.constants';
import StatusPill from '../../common/ui/StatusPill';

const { Text } = Typography;

const TONE_TEXT_CLASS = {
  normal: 'text-semi-color-text-1',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const TokenKeyCard = ({
  record,
  t,
  copyTokenKey,
  manageToken,
  refresh,
  setEditingToken,
  setShowEdit,
  onOpenLink,
  loadingTokenKeys,
  isDefault,
  onSetDefault,
  onCopyAccessPackage,
}) => {
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const statusMeta = getTokenStatusMeta(record.status, t);
  const quota = getTokenQuotaParts(record);
  const expiry = getTokenExpiryInfo(record, t);
  const maskedKey = maskTokenKey(record);
  const isKeyLoading = Boolean(loadingTokenKeys?.[record.id]);
  const isThisDefault = Boolean(isDefault?.(record.id));
  const lowBalance =
    record.status === 1 && !quota.unlimited && isTokenLowBalance(record);
  const expiringSoon =
    record.status === 1 && (expiry.tone === 'warning' || expiry.tone === 'danger');
  const needsAttention = lowBalance || expiringSoon;

  const quotaPercent = quota.unlimited
    ? null
    : quota.total > 0
      ? Math.min(100, Math.round((quota.remain / quota.total) * 100))
      : null;
  const progressColor =
    quotaPercent !== null && quotaPercent <= 10
      ? 'var(--semi-color-danger)'
      : quotaPercent !== null && quotaPercent <= 30
        ? 'var(--semi-color-warning)'
        : undefined;

  const handleCopy = async () => {
    if (copying || isKeyLoading) return;
    setCopying(true);
    try {
      await copyTokenKey(record);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t('确定是否要删除此令牌？'),
      content: t('此修改将不可逆，删除后使用该 Key 的应用将无法继续调用。'),
      okType: 'danger',
      onOk: async () => {
        await manageToken(record.id, 'delete', record);
        await refresh();
      },
    });
  };

  const handleToggleStatus = async () => {
    const action = record.status === 1 ? 'disable' : 'enable';
    await manageToken(record.id, action, record);
    await refresh();
  };

  const handleSetDefault = () => {
    if (isThisDefault) return;
    onSetDefault?.(record.id);
    Toast.success(t('已设为默认 Key'));
  };

  let chatMenuItems = [];
  try {
    const raw = localStorage.getItem('chats');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      chatMenuItems = parsed
        .map((item, index) => {
          const name = Object.keys(item)[0];
          if (!name) return null;
          return {
            node: 'item',
            key: `chat-${index}`,
            name,
            onClick: () => onOpenLink(name, item[name], record),
          };
        })
        .filter(Boolean);
    }
  } catch (_) {
    // ignore malformed chat config
  }

  const moreMenu = [
    {
      node: 'item',
      name: t('查看使用记录'),
      icon: <ExternalLink size={14} />,
      onClick: () => navigate(buildUsageLogLink(record.name)),
    },
    {
      node: 'item',
      name: t('编辑'),
      icon: <IconEdit />,
      onClick: () => {
        setEditingToken(record);
        setShowEdit(true);
      },
    },
    record.status === 1
      ? {
          node: 'item',
          name: t('禁用'),
          icon: <IconStop />,
          onClick: handleToggleStatus,
        }
      : {
          node: 'item',
          name: t('启用'),
          icon: <IconPlay />,
          onClick: handleToggleStatus,
        },
    ...(chatMenuItems.length > 0
      ? [{ node: 'divider' }, ...chatMenuItems]
      : []),
    { node: 'divider' },
    {
      node: 'item',
      name: t('删除'),
      icon: <IconDelete />,
      type: 'danger',
      onClick: handleDelete,
    },
  ];

  const cardBorderClass = isThisDefault
    ? 'ring-2 ring-amber-400/60 dark:ring-amber-500/40 border-amber-400/40 dark:border-amber-500/30'
    : needsAttention
      ? 'border-amber-500/40 dark:border-amber-500/30'
      : '';

  return (
    <div
      className={`${WORKBENCH_CARD_CLASS} ${cardBorderClass} relative p-4 md:p-5 flex flex-col gap-4 transition-opacity ${
        record.status !== 1 ? 'opacity-80' : ''
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2 mb-1'>
            <h3 className='text-base font-semibold text-semi-color-text-0 truncate'>
              {record.name || t('未命名 Key')}
            </h3>
            {isThisDefault ? (
              <StatusPill
                tone='highlight'
                size='small'
                icon={<Star size={11} fill='currentColor' />}
              >
                {t('默认 Key')}
              </StatusPill>
            ) : null}
            <StatusPill tone={statusMeta.tone} size='small' variant='solid'>
              {statusMeta.label}
            </StatusPill>
            {lowBalance ? (
              <StatusPill tone='danger' size='small' variant='solid'>
                {t('额度不足')}
              </StatusPill>
            ) : null}
          </div>
          <div className='flex items-center gap-2 mt-2'>
            <code className='text-xs md:text-sm font-mono text-semi-color-text-1 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded-lg truncate max-w-full'>
              {maskedKey}
            </code>
            <Tooltip content={copied ? t('已复制') : t('复制 Key')}>
              <Button
                theme='borderless'
                type='tertiary'
                size='small'
                icon={
                  copied ? (
                    <IconTickCircle
                      style={{ color: 'var(--semi-color-success)' }}
                    />
                  ) : (
                    <IconCopy />
                  )
                }
                aria-label={t('复制密钥')}
                loading={copying || isKeyLoading}
                disabled={copying || isKeyLoading}
                onClick={handleCopy}
              />
            </Tooltip>
          </div>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {!isThisDefault && record.status === 1 ? (
            <Tooltip content={t('设为默认 Key')}>
              <Button
                theme='borderless'
                type='tertiary'
                icon={<Star size={16} />}
                aria-label={t('设为默认 Key')}
                onClick={handleSetDefault}
              />
            </Tooltip>
          ) : null}
          <Dropdown trigger='click' position='bottomRight' menu={moreMenu}>
            <Button
              theme='borderless'
              type='tertiary'
              icon={<MoreHorizontal size={18} />}
              aria-label={t('更多操作')}
            />
          </Dropdown>
        </div>
      </div>

      <div className='space-y-3'>
        {quota.unlimited ? (
          <div className='flex items-center justify-between text-sm'>
            <Text type='tertiary' size='small'>
              {t('额度')}
            </Text>
            <span className='font-medium text-semi-color-text-0'>
              {t('无限制')}
            </span>
          </div>
        ) : (
          <div>
            <div className='flex items-baseline justify-between gap-2 mb-1.5'>
              <Text type='tertiary' size='small'>
                {t('剩余额度')}
              </Text>
              <div className='flex items-baseline gap-1.5 min-w-0'>
                <span
                  className={`text-base font-semibold tabular-nums truncate ${
                    lowBalance
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-semi-color-text-0'
                  }`}
                >
                  {quota.remainText}
                </span>
                <span className='text-xs text-semi-color-text-2 tabular-nums shrink-0'>
                  / {quota.totalText}
                </span>
              </div>
            </div>
            {quotaPercent !== null ? (
              <Progress
                percent={quotaPercent}
                stroke={progressColor}
                showInfo={false}
                size='small'
                aria-label={t('剩余额度比例')}
              />
            ) : null}
            {quota.used > 0 ? (
              <div className='mt-1 text-[11px] text-semi-color-text-2'>
                {t('已用 {{used}}', { used: quota.usedText })}
              </div>
            ) : null}
          </div>
        )}

        <div className='flex items-center justify-between text-sm'>
          <Text type='tertiary' size='small'>
            {t('过期时间')}
          </Text>
          {expiry.absolute ? (
            <Tooltip content={expiry.absolute}>
              <span
                className={`text-sm font-medium ${
                  TONE_TEXT_CLASS[expiry.tone] || TONE_TEXT_CLASS.normal
                }`}
              >
                {expiry.label}
              </span>
            </Tooltip>
          ) : (
            <span
              className={`text-sm font-medium ${
                TONE_TEXT_CLASS[expiry.tone] || TONE_TEXT_CLASS.normal
              }`}
            >
              {expiry.label}
            </span>
          )}
        </div>
      </div>

      <div className='flex flex-col sm:flex-row flex-wrap gap-2 pt-1 border-t border-zinc-200/70 dark:border-zinc-700/50'>
        <Button
          theme='solid'
          type='primary'
          icon={
            copied ? (
              <IconTickCircle style={{ color: '#fff' }} />
            ) : (
              <Copy size={15} />
            )
          }
          loading={copying || isKeyLoading}
          disabled={copying || isKeyLoading}
          onClick={handleCopy}
          className='!rounded-full flex-1 sm:flex-initial'
        >
          {copied ? t('已复制') : t('复制 Key')}
        </Button>
        <Button
          type='tertiary'
          icon={<Package size={15} />}
          onClick={() => onCopyAccessPackage?.(record)}
          className='!rounded-full flex-1 sm:flex-initial'
        >
          {t('复制接入包')}
        </Button>
        <Button
          type='tertiary'
          icon={<ExternalLink size={15} />}
          onClick={() => navigate(buildUsageLogLink(record.name))}
          className='!rounded-full flex-1 sm:flex-initial hidden sm:inline-flex'
        >
          {t('查看使用记录')}
        </Button>
      </div>

      <div className='-mt-1 text-[11px] text-semi-color-text-2'>
        {record.created_time
          ? t('创建于 {{time}}', { time: timestamp2string(record.created_time) })
          : null}
      </div>
    </div>
  );
};

export default TokenKeyCard;
