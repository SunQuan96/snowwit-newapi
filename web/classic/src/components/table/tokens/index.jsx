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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Notification,
  Button,
  ButtonGroup,
  Input,
  Space,
  Toast,
  Select,
  Tooltip,
} from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';
import {
  API,
  showError,
  getModelCategories,
  selectFilter,
} from '../../../helpers';
import { getServerAddress, fetchTokenKey } from '../../../helpers/token';
import { formatApiKey } from '../../../helpers/defaultToken';
import { createCardProPagination } from '../../../helpers/utils';
import TokensFilters from './TokensFilters';
import TokenPageHeader from './TokenPageHeader';
import TokenHintCard from './TokenHintCard';
import TokenKeyCardList from './TokenKeyCardList';
import TokensTable from './TokensTable';
import EditTokenModal from './modals/EditTokenModal';
import CCSwitchModal from './modals/CCSwitchModal';
import TokenCreatedSuccessModal from './modals/TokenCreatedSuccessModal';
import IntegrationGuideModal from '../../dashboard/workbench/IntegrationGuideModal';
import { useTokensData } from '../../../hooks/tokens/useTokensData';
import { useDefaultToken } from '../../../hooks/tokens/useDefaultToken';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { TOKEN_STATUS, matchesTokenStatusFilter } from '../../../helpers/tokenPage';
import { LayoutGrid, Plus, Rows3 } from 'lucide-react';

function TokensPage() {
  const openFluentNotificationRef = useRef(null);
  const openCCSwitchModalRef = useRef(null);
  const tokensData = useTokensData(
    (key) => openFluentNotificationRef.current?.(key),
    (key) => openCCSwitchModalRef.current?.(key),
  );
  const isMobile = useIsMobile();
  const latestRef = useRef({
    tokens: [],
    selectedKeys: [],
    t: (k) => k,
    selectedModel: '',
    prefillKey: '',
    fetchTokenKey: async () => '',
  });
  const [modelOptions, setModelOptions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [fluentNoticeOpen, setFluentNoticeOpen] = useState(false);
  const [prefillKey, setPrefillKey] = useState('');
  const [ccSwitchVisible, setCCSwitchVisible] = useState(false);
  const [ccSwitchKey, setCCSwitchKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(TOKEN_STATUS.ALL);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('tokens:view_mode');
      return saved === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('tokens:view_mode', mode);
    } catch {
      // ignore storage errors
    }
  };
  const [guideVisible, setGuideVisible] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState(null);
  const skipInitialSearchRef = useRef(true);
  const pageRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Keep latest data for handlers inside notifications
  useEffect(() => {
    latestRef.current = {
      tokens: tokensData.tokens,
      selectedKeys: tokensData.selectedKeys,
      t: tokensData.t,
      selectedModel,
      prefillKey,
      fetchTokenKey: tokensData.fetchTokenKey,
    };
  }, [
    tokensData.tokens,
    tokensData.selectedKeys,
    tokensData.t,
    selectedModel,
    prefillKey,
    tokensData.fetchTokenKey,
  ]);

  const loadModels = async () => {
    try {
      const res = await API.get('/api/user/models');
      const { success, message, data } = res.data || {};
      if (success) {
        const categories = getModelCategories(tokensData.t);
        const options = (data || []).map((model) => {
          let icon = null;
          for (const [key, category] of Object.entries(categories)) {
            if (key !== 'all' && category.filter({ model_name: model })) {
              icon = category.icon;
              break;
            }
          }
          return {
            label: (
              <span className='flex items-center gap-1'>
                {icon}
                {model}
              </span>
            ),
            value: model,
          };
        });
        setModelOptions(options);
      } else {
        showError(tokensData.t(message));
      }
    } catch (e) {
      showError(e.message || 'Failed to load models');
    }
  };

  function openFluentNotification(key) {
    const { t } = latestRef.current;
    const SUPPRESS_KEY = 'fluent_notify_suppressed';
    if (modelOptions.length === 0) {
      // fire-and-forget; a later effect will refresh the notice content
      loadModels();
    }
    if (!key && localStorage.getItem(SUPPRESS_KEY) === '1') return;
    const container = document.getElementById('fluent-new-api-container');
    if (!container) {
      Toast.warning(t('未检测到 FluentRead（流畅阅读），请确认扩展已启用'));
      return;
    }
    setPrefillKey(key || '');
    setFluentNoticeOpen(true);
    Notification.info({
      id: 'fluent-detected',
      title: t('检测到 FluentRead（流畅阅读）'),
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            {key
              ? t('请选择模型。')
              : t('选择模型后可一键填充当前选中令牌（或本页第一个令牌）。')}
          </div>
          <div style={{ marginBottom: 8 }}>
            <Select
              placeholder={t('请选择模型')}
              optionList={modelOptions}
              onChange={setSelectedModel}
              filter={selectFilter}
              style={{ width: 320 }}
              showClear
              searchable
              emptyContent={t('暂无数据')}
            />
          </div>
          <Space>
            <Button
              theme='solid'
              type='primary'
              onClick={handlePrefillToFluent}
            >
              {t('一键填充到 FluentRead')}
            </Button>
            {!key && (
              <Button
                type='warning'
                onClick={() => {
                  localStorage.setItem(SUPPRESS_KEY, '1');
                  Notification.close('fluent-detected');
                  Toast.info(t('已关闭后续提醒'));
                }}
              >
                {t('不再提醒')}
              </Button>
            )}
            <Button
              type='tertiary'
              onClick={() => Notification.close('fluent-detected')}
            >
              {t('关闭')}
            </Button>
          </Space>
        </div>
      ),
      duration: 0,
    });
  }
  // assign after definition so hook callback can call it safely
  openFluentNotificationRef.current = openFluentNotification;

  function openCCSwitchModal(key) {
    if (modelOptions.length === 0) {
      loadModels();
    }
    setCCSwitchKey(key || '');
    setCCSwitchVisible(true);
  }
  openCCSwitchModalRef.current = openCCSwitchModal;

  // Prefill to Fluent handler
  const handlePrefillToFluent = async () => {
    const {
      tokens,
      selectedKeys,
      t,
      selectedModel: chosenModel,
      prefillKey: overrideKey,
      fetchTokenKey,
    } = latestRef.current;
    const container = document.getElementById('fluent-new-api-container');
    if (!container) {
      Toast.error(t('未检测到 Fluent 容器'));
      return;
    }

    if (!chosenModel) {
      Toast.warning(t('请选择模型'));
      return;
    }

    let status = localStorage.getItem('status');
    let serverAddress = '';
    if (status) {
      try {
        status = JSON.parse(status);
        serverAddress = status.server_address || '';
      } catch (_) {}
    }
    if (!serverAddress) serverAddress = window.location.origin;

    let apiKeyToUse = '';
    if (overrideKey) {
      apiKeyToUse = 'sk-' + overrideKey;
    } else {
      const token =
        selectedKeys && selectedKeys.length === 1
          ? selectedKeys[0]
          : tokens && tokens.length > 0
            ? tokens[0]
            : null;
      if (!token) {
        Toast.warning(t('没有可用令牌用于填充'));
        return;
      }
      try {
        apiKeyToUse = 'sk-' + (await fetchTokenKey(token));
      } catch (_) {
        return;
      }
    }

    const payload = {
      id: 'new-api',
      baseUrl: serverAddress,
      apiKey: apiKeyToUse,
      model: chosenModel,
    };

    container.dispatchEvent(
      new CustomEvent('fluent:prefill', { detail: payload }),
    );
    Toast.success(t('已发送到 Fluent'));
    Notification.close('fluent-detected');
  };

  // Show notification when Fluent container is available
  useEffect(() => {
    const onAppeared = () => {
      openFluentNotification();
    };
    const onRemoved = () => {
      setFluentNoticeOpen(false);
      Notification.close('fluent-detected');
    };

    window.addEventListener('fluent-container:appeared', onAppeared);
    window.addEventListener('fluent-container:removed', onRemoved);
    return () => {
      window.removeEventListener('fluent-container:appeared', onAppeared);
      window.removeEventListener('fluent-container:removed', onRemoved);
    };
  }, []);

  // When modelOptions or language changes while the notice is open, refresh the content
  useEffect(() => {
    if (fluentNoticeOpen) {
      openFluentNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelOptions, selectedModel, tokensData.t, fluentNoticeOpen]);

  useEffect(() => {
    const selector = '#fluent-new-api-container';
    const root = document.body || document.documentElement;

    const existing = document.querySelector(selector);
    if (existing) {
      console.log('Fluent container detected (initial):', existing);
      window.dispatchEvent(
        new CustomEvent('fluent-container:appeared', { detail: existing }),
      );
    }

    const isOrContainsTarget = (node) => {
      if (!(node && node.nodeType === 1)) return false;
      if (node.id === 'fluent-new-api-container') return true;
      return (
        typeof node.querySelector === 'function' &&
        !!node.querySelector(selector)
      );
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // appeared
        for (const added of m.addedNodes) {
          if (isOrContainsTarget(added)) {
            const el = document.querySelector(selector);
            if (el) {
              console.log('Fluent container appeared:', el);
              window.dispatchEvent(
                new CustomEvent('fluent-container:appeared', { detail: el }),
              );
            }
            break;
          }
        }
        // removed
        for (const removed of m.removedNodes) {
          if (isOrContainsTarget(removed)) {
            const elNow = document.querySelector(selector);
            if (!elNow) {
              console.log('Fluent container removed');
              window.dispatchEvent(new CustomEvent('fluent-container:removed'));
            }
            break;
          }
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setBaseUrl(getServerAddress());
  }, []);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    // Walk up to find the scrollable ancestor
    let scrollEl = el.parentElement;
    while (scrollEl && scrollEl !== document.body) {
      const style = window.getComputedStyle(scrollEl);
      const overflow = style.overflow + style.overflowY;
      if (/auto|scroll/.test(overflow)) break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl || scrollEl === document.body) return;
    const onScroll = () => setScrolled(scrollEl.scrollTop > 200);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  const {
    // Edit state
    showEdit,
    editingToken,
    closeEdit,
    refresh,

    setEditingToken,
    setShowEdit,

    loading,
    searching,
    searchMode,

    // Translation
    t,
    tokens,
    activePage,
    pageSize,
    tokenCount,
    handlePageChange,
    handlePageSizeChange,
    copyTokenKey,
    manageToken,
    onOpenLink,
    runSearchByQuery,
    loadingTokenKeys,
  } = tokensData;

  const filteredTokens = useMemo(
    () => tokens.filter((r) => matchesTokenStatusFilter(r, statusFilter)),
    [tokens, statusFilter],
  );
  const filteredCount = filteredTokens.length;

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || statusFilter !== TOKEN_STATUS.ALL;

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter(TOKEN_STATUS.ALL);
    runSearchByQuery('', 1, pageSize);
  };

  useEffect(() => {
    if (skipInitialSearchRef.current) {
      skipInitialSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      runSearchByQuery(searchQuery, 1, pageSize);
    }, 350);
    return () => clearTimeout(timer);
    // pageSize 变更由 handlePageSizeChange 处理，此处仅响应搜索词
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleCreate = () => {
    setEditingToken({ id: undefined });
    setShowEdit(true);
  };

  const {
    defaultToken,
    setAsDefault,
    isDefault,
    copyAccessPackage,
  } = useDefaultToken(tokens, baseUrl, t);

  const handleTokenCreated = async ({ name }) => {
    try {
      await refresh();
      const res = await API.get(
        `/api/token/search?keyword=${encodeURIComponent(name)}&token=&p=1&size=10`,
      );
      const { success, message, data } = res.data || {};
      if (!success) {
        showError(message || t('获取新 Key 失败'));
        return;
      }
      const items = data?.items || [];
      const token = items.find((item) => item.name === name) || items[0];
      if (!token?.id) {
        showError(t('获取新 Key 失败'));
        return;
      }
      setAsDefault(token.id);
      const key = await fetchTokenKey(token.id);
      setCreatedSuccess({
        tokenName: name,
        apiKey: formatApiKey(key),
        tokenId: token.id,
      });
    } catch (error) {
      showError(error?.message || t('获取新 Key 失败'));
    }
  };

  const paginationNode = createCardProPagination({
    currentPage: activePage,
    pageSize,
    total: tokenCount,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    isMobile,
    t,
  });

  const wrapViewModeTooltip = (label, node) =>
    isMobile ? node : <Tooltip content={label}>{node}</Tooltip>;

  const renderViewModeButton = (label, mode, icon) =>
    wrapViewModeTooltip(
      label,
      <Button
        size='large'
        theme={viewMode === mode ? 'solid' : 'light'}
        type={viewMode === mode ? 'primary' : 'tertiary'}
        onClick={() => handleViewModeChange(mode)}
        aria-label={label}
        aria-pressed={viewMode === mode}
        icon={icon}
        className={isMobile ? '!rounded-xl' : undefined}
      />,
    );

  const viewModeSwitcher = isMobile ? (
    <div
      className='inline-flex items-center gap-1.5'
      role='group'
      aria-label={t('视图模式')}
    >
      {renderViewModeButton(t('卡片视图'), 'cards', <LayoutGrid size={16} />)}
      {renderViewModeButton(t('表格视图'), 'table', <Rows3 size={16} />)}
    </div>
  ) : (
    <ButtonGroup className='!rounded-xl' aria-label={t('视图模式')}>
      {renderViewModeButton(t('卡片视图'), 'cards', <LayoutGrid size={16} />)}
      {renderViewModeButton(t('表格视图'), 'table', <Rows3 size={16} />)}
    </ButtonGroup>
  );

  return (
    <div ref={pageRef} className='max-w-6xl mx-auto pb-8'>
      {/* Sticky floating action bar — appears after scrolling 200px */}
      <div
        className={`fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-200 ${
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        aria-hidden={!scrolled}
      >
        <div className='pointer-events-auto mx-4 w-full max-w-2xl flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-lg border border-zinc-200/60 dark:border-zinc-700/60'>
          <Input
            prefix={<IconSearch />}
            placeholder={t('搜索名称或密钥（支持 sk- 前缀）')}
            value={searchQuery}
            onChange={setSearchQuery}
            showClear
            size='default'
            className='!rounded-xl flex-1'
          />
          <Button
            theme='solid'
            type='primary'
            icon={<Plus size={15} />}
            onClick={handleCreate}
            className='!rounded-full shrink-0'
          >
            {t('创建 API Key')}
          </Button>
        </div>
      </div>

      <EditTokenModal
        refresh={refresh}
        editingToken={editingToken}
        visiable={showEdit}
        handleClose={closeEdit}
        onCreated={handleTokenCreated}
      />

      <TokenCreatedSuccessModal
        visible={Boolean(createdSuccess)}
        tokenName={createdSuccess?.tokenName}
        apiKey={createdSuccess?.apiKey}
        baseUrl={baseUrl}
        onClose={() => setCreatedSuccess(null)}
        onOpenGuide={() => setGuideVisible(true)}
        t={t}
      />

      <CCSwitchModal
        visible={ccSwitchVisible}
        onClose={() => setCCSwitchVisible(false)}
        tokenKey={ccSwitchKey}
        modelOptions={modelOptions}
      />

      <IntegrationGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        baseUrl={baseUrl}
        t={t}
      />

      <TokenPageHeader
        onCreate={handleCreate}
        t={t}
        totalCount={tokenCount}
      />

      <TokenHintCard
        baseUrl={baseUrl}
        defaultToken={defaultToken}
        onOpenGuide={() => setGuideVisible(true)}
        onCopyAccessPackage={() => copyAccessPackage()}
        t={t}
      />

      <TokensFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={handleResetFilters}
        searching={searching}
        searchMode={searchMode}
        tokenCount={tokenCount}
        pageTokenCount={tokens.length}
        filteredCount={filteredCount}
        hasActiveFilters={hasActiveFilters}
        rightSlot={viewModeSwitcher}
        t={t}
      />

      {viewMode === 'cards' ? (
        <TokenKeyCardList
          tokens={tokens}
          loading={loading}
          searchQuery={searchQuery}
          searchMode={searchMode}
          statusFilter={statusFilter}
          onCreate={handleCreate}
          onResetFilters={handleResetFilters}
          t={t}
          copyTokenKey={copyTokenKey}
          manageToken={manageToken}
          refresh={refresh}
          setEditingToken={setEditingToken}
          setShowEdit={setShowEdit}
          onOpenLink={onOpenLink}
          loadingTokenKeys={loadingTokenKeys}
          defaultTokenId={defaultToken?.id}
          isDefault={isDefault}
          onSetDefault={setAsDefault}
          onCopyAccessPackage={copyAccessPackage}
        />
      ) : (
        <TokensTable
          {...tokensData}
          tokens={filteredTokens}
          compactMode={true}
        />
      )}

      {paginationNode ? (
        <div className='mt-6 flex justify-center md:justify-end'>{paginationNode}</div>
      ) : null}
    </div>
  );
}

export default TokensPage;
