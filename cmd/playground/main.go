package main

import (
	"strings"
	"syscall/js"

	"github.com/corazawaf/coraza/v3"
	"github.com/jptosso/coraza-playground/internal"
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

	return internal.BuildResults(tx)
}
