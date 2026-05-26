/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/

// XunhuPay (虎皮椒) top-up controller.
//
// Mirrors the epay flow exactly so that the wallet UX is identical:
//   - POST /api/user/xunhu/pay   — authenticated, creates order + returns pay url
//   - POST /api/user/xunhu/notify — public webhook (verified by MD5 signature)
//   - GET/POST /api/user/xunhu/return — browser sync return, redirects to console
//
// Payment channel (Alipay / WeChat) is determined upstream by the APPID
// binding on Xunhu's side, so no `type` parameter is sent. The frontend may
// still pass `payment_method=alipay|wxpay` for logging and method filtering
// (operator surfaces only the channels they actually registered).
package controller

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

type XunhuPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

// getXunhuMinTopup returns the effective minimum top-up amount for Xunhu.
// Falls back to generic operation_setting.MinTopUp when XunhuMinTopUp is 0.
func getXunhuMinTopup() int64 {
	minTopup := setting.XunhuMinTopUp
	if minTopup <= 0 {
		minTopup = operation_setting.MinTopUp
	}
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

// RequestXunhuPay handles authenticated top-up requests routed through Xunhu.
func RequestXunhuPay(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	if !isXunhuTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "虎皮椒支付未启用"})
		return
	}

	var req XunhuPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < getXunhuMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getXunhuMinTopup())})
		return
	}

	method := strings.TrimSpace(req.PaymentMethod)
	if method == "" {
		method = setting.XunhuPayMethodAlipay
	}
	if method != setting.XunhuPayMethodAlipay && method != setting.XunhuPayMethodWxpay {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付方式不存在"})
		return
	}
	if !setting.XunhuPayMethodEnabled(method) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "该支付方式未启用"})
		return
	}

	userID := c.GetInt("id")
	group, err := model.GetUserGroup(userID, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	client := service.GetXunhuClientForMethod(method)
	if client == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置该虎皮椒支付方式"})
		return
	}

	callbackAddress := service.GetCallbackAddress()
	if strings.TrimSpace(callbackAddress) == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "回调地址未配置"})
		return
	}
	notifyURL := callbackAddress + "/api/user/xunhu/notify"
	returnURL := paymentReturnPath("/console/log")

	tradeNo := fmt.Sprintf("XHU%dNO%s%d", userID, common.GetRandomString(6), time.Now().Unix())

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}

	topUp := &model.TopUp{
		UserId:          userID,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   method,
		PaymentProvider: model.PaymentProviderXunhu,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 创建充值订单失败 user_id=%d trade_no=%s payment_method=%s amount=%d error=%q", userID, tradeNo, method, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	title := strings.TrimSpace(setting.XunhuTitle)
	if title == "" {
		title = fmt.Sprintf("TUC%d", req.Amount)
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	data, err := client.CreatePayment(ctx, &service.XunhuCreatePaymentRequest{
		TradeOrderID: tradeNo,
		TotalFee:     payMoney,
		Title:        title,
		NotifyURL:    notifyURL,
		ReturnURL:    returnURL,
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 拉起支付失败 user_id=%d trade_no=%s payment_method=%s amount=%d error=%q", userID, tradeNo, method, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败：" + err.Error()})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 充值订单创建成功 user_id=%d trade_no=%s payment_method=%s amount=%d money=%.2f open_order_id=%s", userID, tradeNo, method, req.Amount, payMoney, data.OpenOrderID))

	// Frontend opens the URL directly (no form-post like epay). We still
	// emit a minimal `data` map to remain compatible with the existing
	// submit-form helper, but the canonical path is `pay_link` / `url`.
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_link":      data.URL,
			"url_qrcode":    data.URLQrcode,
			"open_order_id": data.OpenOrderID,
		},
		"url": data.URL,
	})
}

// XunhuNotify handles the Xunhu async webhook. Returns "success" (text) to
// stop further retries when processed.
func XunhuNotify(c *gin.Context) {
	if !isXunhuWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 被拒绝 reason=disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	form, err := collectXunhuForm(c)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 表单解析失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if len(form) == 0 {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 表单为空 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	client := service.GetXunhuClientForCallback(form)
	if client == nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook client 未初始化 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	if !client.VerifyCallback(form) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 验签失败 path=%q client_ip=%s params=%s", c.Request.RequestURI, c.ClientIP(), common.GetJsonString(formAsMap(form))))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	tradeOrderID := strings.TrimSpace(form.Get("trade_order_id"))
	status := strings.TrimSpace(form.Get("status"))
	totalFee := strings.TrimSpace(form.Get("total_fee"))
	openOrderID := strings.TrimSpace(form.Get("open_order_id"))
	transactionID := strings.TrimSpace(form.Get("transaction_id"))

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 验签成功 trade_no=%s status=%s total_fee=%s open_order_id=%s transaction_id=%s client_ip=%s", tradeOrderID, status, totalFee, openOrderID, transactionID, c.ClientIP()))

	if status != service.XunhuStatusPaid {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 webhook 忽略事件 trade_no=%s status=%s client_ip=%s", tradeOrderID, status, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("success"))
		return
	}
	if tradeOrderID == "" {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	LockOrder(tradeOrderID)
	defer UnlockOrder(tradeOrderID)

	topUp := model.GetTopUpByTradeNo(tradeOrderID)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 回调订单不存在 trade_no=%s client_ip=%s", tradeOrderID, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("success"))
		return
	}
	if topUp.PaymentProvider != model.PaymentProviderXunhu {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 订单支付网关不匹配 trade_no=%s order_provider=%s client_ip=%s", tradeOrderID, topUp.PaymentProvider, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	if topUp.Status != common.TopUpStatusPending {
		// idempotent: already settled
		_, _ = c.Writer.Write([]byte("success"))
		return
	}

	// Amount tamper guard: compare upstream total_fee (CNY) against the
	// money stored when the order was created.
	if !xunhuMoneyMatches(totalFee, topUp.Money) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 回调金额不匹配 trade_no=%s upstream=%s expected=%.2f client_ip=%s", tradeOrderID, totalFee, topUp.Money, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	topUp.Status = common.TopUpStatusSuccess
	topUp.CompleteTime = time.Now().Unix()
	if err := topUp.Update(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 更新充值订单失败 trade_no=%s user_id=%d error=%q", topUp.TradeNo, topUp.UserId, err.Error()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	dAmount := decimal.NewFromInt(int64(topUp.Amount))
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
	if err := model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 更新用户额度失败 trade_no=%s user_id=%d quota=%d error=%q", topUp.TradeNo, topUp.UserId, quotaToAdd, err.Error()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 充值成功 trade_no=%s user_id=%d quota=%d money=%.2f client_ip=%s", topUp.TradeNo, topUp.UserId, quotaToAdd, topUp.Money, c.ClientIP()))
	model.RecordTopupLog(topUp.UserId, fmt.Sprintf("使用虎皮椒充值成功，充值金额: %v，支付金额：%f", logger.LogQuota(quotaToAdd), topUp.Money), c.ClientIP(), topUp.PaymentMethod, model.PaymentProviderXunhu)

	_, _ = c.Writer.Write([]byte("success"))
}

// xunhuMoneyMatches checks whether the gateway's `total_fee` (string, CNY)
// matches the local `Money` (float, CNY). Allows ±0.01 tolerance.
func xunhuMoneyMatches(upstream string, local float64) bool {
	f, err := strconv.ParseFloat(strings.TrimSpace(upstream), 64)
	if err != nil {
		return false
	}
	delta := f - local
	if delta < 0 {
		delta = -delta
	}
	return delta < 0.01
}

func collectXunhuForm(c *gin.Context) (url.Values, error) {
	if c.Request.Method == http.MethodPost {
		if err := c.Request.ParseForm(); err != nil {
			return nil, err
		}
		if len(c.Request.PostForm) > 0 {
			return c.Request.PostForm, nil
		}
		return c.Request.Form, nil
	}
	return c.Request.URL.Query(), nil
}

func formAsMap(v url.Values) map[string]string {
	return lo.Reduce(lo.Keys(v), func(r map[string]string, k string, _ int) map[string]string {
		r[k] = v.Get(k)
		return r
	}, map[string]string{})
}
