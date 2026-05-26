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

import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess, toBoolean } from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

const { Text } = Typography;

// XunhuPay (虎皮椒) — 个人收款支付宝 / 微信支付通道
//
// 启用后，充值页与订阅购买的「支付宝 / 微信支付」按钮自动改走虎皮椒接口
// （覆盖易支付），与 Stripe / Creem / Waffo 并存互不干扰。
export default function SettingsPaymentGatewayXunhu(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle ? undefined : t('虎皮椒设置');
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    XunhuEnabled: false,
    XunhuAppID: '',
    XunhuAppSecret: '',
    XunhuAlipayAppID: '',
    XunhuAlipayAppSecret: '',
    XunhuWxpayAppID: '',
    XunhuWxpayAppSecret: '',
    XunhuGateway: '',
    XunhuPayMethod: 'both',
    XunhuMinTopUp: 0,
    XunhuTitle: '',
  });
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const current = {
        XunhuEnabled: toBoolean(props.options.XunhuEnabled),
        XunhuAppID: props.options.XunhuAppID || '',
        XunhuAppSecret: '',
        XunhuAlipayAppID: props.options.XunhuAlipayAppID || '',
        XunhuAlipayAppSecret: '',
        XunhuWxpayAppID: props.options.XunhuWxpayAppID || '',
        XunhuWxpayAppSecret: '',
        XunhuGateway: props.options.XunhuGateway || '',
        XunhuPayMethod: props.options.XunhuPayMethod || 'both',
        XunhuMinTopUp:
          props.options.XunhuMinTopUp !== undefined
            ? parseInt(props.options.XunhuMinTopUp) || 0
            : 0,
        XunhuTitle: props.options.XunhuTitle || '',
      };
      setInputs(current);
      formApiRef.current.setValues(current);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const updates = [
        { key: 'XunhuEnabled', value: inputs.XunhuEnabled ? 'true' : 'false' },
        { key: 'XunhuAppID', value: (inputs.XunhuAppID || '').trim() },
        { key: 'XunhuAlipayAppID', value: (inputs.XunhuAlipayAppID || '').trim() },
        { key: 'XunhuWxpayAppID', value: (inputs.XunhuWxpayAppID || '').trim() },
        {
          key: 'XunhuGateway',
          value: (inputs.XunhuGateway || '').replace(/\/+$/, '').trim(),
        },
        {
          key: 'XunhuPayMethod',
          value: (inputs.XunhuPayMethod || 'both').trim() || 'both',
        },
        {
          key: 'XunhuMinTopUp',
          value: String(
            Math.max(0, parseInt(inputs.XunhuMinTopUp || 0, 10) || 0),
          ),
        },
        { key: 'XunhuTitle', value: (inputs.XunhuTitle || '').trim() },
      ];

      // AppSecret 仅在用户输入新值时落库，避免明文回填风险。
      const newSecret = (inputs.XunhuAppSecret || '').trim();
      if (newSecret) {
        updates.push({ key: 'XunhuAppSecret', value: newSecret });
      }
      const newAlipaySecret = (inputs.XunhuAlipayAppSecret || '').trim();
      if (newAlipaySecret) {
        updates.push({ key: 'XunhuAlipayAppSecret', value: newAlipaySecret });
      }
      const newWxpaySecret = (inputs.XunhuWxpayAppSecret || '').trim();
      if (newWxpaySecret) {
        updates.push({ key: 'XunhuWxpayAppSecret', value: newWxpaySecret });
      }

      const results = await Promise.all(
        updates.map((opt) =>
          API.put('/api/option/', { key: opt.key, value: opt.value }),
        ),
      );

      const errors = results.filter((res) => !res.data.success);
      if (errors.length > 0) {
        errors.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        props.refresh && props.refresh();
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={sectionTitle}>
          <Banner
            type='info'
            icon={<Info size={16} />}
            description={
              <div className='space-y-1'>
                <div>
                  {t(
                    '虎皮椒（XunhuPay）：基于个人收款的支付宝 / 微信支付通道，无需公司主体即可对接。',
                  )}
                </div>
                <div>
                  {t('启用后充值页与订阅购买的「支付宝 / 微信支付」自动走虎皮椒（覆盖易支付）。')}
                </div>
                <div>
                  {t('回调地址：')}
                  <code className='ml-1 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-xs'>
                    {'<服务器地址>/api/user/xunhu/notify'}
                  </code>
                  {t('（充值）；')}
                  <code className='ml-1 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-xs'>
                    {'<服务器地址>/api/subscription/xunhu/notify'}
                  </code>
                  {t('（订阅）。')}
                </div>
                <div>
                  {t('请在 ')}
                  <a
                    href='https://www.xunhupay.com'
                    target='_blank'
                    rel='noreferrer'
                  >
                    https://www.xunhupay.com
                  </a>
                  {t(' 后台「我的应用」中获取 AppID / AppSecret 并配置上述通知 URL。')}
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          />

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Switch
                field='XunhuEnabled'
                label={t('启用虎皮椒')}
                extraText={t('关闭时充值与订阅仍走易支付 / 其它通道')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Select
                field='XunhuPayMethod'
                label={t('绑定支付渠道')}
                style={{ width: '100%' }}
                optionList={[
                  { value: 'both', label: t('同时启用（支付宝 + 微信）') },
                  { value: 'alipay', label: t('仅支付宝') },
                  { value: 'wxpay', label: t('仅微信支付') },
                ]}
                extraText={t(
                  '仅控制充值页显示哪些按钮；实际通道由虎皮椒侧 APPID 绑定决定。',
                )}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='XunhuMinTopUp'
                label={t('最低充值金额（USD）')}
                placeholder={t('填 0 复用全局最低充值金额')}
                min={0}
                precision={0}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuAlipayAppID'
                label={t('支付宝 AppID')}
                placeholder={t('虎皮椒支付宝渠道 AppID')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuAlipayAppSecret'
                label={t('支付宝 AppSecret')}
                placeholder={t('不修改请留空（敏感信息不会回显）')}
                type='password'
                autoComplete='new-password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuWxpayAppID'
                label={t('微信支付 AppID')}
                placeholder={t('虎皮椒微信支付渠道 AppID')}
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuWxpayAppSecret'
                label={t('微信支付 AppSecret')}
                placeholder={t('不修改请留空（敏感信息不会回显）')}
                type='password'
                autoComplete='new-password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuAppID'
                label={t('默认/兼容 AppID')}
                placeholder={t('可保留当前已可用的微信 AppID')}
                extraText={t('仅当对应渠道未单独配置时使用')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuAppSecret'
                label={t('默认/兼容 AppSecret')}
                placeholder={t('不修改请留空（敏感信息不会回显）')}
                type='password'
                autoComplete='new-password'
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuGateway'
                label={t('网关地址')}
                placeholder='https://api.xunhupay.com'
                extraText={t(
                  '留空使用默认；如「我的支付渠道」显示其它域名，请按实际填写',
                )}
              />
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Form.Input
                field='XunhuTitle'
                label={t('订单标题（可选）')}
                placeholder={t('微信 / 支付宝支付页面显示给用户的商品名')}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Button onClick={submit} style={{ marginTop: 16 }}>
            {t('更新虎皮椒设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
