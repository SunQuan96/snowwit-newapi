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

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useWorkbenchData } from '../../hooks/dashboard/useWorkbenchData';
import WorkbenchHeader from './workbench/WorkbenchHeader';
import GettingStartedGuide from './workbench/GettingStartedGuide';
import BalanceOverviewCard from './workbench/BalanceOverviewCard';
import ApiAccessCard from './workbench/ApiAccessCard';
import RecommendedActions from './workbench/RecommendedActions';
import UsageOverview from './workbench/UsageOverview';
import IntegrationGuideModal from './workbench/IntegrationGuideModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const [guideVisible, setGuideVisible] = useState(false);

  const workbench = useWorkbenchData(userState, userDispatch, statusState);

  const openGuide = () => setGuideVisible(true);
  const closeGuide = () => setGuideVisible(false);

  return (
    <div className='h-full max-w-6xl mx-auto pb-8'>
      <WorkbenchHeader
        greeting={workbench.getGreeting}
        loading={workbench.loading}
        onRefresh={workbench.refresh}
        t={workbench.t}
      />

      <GettingStartedGuide
        hasApiKey={workbench.hasApiKey}
        onCreateKey={() => navigate('/console/token')}
        onOpenGuide={openGuide}
        onCopyAccessPackage={workbench.copyDefaultAccessPackage}
        onManageKeys={() => navigate('/console/token')}
        t={workbench.t}
      />

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5'>
        <BalanceOverviewCard
          remainingQuota={workbench.remainingQuota}
          accountStatus={workbench.accountStatus}
          last24hQuota={workbench.last24hQuota}
          estimatedDuration={workbench.estimatedDuration}
          loading={workbench.loading}
          onTopUp={() => navigate('/console/topup')}
          t={workbench.t}
        />
        <ApiAccessCard
          primaryBaseUrl={workbench.primaryBaseUrl}
          hasApiKey={workbench.hasApiKey}
          defaultTokenPreview={workbench.defaultTokenPreview}
          onOpenGuide={openGuide}
          onTryPlayground={() => navigate('/console/playground')}
          onCopyAccessPackage={workbench.copyDefaultAccessPackage}
          onCopyApiKey={workbench.copyDefaultApiKey}
          onManageKeys={() => navigate('/console/token')}
          t={workbench.t}
        />
      </div>

      <RecommendedActions
        onNavigate={navigate}
        onOpenGuide={openGuide}
        t={workbench.t}
      />

      <UsageOverview
        last24hQuota={workbench.last24hQuota}
        usedQuota={workbench.usedQuota}
        requestCount={workbench.requestCount}
        consumeTrend={workbench.consumeTrend}
        hasTrendChart={workbench.hasTrendChart}
        loading={workbench.loading}
        t={workbench.t}
      />

      <IntegrationGuideModal
        visible={guideVisible}
        onClose={closeGuide}
        baseUrl={workbench.primaryBaseUrl}
        t={workbench.t}
      />
    </div>
  );
};

export default Dashboard;
