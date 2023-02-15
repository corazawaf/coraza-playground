// Copyright 2022 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

//go:build mage
// +build mage

package main

import (
	"go/build"
	"os"
	"path"

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
	files := []string{
		"index.html",
		"app.css",
		// "favicon.ico",
		"app.js",
	}
	for _, file := range files {
		if err := sh.RunV("cp", path.Join(".", "public", file), targetDir); err != nil {
			return err
		}
	}

	if err := sh.RunWithV(map[string]string{"GOOS": "js", "GOARCH": "wasm"}, "go", "build", "-o", targetDir+"/playground.wasm", "-tags=no_fs_access", "cmd/playground/main.go"); err != nil {
		return err
	}

	return nil
}

func Test() error {
	return sh.RunV("go", "test", "./internal")
}

func Run() error {
	return sh.RunV("go", "run", "testserver/main.go")
}
