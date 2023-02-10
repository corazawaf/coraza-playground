// Copyright 2022 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

//go:build mage
// +build mage

package main

import (
	"go/build"
	"os"

	"github.com/magefile/mage/sh"
)

func Build() error {
	scriptsDir := "./build/scripts"
	if err := os.MkdirAll(scriptsDir, 0700); err != nil {
		return err
	}

	if err := sh.RunV("cp", build.Default.GOROOT+"/misc/wasm/wasm_exec.js", scriptsDir); err != nil {
		return err
	}

	if err := sh.RunWithV(map[string]string{"GOOS": "js", "GOARCH": "wasm"}, "go", "build", "-o", scriptsDir+"/seclang-validator.wasm", "cmd/seclang-validator/main.go"); err != nil {
		return err
	}

	return nil
}
