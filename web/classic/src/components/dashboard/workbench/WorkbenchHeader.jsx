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
import { Button } from '@douyinfe/semi-ui';
import { RefreshCw } from 'lucide-react';

const WorkbenchHeader = ({ greeting, loading, onRefresh, t }) => {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5'>
      <div>
        <p className='text-xs uppercase tracking-wider text-semi-color-text-2 mb-1'>
          {t('工作台')}
        </p>
        <h1 className='text-xl md:text-2xl font-semibold text-semi-color-text-0'>
          {greeting}
        </h1>
      </div>
      <Button
        type='tertiary'
        icon={<RefreshCw size={16} />}
        loading={loading}
        onClick={onRefresh}
        className='!rounded-full self-start sm:self-auto'
      >
        {t('刷新数据')}
      </Button>
    </div>
  );
};

export default WorkbenchHeader;
