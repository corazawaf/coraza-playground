// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

//go:build js && wasm
// +build js,wasm

package main

import (
	"fmt"
	"strings"
	"syscall/js"
	"time"

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
	if len(args) < 4 {
		return map[string]interface{}{
			"error": "expected 4 arguments",
		}
	}

	directives, request, response, crs := args[0].String(), args[1].String(), args[2].String(), args[3].Bool()

	cfg := coraza.NewWAFConfig().
		WithRootFS(coreruleset.FS)
	if crs {
		cfg = cfg.WithDirectives("Include @crs-setup.conf.example").
			WithDirectives("Include @coraza.conf-recommended").
			WithDirectives("Include @owasp_crs/*.conf")
	}

	// Enable audit logging for the playground
	cfg = cfg.WithDirectives(`
		SecAuditEngine RelevantOnly
		SecAuditLogFormat JSON
		SecAuditLogType Serial
	`)

	if directives != "" {
		cfg = cfg.WithDirectives(directives)
	}

	waf, err := coraza.NewWAF(cfg)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	tx := waf.NewTransaction()

	// Determine WAF engine status from configuration
	engineStatus := "DetectionOnly" // Default assumption
	directivesLower := strings.ToLower(directives)
	if strings.Contains(directivesLower, "secruleengine on") {
		engineStatus = "On"
	} else if strings.Contains(directivesLower, "secruleengine off") {
		engineStatus = "Off"
	} else if strings.Contains(directivesLower, "secruleengine detectiononly") {
		engineStatus = "DetectionOnly"
	}

	// Start timing the rule evaluation
	startTime := time.Now()

	err = internal.RequestProcessor(tx, strings.NewReader(request))
	if err != nil {
		fmt.Printf("Request processing error: %s\n", err.Error())
		return map[string]interface{}{
			"error": "Error processing request: " + err.Error(),
		}
	}

	err = internal.ResponseProcessor(tx, strings.NewReader(response))
	if err != nil {
		fmt.Printf("Response processing error: %s\n", err.Error())
		return map[string]interface{}{
			"error": "Error processing response: " + err.Error(),
		}
	}

	durationMicros := time.Since(startTime).Microseconds()

	return internal.BuildResults(tx, durationMicros, engineStatus)
}
