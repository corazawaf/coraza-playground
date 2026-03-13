// Copyright 2023 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

package internal

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/corazawaf/coraza/v3/collection"
	"github.com/corazawaf/coraza/v3/experimental/plugins/plugintypes"
	"github.com/corazawaf/coraza/v3/types"
	"github.com/corazawaf/coraza/v3/types/variables"
)

func RequestProcessor(tx types.Transaction, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	method := ""
	url := ""
	protocol := ""
	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return fmt.Errorf("invalid variable count for request header")
			}
			method, url, protocol = spl[0], spl[1], spl[2]
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ": ", 2)
			if len(spl) != 2 {
				return fmt.Errorf("invalid variable count for request header")
			}
			tx.AddRequestHeader(spl[0], spl[1])
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	tx.ProcessURI(url, method, protocol)
	tx.ProcessRequestHeaders()

	bodyData := []byte(strings.Join(bodybuffer, "\r\n"))
	if _, _, err := tx.WriteRequestBody(bodyData); err != nil {
		return err
	}

	if _, err := tx.ProcessRequestBody(); err != nil {
		return err
	}

	return nil
}

func ResponseProcessor(tx types.Transaction, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	protocol := ""
	status := ""

	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return fmt.Errorf("invalid variable count for response header")
			}
			protocol, status, _ = spl[0], spl[1], spl[2]
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ":", 2)
			if len(spl) != 2 {
				return fmt.Errorf("invalid response header")
			}
			key, value := spl[0], spl[1]
			value = strings.TrimSpace(value)
			tx.AddResponseHeader(key, value)
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	bf := strings.Join(bodybuffer, "\r\n")
	if _, _, err := tx.WriteResponseBody([]byte(bf)); err != nil {
		return err
	}

	st, _ := strconv.Atoi(status)
	tx.ProcessResponseHeaders(st, protocol)

	if _, err := tx.ProcessResponseBody(); err != nil {
		return err
	}

	return nil
}

func BuildResults(tx types.Transaction, durationMicros int64, engineStatus string) map[string]interface{} {
	// Build collections BEFORE closing transaction to preserve state
	txState := tx.(plugintypes.TransactionState)
	collections := make([][]string, 0)

	txState.Variables().All(func(_ variables.RuleVariable, v collection.Collection) bool {
		for index, md := range v.FindAll() {
			collections = append(collections, []string{
				v.Name(),
				md.Key(),
				strconv.Itoa(index),
				md.Value(),
			})
		}
		return true
	})

	// Close the transaction to trigger final processing
	if err := tx.Close(); err != nil {
		fmt.Printf("Error closing transaction: %s\n", err.Error())
	}

	jsdata, err := json.Marshal(collections)
	if err != nil {
		fmt.Printf("Error marshaling collections: %s\n", err)
	}

	md := [][]string{}
	for _, m := range tx.MatchedRules() {
		msg := m.Message()
		if msg == "" {
			msg = "Rule matched (no message specified)"
		}
		md = append(md, []string{strconv.Itoa(m.Rule().ID()), msg})
	}
	matchedData, err := json.Marshal(md)
	if err != nil {
		fmt.Printf("Error marshaling matched data: %s\n", err)
	}

	// Build audit log
	auditData := map[string]interface{}{
		"transaction": map[string]interface{}{
			"id":            tx.ID(),
			"timestamp":     fmt.Sprintf("%d", durationMicros),
			"client_ip":     "playground",
			"server_id":     "coraza-playground",
			"engine_status": engineStatus,
		},
		"request": map[string]interface{}{
			"method":  "extracted from processing",
			"uri":     "extracted from processing",
			"headers": []map[string]string{},
			"body":    "",
		},
		"response": map[string]interface{}{
			"status":  200,
			"headers": []map[string]string{},
			"body":    "",
		},
		"rules": map[string]interface{}{
			"matched_count": len(tx.MatchedRules()),
			"matched_rules": []map[string]interface{}{},
		},
		"messages": []map[string]interface{}{},
	}

	for _, matchedRule := range tx.MatchedRules() {
		rule := matchedRule.Rule()
		ruleData := map[string]interface{}{
			"id":      rule.ID(),
			"phase":   rule.Phase(),
			"message": matchedRule.Message(),
			"data":    matchedRule.Data(),
			"tags":    rule.Tags(),
		}

		if rule.SecMark() != "" {
			ruleData["secmark"] = rule.SecMark()
		}

		auditData["rules"].(map[string]interface{})["matched_rules"] = append(
			auditData["rules"].(map[string]interface{})["matched_rules"].([]map[string]interface{}),
			ruleData,
		)

		messageData := map[string]interface{}{
			"rule_id":  rule.ID(),
			"message":  matchedRule.Message(),
			"data":     matchedRule.Data(),
			"severity": "NOTICE",
		}
		auditData["messages"] = append(auditData["messages"].([]map[string]interface{}), messageData)
	}

	// Extract request method and URI from collections
	txState.Variables().All(func(_ variables.RuleVariable, v collection.Collection) bool {
		switch v.Name() {
		case "REQUEST_METHOD":
			if entries := v.FindAll(); len(entries) > 0 {
				auditData["request"].(map[string]interface{})["method"] = entries[0].Value()
			}
		case "REQUEST_URI":
			if entries := v.FindAll(); len(entries) > 0 {
				auditData["request"].(map[string]interface{})["uri"] = entries[0].Value()
			}
		}
		return true
	})

	auditJSON, err := json.Marshal(auditData)
	var auditLogString string
	if err != nil {
		fmt.Printf("Error marshaling audit log: %s\n", err)
		auditLogString = `{"error": "Failed to generate audit log"}`
	} else {
		auditLogString = string(auditJSON)
	}

	// Check for interruption
	disruptiveAction := "none"
	disruptiveRule := "-"
	disruptiveStatus := 0

	if it := tx.Interruption(); it != nil {
		disruptiveAction = it.Action
		disruptiveRule = strconv.Itoa(it.RuleID)
		disruptiveStatus = it.Status

		auditData["interruption"] = map[string]interface{}{
			"action":  it.Action,
			"rule_id": it.RuleID,
			"status":  it.Status,
		}

		if updatedAuditJSON, marshalErr := json.Marshal(auditData); marshalErr == nil {
			auditLogString = string(updatedAuditJSON)
		}
	}

	return map[string]interface{}{
		"transaction_id":      tx.ID(),
		"collections":         string(jsdata),
		"matched_data":        string(matchedData),
		"rules_matched_total": strconv.Itoa(len(tx.MatchedRules())),
		"audit_log":           auditLogString,
		"disruptive_action":   disruptiveAction,
		"disruptive_rule":     disruptiveRule,
		"disruptive_status":   disruptiveStatus,
		"duration":            durationMicros,
		"engine_status":       engineStatus,
	}
}
