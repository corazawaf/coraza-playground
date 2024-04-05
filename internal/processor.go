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
	if _, _, err := tx.WriteRequestBody([]byte(strings.Join(bodybuffer, "\r\n"))); err != nil {
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

func BuildResults(tx types.Transaction) map[string]interface{} {
	txState := tx.(plugintypes.TransactionState)
	collections := make([][]string, 0)
	// we transform this into collection, key, index, value
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
	jsdata, err := json.Marshal(collections)
	if err != nil {
		fmt.Printf("Error marshaling %s\n", err)
	}
	md := [][]string{}
	for _, m := range tx.MatchedRules() {
		msg := m.Message()
		if msg == "" {
			continue
		}
		md = append(md, []string{strconv.Itoa(m.Rule().ID()), msg})
	}
	matchedData, err := json.Marshal(md)
	if err != nil {
		fmt.Printf("Error marshaling %s\n", err)
	}
	result := map[string]interface{}{
		"transaction_id":      tx.ID(),
		"collections":         string(jsdata),
		"matched_data":        string(matchedData),
		"rules_matched_total": strconv.Itoa(len(tx.MatchedRules())),
		"audit_log":           `{"error": "not implemented"}`,
		"disruptive_action":   "none",
		"disruptive_rule":     "-",
		"duration":            0,
	}
	if it := tx.Interruption(); it != nil {
		result["disruptive_action"] = it.Action
		result["disruptive_rule"] = it.RuleID
	}
	return result
}
