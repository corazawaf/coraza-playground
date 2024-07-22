// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

//go:build js && wasm
// +build js,wasm

package main

import (
	"fmt"
	"strings"
	"syscall/js"

	coreruleset "github.com/corazawaf/coraza-coreruleset/v4"
	"github.com/corazawaf/coraza-playground/internal"
	"github.com/corazawaf/coraza/v3"
)

func main() {
	js.Global().Set("playground", js.FuncOf(validate))
	// Prevent the function from returning, which is required in a wasm module
	select {}
}

func validate(_ js.Value, args []js.Value) interface{} {
	directives, request, response, crs := args[0].String(), args[1].String(), args[2].String(), args[3].Bool()

	cfg := coraza.NewWAFConfig().
		WithRootFS(coreruleset.FS)
	if crs {
		cfg = cfg.WithDirectives("Include @crs-setup.conf.example")
	}
	cfg = cfg.WithDirectives(directives)
	if crs {
		fmt.Println("Loading CRS")
		cfg = cfg.WithDirectives("Include @coraza.conf-recommended").
			WithDirectives("Include @owasp_crs/*.conf")
	}

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

	return internal.BuildResults(tx)
}
