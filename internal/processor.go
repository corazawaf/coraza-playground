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
	fmt.Printf("=== REQUEST PROCESSING START ===\n")
	fmt.Printf("Processing URI: %s %s %s\n", method, url, protocol)

	tx.ProcessURI(url, method, protocol)
	fmt.Printf("Phase 1 (URI): Matched rules so far: %d\n", len(tx.MatchedRules()))

	// Check for interruption after URI processing (Phase 1)
	if it := tx.Interruption(); it != nil {
		fmt.Printf("INTERRUPTION after URI processing: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
		// Continue processing to capture full collections data
	}

	fmt.Printf("Processing request headers...\n")
	tx.ProcessRequestHeaders()
	fmt.Printf("Phase 1 (Headers): Matched rules so far: %d\n", len(tx.MatchedRules()))

	// Check for interruption after header processing (Phase 1)
	if it := tx.Interruption(); it != nil {
		fmt.Printf("INTERRUPTION after header processing: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
		// Continue processing to capture full collections data
	}

	bodyData := []byte(strings.Join(bodybuffer, "\r\n"))
	fmt.Printf("Processing request body (%d bytes): %s\n", len(bodyData), string(bodyData))

	if _, _, err := tx.WriteRequestBody(bodyData); err != nil {
		return err
	}

	it, err := tx.ProcessRequestBody()
	if err != nil {
		return err
	}
	fmt.Printf("Phase 2 (Request Body): Matched rules so far: %d\n", len(tx.MatchedRules()))

	// Check for interruption after request body processing (Phase 2)
	if it != nil {
		fmt.Printf("INTERRUPTION after request body processing: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
		// Continue processing to capture full collections data
	}

	fmt.Printf("=== REQUEST PROCESSING END ===\n")

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

	fmt.Printf("=== RESPONSE PROCESSING START ===\n")
	fmt.Printf("Response status: %s\n", status)

	st, _ := strconv.Atoi(status)
	tx.ProcessResponseHeaders(st, protocol)
	fmt.Printf("Phase 3 (Response Headers): Matched rules so far: %d\n", len(tx.MatchedRules()))

	// Check for interruption after response header processing (Phase 3)
	if it := tx.Interruption(); it != nil {
		fmt.Printf("INTERRUPTION after response header processing: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
		// Continue processing to capture full collections data
	}

	fmt.Printf("Processing response body (%d bytes): %s\n", len(bf), bf)
	if _, err := tx.ProcessResponseBody(); err != nil {
		return err
	}
	fmt.Printf("Phase 4 (Response Body): Matched rules so far: %d\n", len(tx.MatchedRules()))

	// Check for interruption after response body processing (Phase 4)
	if it := tx.Interruption(); it != nil {
		fmt.Printf("INTERRUPTION after response body processing: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
		// Continue processing to capture full collections data
	}

	fmt.Printf("=== RESPONSE PROCESSING END ===\n")

	return nil
}

func BuildResults(tx types.Transaction, durationMicros int64, engineStatus string) map[string]interface{} {
	fmt.Printf("=== BUILDING COLLECTIONS FIRST ===\n")

	// Build collections BEFORE closing transaction to preserve state
	txState := tx.(plugintypes.TransactionState)
	collections := make([][]string, 0)

	// we transform this into collection, key, index, value
	txState.Variables().All(func(_ variables.RuleVariable, v collection.Collection) bool {
		collectionEntries := v.FindAll()
		if len(collectionEntries) > 0 {
			fmt.Printf("Collection '%s': %d entries\n", v.Name(), len(collectionEntries))
		}
		for index, md := range collectionEntries {
			collections = append(collections, []string{
				v.Name(),
				md.Key(),
				strconv.Itoa(index),
				md.Value(),
			})
		}
		return true
	})
	fmt.Printf("Total collections entries: %d\n", len(collections))

	fmt.Printf("=== FINALIZING TRANSACTION ===\n")

	// Use the provided engine status
	actualEngineStatus := engineStatus
	fmt.Printf("Engine Status: %s\n", actualEngineStatus)

	// Close the transaction to trigger final processing (after collecting data)
	closeErr := tx.Close()
	if closeErr != nil {
		fmt.Printf("Error closing transaction: %s\n", closeErr.Error())
	} else {
		fmt.Printf("Transaction closed successfully\n")
	}

	// Check for interruption immediately after closing
	if it := tx.Interruption(); it != nil {
		fmt.Printf("INTERRUPTION FOUND AFTER TRANSACTION CLOSE: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
	} else {
		fmt.Printf("No interruption found after transaction close\n")
	}
	jsdata, err := json.Marshal(collections)
	if err != nil {
		fmt.Printf("Error marshaling %s\n", err)
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
		fmt.Printf("Error marshaling %s\n", err)
	}
	fmt.Printf("=== BUILDING RESULTS ===\n")
	fmt.Printf("Total matched rules: %d\n", len(tx.MatchedRules()))

	// Log detailed information about each matched rule
	for i, matchedRule := range tx.MatchedRules() {
		rule := matchedRule.Rule()
		fmt.Printf("Matched Rule #%d:\n", i+1)
		fmt.Printf("  ID: %d\n", rule.ID())
		fmt.Printf("  Phase: %d\n", rule.Phase())
		fmt.Printf("  Message: '%s'\n", matchedRule.Message())
		fmt.Printf("  Data: '%s'\n", matchedRule.Data())

		// Try to get action information (if available)
		fmt.Printf("  Rule type/actions: (checking for disruptive behavior)\n")

		// Try to get more information about the rule
		if rule.SecMark() != "" {
			fmt.Printf("  SecMark: %s\n", rule.SecMark())
		}
		if len(rule.Tags()) > 0 {
			fmt.Printf("  Tags: %v\n", rule.Tags())
		}
	}

	// Check for interruption and provide detailed information
	disruptiveAction := "none"
	disruptiveRule := "-"
	disruptiveStatus := 0

	if it := tx.Interruption(); it != nil {
		disruptiveAction = it.Action
		disruptiveRule = strconv.Itoa(it.RuleID)
		disruptiveStatus = it.Status
		fmt.Printf("FINAL INTERRUPTION DETECTED: Action=%s, RuleID=%d, Status=%d\n", it.Action, it.RuleID, it.Status)
	} else {
		fmt.Printf("NO INTERRUPTION DETECTED despite %d matched rules\n", len(tx.MatchedRules()))
		// Check engine state
		fmt.Printf("Transaction ID: %s\n", tx.ID())
	}

	result := map[string]interface{}{
		"transaction_id":      tx.ID(),
		"collections":         string(jsdata),
		"matched_data":        string(matchedData),
		"rules_matched_total": strconv.Itoa(len(tx.MatchedRules())),
		"audit_log":           `{"error": "not implemented"}`,
		"disruptive_action":   disruptiveAction,
		"disruptive_rule":     disruptiveRule,
		"disruptive_status":   disruptiveStatus,
		"duration":            durationMicros,
		"engine_status":       actualEngineStatus,
	}
	return result
}
