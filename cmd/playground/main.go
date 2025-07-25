// Copyright 2024 The OWASP Coraza contributors
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
	directives, request, response, crs := args[0].String(), args[1].String(), args[2].String(), args[3].Bool()

	fmt.Printf("\n=== VALIDATION START ===\n")
	fmt.Printf("CRS enabled: %t\n", crs)
	fmt.Printf("Custom directives (%d chars):\n%s\n", len(directives), directives)
	fmt.Printf("Request (%d chars):\n%s\n", len(request), request)
	fmt.Printf("Response (%d chars):\n%s\n", len(response), response)

	cfg := coraza.NewWAFConfig().
		WithRootFS(coreruleset.FS)
	if crs {
		fmt.Println("Adding CRS setup configuration...")
		cfg = cfg.WithDirectives("Include @crs-setup.conf.example")
	}

	if crs {
		fmt.Println("Loading CRS rules...")
		cfg = cfg.WithDirectives("Include @coraza.conf-recommended").
			WithDirectives("Include @owasp_crs/*.conf")
	}

	if directives != "" {
		fmt.Println("Adding custom directives...")
		cfg = cfg.WithDirectives(directives)
	}

	fmt.Println("Creating WAF instance...")
	waf, err := coraza.NewWAF(cfg)
	if err != nil {
		fmt.Printf("WAF creation error: %s\n", err.Error())
		return map[string]interface{}{
			"error": err.Error(),
		}
	}
	fmt.Printf("WAF created successfully\n")

	tx := waf.NewTransaction()
	fmt.Printf("Created new transaction: %s\n", tx.ID())

	// Determine WAF engine status from configuration
	engineStatus := "DetectionOnly" // Default assumption

	// Check directives for SecRuleEngine settings
	if strings.Contains(strings.ToLower(directives), "secruleengine on") {
		engineStatus = "On"
		fmt.Printf("Found 'SecRuleEngine On' in directives\n")
	} else if strings.Contains(strings.ToLower(directives), "secruleengine off") {
		engineStatus = "Off"
		fmt.Printf("Found 'SecRuleEngine Off' in directives\n")
	} else if strings.Contains(strings.ToLower(directives), "secruleengine detectiononly") {
		engineStatus = "DetectionOnly"
		fmt.Printf("Found 'SecRuleEngine DetectionOnly' in directives\n")
	}

	fmt.Printf("Determined engine status: %s\n", engineStatus)

	// Start timing the rule evaluation
	startTime := time.Now()
	fmt.Printf("Starting rule evaluation timing at: %v\n", startTime)

	fmt.Println("Starting request processing...")
	err = internal.RequestProcessor(tx, strings.NewReader(request))
	if err != nil {
		fmt.Printf("Request processing error: %s\n", err.Error())
		return map[string]interface{}{
			"error": "Error processing request" + err.Error(),
		}
	}
	fmt.Println("Request processing completed")

	fmt.Println("Starting response processing...")
	err = internal.ResponseProcessor(tx, strings.NewReader(response))
	if err != nil {
		fmt.Printf("Response processing error: %s\n", err.Error())
		return map[string]interface{}{
			"error": "Error processing response: " + err.Error(),
		}
	}
	fmt.Println("Response processing completed")

	// Calculate total duration in microseconds
	endTime := time.Now()
	duration := endTime.Sub(startTime)
	durationMicros := duration.Microseconds()
	fmt.Printf("Rule evaluation completed at: %v\n", endTime)
	fmt.Printf("Total evaluation duration: %d microseconds (%v)\n", durationMicros, duration)

	fmt.Println("Building final results...")
	result := internal.BuildResults(tx, durationMicros, engineStatus)
	fmt.Printf("=== VALIDATION END ===\n\n")

	return result
}
