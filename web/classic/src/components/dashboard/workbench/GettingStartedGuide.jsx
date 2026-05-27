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
import { Button, Typography } from '@douyinfe/semi-ui';
import {
  CheckCircle2,
  KeyRound,
  Wallet,
  Plug,
  BookOpen,
  Package,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { WORKBENCH_HERO_CLASS } from '../../../constants/workbench.constants';

const { Text, Title } = Typography;

const STEPS = [
  {
    icon: KeyRound,
    titleKey: '创建 API Key',
    descKey: '为你的软件或应用创建专属密钥。',
    doneKey: '已创建 API Key',
  },
  {
    icon: Wallet,
    titleKey: '充值 / 兑换额度',
    descKey: '保持余额充足，避免调用中断。',
    doneKey: null,
  },
  {
    icon: Plug,
    titleKey: '配置到软件',
    descKey:
      '复制 Base URL 和 API Key 到 Cherry Studio、Cursor、Chatbox 或 SDK。',
    doneKey: null,
  },
];

const getStepState = (index, hasApiKey) => {
  if (hasApiKey) {
    if (index === 0) return 'done';
    if (index === 1) return 'current';
    return 'upcoming';
  }
  if (index === 0) return 'current';
  return 'upcoming';
};

const StepIndicator = ({ hasApiKey, t }) => {
  const completedCount = hasApiKey ? 1 : 0;

  return (
    <div className='mb-4 md:mb-5'>
      <div className='flex items-center justify-between gap-2 mb-2'>
        <Text type='tertiary' size='small' className='!text-xs uppercase tracking-wide'>
          {t('接入进度')}
        </Text>
        <Text type='tertiary' size='small' className='!text-xs tabular-nums'>
          {completedCount}/{STEPS.length}
        </Text>
      </div>
      <div className='flex items-center gap-0' role='list' aria-label={t('接入进度')}>
        {STEPS.map((step, index) => {
          const state = getStepState(index, hasApiKey);
          const isLast = index === STEPS.length - 1;
          const label =
            state === 'done' && step.doneKey
              ? t(step.doneKey)
              : t(step.titleKey);

          return (
            <React.Fragment key={step.titleKey}>
              <div className='flex flex-col items-center flex-1 min-w-0' role='listitem'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    state === 'done'
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : state === 'current'
                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                        : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-semi-color-text-2'
                  }`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={16} aria-hidden />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight line-clamp-2 px-0.5 ${
                    state === 'done'
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : state === 'current'
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-semi-color-text-2'
                  }`}
                >
                  {label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={`h-0.5 flex-1 max-w-[24px] sm:max-w-[40px] mx-0.5 sm:mx-1 mb-5 rounded-full ${
                    index < completedCount
                      ? 'bg-emerald-500/60'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                  aria-hidden
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const StepRow = ({ step, index, hasApiKey, t }) => {
  const Icon = step.icon;
  const state = getStepState(index, hasApiKey);
  const title =
    state === 'done' && step.doneKey ? t(step.doneKey) : t(step.titleKey);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 md:p-4 transition-colors ${
        state === 'done'
          ? 'border-emerald-500/25 bg-emerald-500/[0.06] dark:bg-emerald-500/10'
          : state === 'current'
            ? 'border-blue-500/25 bg-blue-500/[0.06] dark:bg-blue-500/10'
            : 'border-zinc-200/70 dark:border-zinc-700/50 bg-white/40 dark:bg-zinc-900/30'
      }`}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          state === 'done'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : state === 'current'
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-semi-color-text-2'
        }`}
      >
        {state === 'done' ? <CheckCircle2 size={18} /> : <Icon size={18} />}
      </div>
      <div className='min-w-0 flex-1 pt-0.5'>
        <p className='font-medium text-semi-color-text-0 text-sm leading-snug'>
          {title}
        </p>
        <p className='mt-0.5 text-xs text-semi-color-text-2 leading-relaxed hidden sm:block'>
          {t(step.descKey)}
        </p>
      </div>
      {state === 'current' ? (
        <ArrowRight
          size={16}
          className='flex-shrink-0 text-blue-500/70 mt-2 hidden sm:block'
          aria-hidden
        />
      ) : null}
    </div>
  );
};

const GettingStartedGuide = ({
  hasApiKey,
  onCreateKey,
  onOpenGuide,
  onCopyAccessPackage,
  onManageKeys,
  t,
}) => {
  const currentStep = hasApiKey ? STEPS[1] : STEPS[0];
  const CurrentIcon = currentStep.icon;

  return (
    <section
      className={`${WORKBENCH_HERO_CLASS} !p-4 md:!p-6 mb-5 overflow-hidden relative`}
    >
      <div
        className='pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/15'
        aria-hidden
      />

      <div className='relative flex flex-col gap-4 md:gap-5'>
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
          <div className='flex-1 min-w-0'>
            {hasApiKey ? (
              <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2'>
                <Sparkles size={12} aria-hidden />
                {t('可以开始调用了')}
              </span>
            ) : (
              <span className='inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 mb-2'>
                {t('3 步完成接入')}
              </span>
            )}
            <Title heading={3} className='!mb-1 !text-semi-color-text-0 !text-lg md:!text-xl'>
              {hasApiKey
                ? t('你的 API 已就绪，可以开始接入了')
                : t('几分钟内开始使用你的 AI API')}
            </Title>
            <Text type='secondary' className='text-sm leading-relaxed block'>
              {hasApiKey
                ? t('复制接入包并填入常用客户端，即可开始调用模型。')
                : t('创建 API Key，复制接入地址，即可在常见工具中调用模型。')}
            </Text>
          </div>

          <div className='flex sm:hidden items-center gap-2 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/40 px-3 py-2'>
            <div className='w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500 flex-shrink-0'>
              <CurrentIcon size={16} />
            </div>
            <div className='min-w-0'>
              <Text type='tertiary' size='small' className='!text-[10px] block'>
                {t('下一步')}
              </Text>
              <Text size='small' className='!font-medium truncate block'>
                {t(currentStep.titleKey)}
              </Text>
            </div>
          </div>
        </div>

        <StepIndicator hasApiKey={hasApiKey} t={t} />

        <div className='grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3'>
          {STEPS.map((step, index) => (
            <StepRow
              key={step.titleKey}
              step={step}
              index={index}
              hasApiKey={hasApiKey}
              t={t}
            />
          ))}
        </div>

        <div className='flex flex-col gap-2 pt-1 md:pt-2 border-t border-zinc-200/50 dark:border-zinc-700/40'>
          {hasApiKey ? (
            <Button
              theme='solid'
              type='primary'
              size='large'
              icon={<Package size={18} />}
              onClick={onCopyAccessPackage}
              className='!rounded-xl w-full !h-11'
            >
              {t('一键复制接入包')}
            </Button>
          ) : (
            <Button
              theme='solid'
              type='primary'
              size='large'
              icon={<KeyRound size={18} />}
              onClick={onCreateKey}
              className='!rounded-xl w-full !h-11'
            >
              {t('创建 API Key')}
            </Button>
          )}
          <div className={hasApiKey ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
            {hasApiKey ? (
              <Button
                type='tertiary'
                size='large'
                icon={<KeyRound size={16} />}
                onClick={onManageKeys}
                className='!rounded-xl w-full !h-10'
              >
                {t('管理 API Key')}
              </Button>
            ) : null}
            <Button
              type='tertiary'
              size='large'
              icon={<BookOpen size={16} />}
              onClick={onOpenGuide}
              className='!rounded-xl w-full !h-10'
            >
              {t('查看接入教程')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GettingStartedGuide;
