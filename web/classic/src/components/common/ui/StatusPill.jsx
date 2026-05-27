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

/** 使用 Semi 设计令牌（classic 主题 tailwind 仅注册了 semi-color-*） */
const TONE_CLASS = {
  success:
    'bg-semi-color-success-light-default border-semi-color-success-light-active text-semi-color-success',
  danger:
    'bg-semi-color-danger-light-default border-semi-color-danger-light-active text-semi-color-danger',
  warning:
    'bg-semi-color-warning-light-default border-semi-color-warning-light-active text-semi-color-warning',
  neutral:
    'bg-semi-color-fill-0 border-semi-color-border text-semi-color-text-2',
  highlight:
    'bg-semi-color-warning-light-default border-semi-color-warning text-semi-color-warning',
  info:
    'bg-semi-color-info-light-default border-semi-color-info-light-active text-semi-color-info',
};

const TONE_CLASS_SOLID = {
  success:
    'bg-semi-color-success border-semi-color-success text-semi-color-white',
  danger: 'bg-semi-color-danger border-semi-color-danger text-semi-color-white',
  warning:
    'bg-semi-color-warning border-semi-color-warning text-semi-color-white',
  neutral:
    'bg-semi-color-tertiary border-semi-color-tertiary text-semi-color-white',
  highlight:
    'bg-semi-color-warning border-semi-color-warning text-semi-color-white',
  info: 'bg-semi-color-info border-semi-color-info text-semi-color-white',
};

const DOT_CLASS = {
  success: 'bg-semi-color-success',
  danger: 'bg-semi-color-danger',
  warning: 'bg-semi-color-warning',
  neutral: 'bg-semi-color-text-2',
  highlight: 'bg-semi-color-white',
  info: 'bg-semi-color-info',
};

const SIZE_CLASS = {
  small: 'h-[20px] text-[11px] px-2',
  medium: 'h-[22px] text-xs px-2.5',
};

/**
 * 统一徽章组件 — 用于状态/默认/提示等场景
 *
 * @param {('success'|'danger'|'warning'|'neutral'|'highlight'|'info')} tone
 * @param {('small'|'medium')} size
 * @param {('soft'|'solid')} variant 颜色变体：soft=软色（默认），solid=实色填充
 * @param {boolean} dot 是否显示前缀状态点
 * @param {React.ReactNode} icon 自定义前缀图标（覆盖 dot）
 * @param {React.ReactNode} children 文本
 * @param {string} className 额外 className
 */
const StatusPill = ({
  tone = 'neutral',
  size = 'medium',
  variant = 'soft',
  dot = false,
  icon = null,
  children,
  className = '',
}) => {
  const toneMap = variant === 'solid' ? TONE_CLASS_SOLID : TONE_CLASS;
  const toneClass = toneMap[tone] || toneMap.neutral;
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.medium;
  const hasPrefix = Boolean(icon || dot);
  return (
    <span
      className={`status-pill inline-flex items-center whitespace-nowrap shrink-0 max-w-full ${
        hasPrefix ? 'gap-1.5' : 'justify-center'
      } rounded-full border font-medium leading-none ${toneClass} ${sizeClass} ${className}`}
    >
      {icon ? (
        <span className='inline-flex shrink-0 items-center'>{icon}</span>
      ) : dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            variant === 'solid'
              ? 'bg-semi-color-white opacity-90'
              : DOT_CLASS[tone] || DOT_CLASS.neutral
          }`}
        />
      ) : null}
      <span className='whitespace-nowrap'>{children}</span>
    </span>
  );
};

export default StatusPill;
