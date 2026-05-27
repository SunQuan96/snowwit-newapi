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
import { Banner, Button, Modal, Typography } from '@douyinfe/semi-ui';
import { BookOpen, Copy, KeyRound, Package } from 'lucide-react';
import { copy, showSuccess } from '../../../../helpers';
import { buildAccessPackageText } from '../../../../helpers/defaultToken';

const { Text, Paragraph } = Typography;

const TokenCreatedSuccessModal = ({
  visible,
  tokenName,
  apiKey,
  baseUrl,
  onClose,
  onOpenGuide,
  t,
}) => {
  const [copyingKey, setCopyingKey] = useState(false);
  const [copyingPackage, setCopyingPackage] = useState(false);

  const handleCopyKey = async () => {
    if (!apiKey || copyingKey) return;
    setCopyingKey(true);
    try {
      if (await copy(apiKey)) {
        showSuccess(t('已复制 API Key'));
      }
    } finally {
      setCopyingKey(false);
    }
  };

  const handleCopyPackage = async () => {
    if (!apiKey || !baseUrl || copyingPackage) return;
    setCopyingPackage(true);
    try {
      const text = buildAccessPackageText(baseUrl, apiKey);
      if (await copy(text)) {
        showSuccess(t('已复制接入信息到剪贴板'));
      }
    } finally {
      setCopyingPackage(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      title={
        <div className='flex items-center gap-2'>
          <KeyRound size={20} className='text-emerald-500' />
          <span>{t('API Key 创建成功')}</span>
        </div>
      }
    >
      <div className='space-y-4'>
        <Banner
          type='warning'
          description={t('请立即复制并妥善保存。关闭后将无法再次查看完整 Key。')}
          closeIcon={null}
        />

        {tokenName ? (
          <div>
            <Text type='tertiary' size='small'>
              {t('名称')}
            </Text>
            <p className='mt-1 font-medium text-semi-color-text-0'>{tokenName}</p>
          </div>
        ) : null}

        <div>
          <Text type='tertiary' size='small'>
            API Key
          </Text>
          <code className='mt-1 block w-full break-all rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2.5 text-sm font-mono text-semi-color-text-0'>
            {apiKey}
          </code>
        </div>

        {baseUrl ? (
          <div>
            <Text type='tertiary' size='small'>
              Base URL
            </Text>
            <code className='mt-1 block w-full break-all rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2.5 text-sm font-mono text-semi-color-text-1'>
              {baseUrl}
            </code>
          </div>
        ) : null}

        <Paragraph type='secondary' size='small' className='!mb-0'>
          {t('下一步：将 Base URL 和 API Key 填入 Cherry Studio、Cursor 或 Chatbox。')}
        </Paragraph>

        <div className='flex flex-col sm:flex-row flex-wrap gap-2 pt-1'>
          <Button
            theme='solid'
            type='primary'
            icon={<Package size={16} />}
            loading={copyingPackage}
            onClick={handleCopyPackage}
            className='!rounded-full flex-1'
          >
            {t('一键复制接入包')}
          </Button>
          <Button
            type='tertiary'
            icon={<Copy size={16} />}
            loading={copyingKey}
            onClick={handleCopyKey}
            className='!rounded-full flex-1'
          >
            {t('仅复制 Key')}
          </Button>
          <Button
            type='tertiary'
            icon={<BookOpen size={16} />}
            onClick={() => {
              onOpenGuide?.();
              onClose?.();
            }}
            className='!rounded-full flex-1'
          >
            {t('查看接入教程')}
          </Button>
        </div>

        <div className='flex justify-end pt-1'>
          <Button type='tertiary' onClick={onClose} className='!rounded-full'>
            {t('我已保存，关闭')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TokenCreatedSuccessModal;
