/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/

// XunhuPay (虎皮椒) subscription payment controller.
//
// Mirrors subscription_payment_epay.go but speaks the Xunhu protocol.
//   - POST /api/subscription/xunhu/pay   — authenticated checkout
//   - POST /api/subscription/xunhu/notify — async webhook (signature verified)
//   - GET/POST /api/subscription/xunhu/return — browser sync return
package controller

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
)

type SubscriptionXunhuPayRequest struct {
	PlanId        int    `json:"plan_id"`
	PaymentMethod string `json:"payment_method"`
}

func SubscriptionRequestXunhu(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	if !isXunhuTopUpEnabled() {
		common.ApiErrorMsg(c, "虎皮椒支付未启用")
		return
	}

	var req SubscriptionXunhuPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "套餐金额过低")
		return
	}

	method := strings.TrimSpace(req.PaymentMethod)
	if method == "" {
		method = setting.XunhuPayMethodAlipay
	}
	if method != setting.XunhuPayMethodAlipay && method != setting.XunhuPayMethodWxpay {
		common.ApiErrorMsg(c, "支付方式不存在")
		return
	}
	if !setting.XunhuPayMethodEnabled(method) {
		common.ApiErrorMsg(c, "该支付方式未启用")
		return
	}

	userId := c.GetInt("id")
	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "已达到该套餐购买上限")
			return
		}
	}

	callbackAddress := service.GetCallbackAddress()
	if strings.TrimSpace(callbackAddress) == "" {
		common.ApiErrorMsg(c, "回调地址未配置")
		return
	}
	notifyURL := callbackAddress + "/api/subscription/xunhu/notify"
	returnURL := callbackAddress + "/api/subscription/xunhu/return"

	client := service.GetXunhuClient()
	if client == nil {
		common.ApiErrorMsg(c, "当前管理员未配置虎皮椒")
		return
	}

	tradeNo := fmt.Sprintf("SUBXHU%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())

	order := &model.SubscriptionOrder{
		UserId:          userId,
		PlanId:          plan.Id,
		Money:           plan.PriceAmount,
		TradeNo:         tradeNo,
		PaymentMethod:   method,
		PaymentProvider: model.PaymentProviderXunhu,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}

	title := strings.TrimSpace(setting.XunhuTitle)
	if title == "" {
		title = fmt.Sprintf("SUB:%s", plan.Title)
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	data, err := client.CreatePayment(ctx, &service.XunhuCreatePaymentRequest{
		TradeOrderID: tradeNo,
		TotalFee:     plan.PriceAmount,
		Title:        title,
		NotifyURL:    notifyURL,
		ReturnURL:    returnURL,
	})
	if err != nil {
		_ = model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderXunhu)
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 订阅拉起支付失败 trade_no=%s user_id=%d plan_id=%d error=%q", tradeNo, userId, plan.Id, err.Error()))
		common.ApiErrorMsg(c, "拉起支付失败：" + err.Error())
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 订阅订单创建成功 trade_no=%s user_id=%d plan_id=%d money=%.2f open_order_id=%s", tradeNo, userId, plan.Id, plan.PriceAmount, data.OpenOrderID))

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

// SubscriptionXunhuNotify handles the async webhook for subscription orders.
func SubscriptionXunhuNotify(c *gin.Context) {
	form, err := collectXunhuForm(c)
	if err != nil || len(form) == 0 {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	client := service.GetXunhuClient()
	if client == nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if !client.VerifyCallback(form) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("虎皮椒 订阅 webhook 验签失败 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	status := strings.TrimSpace(form.Get("status"))
	tradeOrderID := strings.TrimSpace(form.Get("trade_order_id"))
	if status != service.XunhuStatusPaid {
		_, _ = c.Writer.Write([]byte("success"))
		return
	}
	if tradeOrderID == "" {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	LockOrder(tradeOrderID)
	defer UnlockOrder(tradeOrderID)

	payload := common.GetJsonString(formAsMap(form))
	method := strings.TrimSpace(form.Get("payment_method"))
	if err := model.CompleteSubscriptionOrder(tradeOrderID, payload, model.PaymentProviderXunhu, method); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("虎皮椒 完成订阅订单失败 trade_no=%s error=%q", tradeOrderID, err.Error()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("虎皮椒 订阅支付成功 trade_no=%s client_ip=%s", tradeOrderID, c.ClientIP()))
	_, _ = c.Writer.Write([]byte("success"))
}

// SubscriptionXunhuReturn handles the browser sync return. Verifies + redirects.
func SubscriptionXunhuReturn(c *gin.Context) {
	form, err := collectXunhuForm(c)
	if err != nil || len(form) == 0 {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=fail"))
		return
	}

	client := service.GetXunhuClient()
	if client == nil {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=fail"))
		return
	}
	if !client.VerifyCallback(form) {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=fail"))
		return
	}

	status := strings.TrimSpace(form.Get("status"))
	tradeOrderID := strings.TrimSpace(form.Get("trade_order_id"))
	if status != service.XunhuStatusPaid || tradeOrderID == "" {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=pending"))
		return
	}

	LockOrder(tradeOrderID)
	defer UnlockOrder(tradeOrderID)

	payload := common.GetJsonString(formAsMap(form))
	method := strings.TrimSpace(form.Get("payment_method"))
	if err := model.CompleteSubscriptionOrder(tradeOrderID, payload, model.PaymentProviderXunhu, method); err != nil {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=fail"))
		return
	}
	c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=success"))
}
