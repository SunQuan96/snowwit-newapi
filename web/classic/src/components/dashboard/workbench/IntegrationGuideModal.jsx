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

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Tabs, TabPane, Typography, Select } from '@douyinfe/semi-ui';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Title, Text } = Typography;

const GUIDE_SECTIONS = [
  {
    key: 'cherry',
    title: 'Cherry Studio',
    steps: [
      '打开 Cherry Studio 设置 → 模型服务',
      '选择 OpenAI 兼容接口',
      'Base URL 填入本平台的 API 地址',
      'API Key 填入你在「API Key」页创建的密钥',
      '保存后选择模型即可开始对话',
    ],
  },
  {
    key: 'cursor',
    title: 'Cursor',
    steps: [
      '打开 Cursor Settings → Models',
      '在 OpenAI API Key 处填入你的 API Key',
      'Override OpenAI Base URL 填入本平台的 API 地址',
      '保存后在模型列表中选择可用模型',
    ],
  },
  {
    key: 'chatbox',
    title: 'Chatbox',
    steps: [
      '打开 Chatbox 设置 → AI 模型提供商',
      '选择 OpenAI API 或自定义 OpenAI 兼容',
      'API Host / Base URL 填入本平台的 API 地址',
      'API Key 填入你的密钥',
      '选择模型并开始使用',
    ],
  },
  {
    key: 'sdk',
    title: 'OpenAI SDK',
    steps: [
      '安装 OpenAI SDK（Python / Node.js 等）',
      '初始化客户端时设置 base_url 为本平台 API 地址',
      'api_key 使用你在控制台创建的 API Key',
      '调用 chat.completions 等接口即可',
    ],
    code: `from openai import OpenAI

client = OpenAI(
    base_url="YOUR_BASE_URL/v1",
    api_key="YOUR_API_KEY",
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)`,
  },
];

const DEFAULT_SECTION_KEY = GUIDE_SECTIONS[0].key;

const GuideContent = ({ section, baseUrl, t }) => {
  const resolvedBaseUrl = baseUrl || 'https://your-api.example.com';

  return (
    <div className='workbench-guide-content'>
      <Title heading={6} className='!mb-3 !text-base md:!text-lg'>
        {section.title}
      </Title>
      <ol className='list-decimal pl-4 space-y-2.5 text-sm text-semi-color-text-1 mb-4 [text-wrap:pretty]'>
        {section.steps.map((step) => (
          <li key={step} className='leading-relaxed pl-1'>
            {t(step)}
          </li>
        ))}
      </ol>
      {section.code ? (
        <pre className='text-[11px] sm:text-xs md:text-sm p-3 sm:p-4 rounded-xl bg-zinc-900 text-zinc-100 overflow-x-auto max-w-full'>
          {section.code.replace('YOUR_BASE_URL', resolvedBaseUrl)}
        </pre>
      ) : null}
    </div>
  );
};

const IntegrationGuideModal = ({ visible, onClose, baseUrl, t }) => {
  const isMobile = useIsMobile();
  const [activeKey, setActiveKey] = useState(DEFAULT_SECTION_KEY);

  const clientOptions = useMemo(
    () =>
      GUIDE_SECTIONS.map((section) => ({
        value: section.key,
        label: section.title,
      })),
    [],
  );

  const activeSection =
    GUIDE_SECTIONS.find((section) => section.key === activeKey) ||
    GUIDE_SECTIONS[0];

  useEffect(() => {
    if (visible) {
      setActiveKey(DEFAULT_SECTION_KEY);
    }
  }, [visible]);

  return (
    <Modal
      title={t('客户端接入教程')}
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      className='workbench-guide-modal'
      maskClosable
      bodyStyle={{
        maxHeight: isMobile ? 'calc(100dvh - 200px)' : 'min(65vh, 520px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 4,
        paddingBottom: 8,
      }}
    >
      <div className='rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 bg-zinc-50/80 dark:bg-zinc-800/30 px-3.5 py-3 mb-4'>
        <Text type='tertiary' size='small' className='block mb-2 leading-relaxed'>
          {t('将 Base URL 和 API Key 填入以下客户端即可开始调用。当前推荐地址：')}
        </Text>
        <Text
          code
          className='!text-xs sm:!text-sm break-all block leading-relaxed !px-2 !py-1.5 !rounded-lg !bg-white/80 dark:!bg-zinc-900/60'
        >
          {baseUrl || t('（加载中）')}
        </Text>
      </div>

      {isMobile ? (
        <div className='workbench-guide-mobile'>
          <Text type='tertiary' size='small' className='block mb-2'>
            {t('选择客户端')}
          </Text>
          <Select
            value={activeKey}
            onChange={setActiveKey}
            optionList={clientOptions}
            block
            className='!mb-4'
            size='large'
          />
          <GuideContent section={activeSection} baseUrl={baseUrl} t={t} />
        </div>
      ) : (
        <Tabs
          type='line'
          activeKey={activeKey}
          onChange={setActiveKey}
          className='workbench-guide-tabs'
        >
          {GUIDE_SECTIONS.map((section) => (
            <TabPane tab={section.title} itemKey={section.key} key={section.key}>
              <GuideContent section={section} baseUrl={baseUrl} t={t} />
            </TabPane>
          ))}
        </Tabs>
      )}
    </Modal>
  );
};

export default IntegrationGuideModal;
