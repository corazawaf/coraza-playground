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

const targetDir = "./www"

func Build() error {
	if err := os.MkdirAll(targetDir, 0700); err != nil {
		return err
	}

	if err := sh.RunV("cp", build.Default.GOROOT+"/misc/wasm/wasm_exec.js", targetDir); err != nil {
		return err
	}

	if err := sh.RunV("cp", "./html/index.html", targetDir); err != nil {
		return err
	}

	if err := sh.RunWithV(map[string]string{"GOOS": "js", "GOARCH": "wasm"}, "go", "build", "-o", targetDir+"/playground.wasm", "cmd/playground/main.go"); err != nil {
		return err
	}

	return nil
}

func Run() error {
	return sh.RunV("go", "run", "testserver/main.go")
}
