/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsSwitchField } from '../components/settings-form-layout'
import { SettingsPageActionsPortal } from '../components/settings-page-context'
import { useUpdateOption } from '../hooks/use-update-option'

export interface XunhuSettingsValues {
  XunhuEnabled: boolean
  XunhuAppID: string
  XunhuAppSecret: string
  XunhuAlipayAppID: string
  XunhuAlipayAppSecret: string
  XunhuWxpayAppID: string
  XunhuWxpayAppSecret: string
  XunhuGateway: string
  XunhuPayMethod: string
  XunhuMinTopUp: number
  XunhuTitle: string
}

interface Props {
  defaultValues: XunhuSettingsValues
}

export function XunhuSettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)

  const form = useForm<XunhuSettingsValues>({
    defaultValues: props.defaultValues,
  })

  useEffect(() => {
    form.reset(props.defaultValues)
  }, [props.defaultValues, form])

  const handleSave = async () => {
    setLoading(true)
    try {
      const values = form.getValues()
      const updates: { key: string; value: string }[] = [
        { key: 'XunhuEnabled', value: String(values.XunhuEnabled) },
        { key: 'XunhuAppID', value: (values.XunhuAppID || '').trim() },
        {
          key: 'XunhuAlipayAppID',
          value: (values.XunhuAlipayAppID || '').trim(),
        },
        {
          key: 'XunhuWxpayAppID',
          value: (values.XunhuWxpayAppID || '').trim(),
        },
        {
          key: 'XunhuGateway',
          value: (values.XunhuGateway || '').replace(/\/+$/, '').trim(),
        },
        {
          key: 'XunhuPayMethod',
          value: (values.XunhuPayMethod || 'both').trim() || 'both',
        },
        {
          key: 'XunhuMinTopUp',
          value: String(Math.max(0, Math.floor(values.XunhuMinTopUp || 0))),
        },
        { key: 'XunhuTitle', value: (values.XunhuTitle || '').trim() },
      ]
      // AppSecret intentionally only persisted when user typed a new value.
      const newSecret = (values.XunhuAppSecret || '').trim()
      if (newSecret) {
        updates.push({ key: 'XunhuAppSecret', value: newSecret })
      }
      const newAlipaySecret = (values.XunhuAlipayAppSecret || '').trim()
      if (newAlipaySecret) {
        updates.push({
          key: 'XunhuAlipayAppSecret',
          value: newAlipaySecret,
        })
      }
      const newWxpaySecret = (values.XunhuWxpayAppSecret || '').trim()
      if (newWxpaySecret) {
        updates.push({ key: 'XunhuWxpayAppSecret', value: newWxpaySecret })
      }

      for (const opt of updates) {
        await updateOption.mutateAsync(opt)
      }
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  const payMethodValue = form.watch('XunhuPayMethod') || 'both'

  return (
    <div className='space-y-4 pt-4'>
      <SettingsPageActionsPortal>
        <Button
          type='button'
          size='sm'
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? t('Saving...') : t('Save XunhuPay settings')}
        </Button>
      </SettingsPageActionsPortal>

      <div>
        <h3 className='text-lg font-medium'>{t('XunhuPay Gateway')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Personal-collection gateway for Alipay / WeChat Pay via XunhuPay (虎皮椒). No company registration required.'
          )}
        </p>
      </div>

      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Get AppID / AppSecret from XunhuPay console「我的应用」. Gateway address must match「我的支付渠道」 (may differ from api.xunhupay.com). Notify URL is /api/user/xunhu/notify (top-up) and /api/subscription/xunhu/notify (subscription).'
          )}
        </AlertDescription>
      </Alert>

      <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100'>
        <p className='mb-2 font-medium'>{t('Webhook Configuration:')}</p>
        <ul className='list-inside list-disc space-y-1'>
          <li>
            {t('Top-up Notify URL:')}{' '}
            <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
              {'<ServerAddress>/api/user/xunhu/notify'}
            </code>
          </li>
          <li>
            {t('Subscription Notify URL:')}{' '}
            <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
              {'<ServerAddress>/api/subscription/xunhu/notify'}
            </code>
          </li>
          <li>
            {t('Configure at:')}{' '}
            <a
              href='https://www.xunhupay.com'
              target='_blank'
              rel='noreferrer'
              className='underline hover:no-underline'
            >
              XunhuPay Dashboard
            </a>
          </li>
        </ul>
      </div>

      <SettingsSwitchField
        checked={form.watch('XunhuEnabled')}
        onCheckedChange={(v) => form.setValue('XunhuEnabled', v)}
        label={t('Enable XunhuPay')}
        description={t(
          'When enabled, Alipay / WeChat Pay buttons on the top-up page route to XunhuPay (overriding Epay).'
        )}
        className='border-b-0 py-0'
      />

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Alipay AppID')}</Label>
          <Input
            placeholder={t('XunhuPay Alipay channel AppID')}
            {...form.register('XunhuAlipayAppID')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Alipay AppSecret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank unless updating')}
            {...form.register('XunhuAlipayAppSecret')}
          />
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('WeChat Pay AppID')}</Label>
          <Input
            placeholder={t('XunhuPay WeChat channel AppID')}
            {...form.register('XunhuWxpayAppID')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('WeChat Pay AppSecret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank unless updating')}
            {...form.register('XunhuWxpayAppSecret')}
          />
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Default fallback AppID')}</Label>
          <Input
            placeholder={t('Optional legacy XunhuPay AppID')}
            {...form.register('XunhuAppID')}
          />
          <p className='text-muted-foreground text-xs'>
            {t(
              'Used only when a channel-specific credential is not configured. You can keep the currently working WeChat credential here.'
            )}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Default fallback AppSecret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank unless updating')}
            {...form.register('XunhuAppSecret')}
          />
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Gateway address')}</Label>
          <Input
            placeholder='https://api.xunhupay.com'
            {...form.register('XunhuGateway')}
          />
          <p className='text-muted-foreground text-xs'>
            {t(
              'Leave blank to use the default https://api.xunhupay.com. Override if your XunhuPay channel shows a different gateway.'
            )}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Bound payment channel')}</Label>
          <Select
            value={payMethodValue}
            onValueChange={(v) => v && form.setValue('XunhuPayMethod', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='both'>
                {t('Both (Alipay + WeChat)')}
              </SelectItem>
              <SelectItem value='alipay'>{t('Alipay only')}</SelectItem>
              <SelectItem value='wxpay'>{t('WeChat Pay only')}</SelectItem>
            </SelectContent>
          </Select>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Controls which buttons show on the top-up page. Actual channel routing is decided by your APPID binding on XunhuPay side.'
            )}
          </p>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up (USD)')}</Label>
          <Input
            type='number'
            min={0}
            {...form.register('XunhuMinTopUp', { valueAsNumber: true })}
          />
          <p className='text-muted-foreground text-xs'>
            {t('Set to 0 to reuse the global Minimum top-up value.')}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Order title (optional)')}</Label>
          <Input
            placeholder={t('Displayed to the user in WeChat / Alipay')}
            {...form.register('XunhuTitle')}
          />
        </div>
      </div>
    </div>
  )
}
