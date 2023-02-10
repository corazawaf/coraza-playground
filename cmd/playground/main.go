// Copyright 2022 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"strconv"
	"strings"
	"syscall/js"

	"github.com/corazawaf/coraza-playground/internal"
	"github.com/corazawaf/coraza/v3"
	"github.com/corazawaf/coraza/v3/rules"
	"github.com/corazawaf/coraza/v3/types"
	"github.com/corazawaf/coraza/v3/types/variables"
)

func main() {
	js.Global().Set("playground", js.FuncOf(validate))
	// Prevent the function from returning, which is required in a wasm module
	select {}
}

func validate(_ js.Value, args []js.Value) interface{} {
	directives, request, response := args[0].String(), args[1].String(), args[2].String()

	cfg := coraza.NewWAFConfig().WithDirectives(directives)

	waf, err := coraza.NewWAF(cfg)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}
	tx := waf.NewTransaction()
	err = internal.RequestProcessor(tx, strings.NewReader(request))
	if err != nil {
		return map[string]interface{}{
			"error": "Error processing request" + err.Error(),
		}
	}
	err = internal.ResponseProcessor(tx, strings.NewReader(response))
	if err != nil {
		return map[string]interface{}{
			"error": "Error processing response: " + err.Error(),
		}
	}

	txState := tx.(rules.TransactionState)
	collections := make([][4]string, types.VariablesCount)
	// we transform this into collection, key, index, value
	for i := variables.RuleVariable(0); i < types.VariablesCount; i++ {
		v := txState.Collection(variables.RuleVariable(i))
		for index, md := range v.FindAll() {
			collections[i] = [4]string{
				v.Name(),
				md.Key(),
				strconv.Itoa(index),
				md.Value(),
			}
		}
	}

	return map[string]interface{}{
		"transaction_id": tx.ID(),
		"collections":    collections,
	}
}
