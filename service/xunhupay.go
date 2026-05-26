/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/

// Package service — XunhuPay (虎皮椒) HTTP SDK.
//
// Implements the official protocol documented at https://www.xunhupay.com
// (and the bundled SKILL.md):
//
//   - POST {gateway}/payment/do.html       — create payment
//   - POST {gateway}/payment/query.html    — query order
//   - POST {gateway}/payment/refund.html   — refund (full only)
//   - Signature: MD5( join("&", sort(filter(k=v))) + secret ) → lowercase hex
//
// The bound channel (alipay / wxpay) is determined by APPID on Xunhu side,
// so we do not send a `type` parameter.
package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
)

const (
	xunhuVersion        = "1.1"
	xunhuPathCreate     = "/payment/do.html"
	xunhuPathQuery      = "/payment/query.html"
	xunhuPathRefund     = "/payment/refund.html"
	xunhuRequestTimeout = 10 * time.Second

	XunhuStatusPaid      = "OD"
	XunhuStatusWaiting   = "WP"
	XunhuStatusCancelled = "CD"
)

// XunhuClient is a stateless wrapper. Use NewXunhuClient or GetXunhuClient
// (which pulls config from the live setting package).
type XunhuClient struct {
	AppID     string
	AppSecret string
	Gateway   string // already trimmed, no trailing slash
	Client    *http.Client
}

// GetXunhuClient returns a client built from current settings; nil if not
// configured (caller should treat this as “gateway disabled”).
func GetXunhuClient() *XunhuClient {
	return GetXunhuClientForMethod("")
}

func GetXunhuClientForMethod(method string) *XunhuClient {
	if !setting.XunhuEnabled {
		return nil
	}
	appID, appSecret := xunhuCredentialForMethod(method)
	if appID == "" || appSecret == "" {
		return nil
	}
	return &XunhuClient{
		AppID:     appID,
		AppSecret: appSecret,
		Gateway:   setting.XunhuGatewayResolved(),
		Client:    &http.Client{Timeout: xunhuRequestTimeout},
	}
}

func GetXunhuClientForCallback(form url.Values) *XunhuClient {
	if !setting.XunhuEnabled {
		return nil
	}
	appID := strings.TrimSpace(form.Get("appid"))
	if appID == "" {
		return GetXunhuClient()
	}
	seen := map[string]bool{}
	for _, pair := range []struct {
		appID     string
		appSecret string
	}{
		{setting.XunhuAlipayAppID, setting.XunhuAlipayAppSecret},
		{setting.XunhuWxpayAppID, setting.XunhuWxpayAppSecret},
		{setting.XunhuAppID, setting.XunhuAppSecret},
	} {
		candidateID := strings.TrimSpace(pair.appID)
		candidateSecret := strings.TrimSpace(pair.appSecret)
		if candidateID == "" || candidateSecret == "" || seen[candidateID] {
			continue
		}
		seen[candidateID] = true
		if candidateID == appID {
			return &XunhuClient{
				AppID:     candidateID,
				AppSecret: candidateSecret,
				Gateway:   setting.XunhuGatewayResolved(),
				Client:    &http.Client{Timeout: xunhuRequestTimeout},
			}
		}
	}
	return nil
}

func xunhuCredentialForMethod(method string) (string, string) {
	method = strings.ToLower(strings.TrimSpace(method))
	switch method {
	case setting.XunhuPayMethodAlipay:
		if appID, appSecret := trimPair(setting.XunhuAlipayAppID, setting.XunhuAlipayAppSecret); appID != "" && appSecret != "" {
			return appID, appSecret
		}
	case setting.XunhuPayMethodWxpay:
		if appID, appSecret := trimPair(setting.XunhuWxpayAppID, setting.XunhuWxpayAppSecret); appID != "" && appSecret != "" {
			return appID, appSecret
		}
	}
	return trimPair(setting.XunhuAppID, setting.XunhuAppSecret)
}

func trimPair(appID, appSecret string) (string, string) {
	return strings.TrimSpace(appID), strings.TrimSpace(appSecret)
}

// MakeSign returns the lowercase hex MD5 hash per Xunhu specification:
//  1. drop empty-value entries and the `hash` field itself;
//  2. sort keys ascending by ASCII;
//  3. join `key=value` segments with `&`;
//  4. directly append AppSecret (no separator);
//  5. md5 → lowercase hex.
func (c *XunhuClient) MakeSign(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k, v := range params {
		if k == "hash" {
			continue
		}
		if strings.TrimSpace(v) == "" {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	for i, k := range keys {
		if i > 0 {
			b.WriteByte('&')
		}
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(params[k])
	}
	b.WriteString(c.AppSecret)

	sum := md5.Sum([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

// XunhuCreatePaymentRequest collects business-level fields. Protocol fields
// (version / appid / time / nonce_str / hash) are injected automatically.
type XunhuCreatePaymentRequest struct {
	TradeOrderID string  // unique within merchant scope
	TotalFee     float64 // CNY, will be formatted to "0.00"
	Title        string
	NotifyURL    string // POST callback (公网可访问)
	ReturnURL    string // 同步跳转，可空
	CallbackURL  string // 用户取消支付跳转，可空
	Attach       string // 业务备注，原样回传，可空
}

// XunhuCreatePaymentData mirrors the `data` object in a successful response.
type XunhuCreatePaymentData struct {
	URL         string `json:"url"`
	URLQrcode   string `json:"url_qrcode"`
	OpenOrderID string `json:"open_order_id"`
}

// xunhuResponseEnvelope is the common server response shape.
type xunhuResponseEnvelope struct {
	Errcode int                    `json:"errcode"`
	Errmsg  string                 `json:"errmsg"`
	Hash    string                 `json:"hash"`
	Data    map[string]interface{} `json:"data"`

	// The current official XunhuPay API returns these fields at the top level.
	// Some bundled integration examples use a nested `data` object instead, so
	// CreatePayment reads both shapes.
	URL         string `json:"url"`
	URLQrcode   string `json:"url_qrcode"`
	OpenOrderID string `json:"open_order_id"`
}

// ---------------------------------------------------------------------------
// CreatePayment — POST /payment/do.html
// ---------------------------------------------------------------------------

func (c *XunhuClient) CreatePayment(ctx context.Context, req *XunhuCreatePaymentRequest) (*XunhuCreatePaymentData, error) {
	if c == nil {
		return nil, errors.New("xunhupay client is nil")
	}
	if req == nil {
		return nil, errors.New("xunhupay request is nil")
	}
	if strings.TrimSpace(req.TradeOrderID) == "" {
		return nil, errors.New("trade_order_id required")
	}
	if req.TotalFee <= 0 {
		return nil, errors.New("total_fee must be positive")
	}
	if strings.TrimSpace(req.NotifyURL) == "" {
		return nil, errors.New("notify_url required")
	}

	params := map[string]string{
		"version":        xunhuVersion,
		"appid":          c.AppID,
		"trade_order_id": req.TradeOrderID,
		"total_fee":      fmt.Sprintf("%.2f", req.TotalFee),
		"title":          req.Title,
		"notify_url":     req.NotifyURL,
		"return_url":     req.ReturnURL,
		"callback_url":   req.CallbackURL,
		"time":           fmt.Sprintf("%d", time.Now().Unix()),
		"nonce_str":      common.GetRandomString(32),
	}
	if strings.TrimSpace(req.Attach) != "" {
		params["attach"] = req.Attach
	}

	envelope, err := c.postJSON(ctx, xunhuPathCreate, params)
	if err != nil {
		return nil, err
	}
	if envelope.Errcode != 0 {
		return nil, fmt.Errorf("xunhupay errcode=%d errmsg=%s", envelope.Errcode, envelope.Errmsg)
	}

	out := &XunhuCreatePaymentData{
		URL:         firstNonEmpty(envelope.URL, stringFromMap(envelope.Data, "url"), stringFromMap(envelope.Data, "pay_url"), stringFromMap(envelope.Data, "pay_link")),
		URLQrcode:   firstNonEmpty(envelope.URLQrcode, stringFromMap(envelope.Data, "url_qrcode")),
		OpenOrderID: firstNonEmpty(envelope.OpenOrderID, stringFromMap(envelope.Data, "open_order_id")),
	}
	if out.URL == "" {
		raw, _ := common.Marshal(envelope)
		common.SysError(fmt.Sprintf("xunhupay response missing pay url raw=%s", string(raw)))
		return nil, errors.New("xunhupay response missing pay url")
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// QueryOrder — POST /payment/query.html
// ---------------------------------------------------------------------------

// XunhuQueryOrderResult captures the parsed query response.
type XunhuQueryOrderResult struct {
	Errcode     int
	Errmsg      string
	Status      string // OD / WP / CD
	OpenOrderID string
	Raw         map[string]interface{}
}

// QueryOrder queries by either trade_order_id or open_order_id (at least one
// required).
func (c *XunhuClient) QueryOrder(ctx context.Context, tradeOrderID, openOrderID string) (*XunhuQueryOrderResult, error) {
	if c == nil {
		return nil, errors.New("xunhupay client is nil")
	}
	if strings.TrimSpace(tradeOrderID) == "" && strings.TrimSpace(openOrderID) == "" {
		return nil, errors.New("trade_order_id or open_order_id required")
	}

	params := map[string]string{
		"appid":     c.AppID,
		"time":      fmt.Sprintf("%d", time.Now().Unix()),
		"nonce_str": common.GetRandomString(32),
	}
	if tradeOrderID != "" {
		params["out_trade_order"] = tradeOrderID
	} else {
		params["open_order_id"] = openOrderID
	}

	envelope, err := c.postJSON(ctx, xunhuPathQuery, params)
	if err != nil {
		return nil, err
	}

	res := &XunhuQueryOrderResult{
		Errcode: envelope.Errcode,
		Errmsg:  envelope.Errmsg,
		Raw:     envelope.Data,
	}
	if v, ok := envelope.Data["status"].(string); ok {
		res.Status = v
	}
	if v, ok := envelope.Data["open_order_id"].(string); ok {
		res.OpenOrderID = v
	}
	return res, nil
}

// ---------------------------------------------------------------------------
// VerifyCallback — verify async notify signature.
// ---------------------------------------------------------------------------

// VerifyCallback recomputes the hash from the incoming form values and
// compares (case-insensitive) with the received `hash`.
func (c *XunhuClient) VerifyCallback(form url.Values) bool {
	if c == nil {
		return false
	}
	received := strings.ToLower(strings.TrimSpace(form.Get("hash")))
	if received == "" {
		return false
	}

	params := make(map[string]string, len(form))
	for k, vs := range form {
		if len(vs) > 0 {
			params[k] = vs[0]
		}
	}
	expected := c.MakeSign(params)
	return strings.EqualFold(received, expected)
}

// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------

func (c *XunhuClient) postJSON(ctx context.Context, path string, params map[string]string) (*xunhuResponseEnvelope, error) {
	params["hash"] = c.MakeSign(params)

	body, err := common.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("xunhupay marshal: %w", err)
	}

	endpoint := c.Gateway + path
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("xunhupay new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json;charset=UTF-8")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", "snowwit-newapi/1.0")

	httpClient := c.Client
	if httpClient == nil {
		httpClient = &http.Client{Timeout: xunhuRequestTimeout}
	}

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		common.SysError(fmt.Sprintf("xunhupay http failed url=%s err=%s", endpoint, err.Error()))
		return nil, fmt.Errorf("xunhupay http: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("xunhupay read body: %w", err)
	}

	envelope := &xunhuResponseEnvelope{}
	if err := common.Unmarshal(respBody, envelope); err != nil {
		bodySnippet := string(respBody)
		if len(bodySnippet) > 500 {
			bodySnippet = bodySnippet[:500] + "..."
		}
		common.SysError(fmt.Sprintf("xunhupay decode failed url=%s status=%d ctype=%s body=%s err=%s", endpoint, resp.StatusCode, resp.Header.Get("Content-Type"), bodySnippet, err.Error()))
		return nil, fmt.Errorf("xunhupay decode: %w (status=%d)", err, resp.StatusCode)
	}
	return envelope, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func stringFromMap(data map[string]interface{}, key string) string {
	if len(data) == 0 {
		return ""
	}
	value, ok := data[key]
	if !ok {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	default:
		return fmt.Sprintf("%v", typed)
	}
}
