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
import { Plus } from 'lucide-react';

const { Text } = Typography;

const TokenPageHeader = ({ onCreate, t, totalCount = 0 }) => {
  const hasTokens = totalCount > 0;
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5'>
      <div className='min-w-0'>
        <h1 className='text-xl md:text-2xl font-semibold text-semi-color-text-0'>
          {t('我的 API Key')}
          {hasTokens ? (
            <span className='ml-2 text-sm md:text-base text-semi-color-text-2 font-normal'>
              ({totalCount})
            </span>
          ) : null}
        </h1>
        <Text type='secondary' className='block mt-1 text-sm leading-relaxed'>
          {t('在 Cherry Studio / Cursor / Chatbox 等客户端调用模型的凭证，请勿公开分享。')}
        </Text>
      </div>
      <Button
        theme='solid'
        type='primary'
        size='large'
        icon={<Plus size={16} />}
        onClick={onCreate}
        className='!rounded-full shrink-0 self-start sm:self-auto'
      >
        {t('创建 API Key')}
      </Button>
    </div>
  );
};

export default TokenPageHeader;
