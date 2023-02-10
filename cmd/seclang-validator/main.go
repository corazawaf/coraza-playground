package main

import (
	"syscall/js"

	"github.com/corazawaf/coraza/v3"
)

func main() {
	js.Global().Set("validate", js.FuncOf(validate))
	// Prevent the function from returning, which is required in a wasm module
	select {}
}

func validate(_ js.Value, args []js.Value) interface{} {
	res := map[string]interface{}{
		"directive": args[0].String(),
	}

	cfg := coraza.NewWAFConfig().WithDirectives(args[0].String())

	_, err := coraza.NewWAF(cfg)
	if err != nil {
		res["error"] = err.Error()
	}

	return res
}
