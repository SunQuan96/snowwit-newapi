/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/

package setting

import "strings"

// XunhuPay (虎皮椒) configuration.
//
// XunhuEnabled        — master switch.
// XunhuAppID          — legacy/default APPID from xunhupay backend「我的应用」.
// XunhuAppSecret      — legacy/default paired secret used for MD5 signature.
// XunhuAlipayAppID    — optional Alipay-specific APPID.
// XunhuAlipayAppSecret — optional Alipay-specific secret.
// XunhuWxpayAppID     — optional WeChat Pay-specific APPID.
// XunhuWxpayAppSecret — optional WeChat Pay-specific secret.
// XunhuGateway        — actual gateway shown in「我的支付渠道」.
//
//	Falls back to https://api.xunhupay.com if empty.
//
// XunhuPayMethod      — which payment buttons to surface ("alipay" / "wxpay" / "both").
//
//	Xunhu binds channel to APPID, so "both" only makes sense
//	when the operator registered both channels.
//
// XunhuMinTopUp       — min recharge in display unit (USD). 0 = reuse generic MinTopUp.
// XunhuTitle          — order title sent upstream (visible to user in WeChat / Alipay).
var (
	XunhuEnabled         = false
	XunhuAppID           = ""
	XunhuAppSecret       = ""
	XunhuAlipayAppID     = ""
	XunhuAlipayAppSecret = ""
	XunhuWxpayAppID      = ""
	XunhuWxpayAppSecret  = ""
	XunhuGateway         = ""
	XunhuPayMethod       = "both"
	XunhuMinTopUp        = 0
	XunhuTitle           = ""
)

const (
	XunhuPayMethodAlipay = "alipay"
	XunhuPayMethodWxpay  = "wxpay"
	XunhuPayMethodBoth   = "both"
)

// XunhuPayMethodEnabled returns true if `type_` (alipay / wxpay) is enabled
// per the XunhuPayMethod setting.
func XunhuPayMethodEnabled(typeStr string) bool {
	method := strings.ToLower(strings.TrimSpace(XunhuPayMethod))
	if method == "" {
		method = XunhuPayMethodBoth
	}
	switch typeStr {
	case XunhuPayMethodAlipay:
		return method == XunhuPayMethodAlipay || method == XunhuPayMethodBoth
	case XunhuPayMethodWxpay:
		return method == XunhuPayMethodWxpay || method == XunhuPayMethodBoth
	default:
		return false
	}
}

// XunhuGatewayResolved returns gateway with default fallback applied.
func XunhuGatewayResolved() string {
	g := strings.TrimRight(strings.TrimSpace(XunhuGateway), "/")
	if g == "" {
		return "https://api.xunhupay.com"
	}
	return g
}
