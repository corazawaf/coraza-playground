// Copyright 2023 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

//go:build mage
// +build mage

package main

import (
	"errors"
	"fmt"
	"go/build"
	"io"
	"os"

	"github.com/magefile/mage/sh"
)

const targetDir = "./www"

var golangCILintVer = "v1.64.8"
var addLicenseVersion = "v1.1.1" // https://github.com/google/addlicense/releases
var gosImportsVer = "v0.3.7"     // https://github.com/rinchsan/gosimports/releases
var errRunGoModTidy = errors.New("go.mod/sum not formatted, commit changes")

// Format formats code in this repository.
func Format() error {
	if err := sh.RunV("go", "mod", "tidy"); err != nil {
		return err
	}

	// addlicense strangely logs skipped files to stderr despite not being erroneous, so use the long sh.Exec form to
	// discard stderr too.
	if _, err := sh.Exec(map[string]string{}, io.Discard, io.Discard, "go", "run", fmt.Sprintf("github.com/google/addlicense@%s", addLicenseVersion),
		"-c", "The OWASP Coraza contributors",
		"-s=only",
		"-ignore", "**/*.yml",
		"-ignore", "**/*.yaml", "."); err != nil {
		return err
	}
	return sh.RunV("go", "run", fmt.Sprintf("github.com/rinchsan/gosimports/cmd/gosimports@%s", gosImportsVer),
		"-w",
		"-local",
		"github.com/corazawaf/coraza",
		".")
}

// Lint verifies code quality.
func Lint() error {
	if err := sh.RunV("go", "run", fmt.Sprintf("github.com/golangci/golangci-lint/cmd/golangci-lint@%s", golangCILintVer), "run"); err != nil {
		return err
	}

	if err := sh.RunV("go", "mod", "tidy"); err != nil {
		return err
	}

	if sh.Run("git", "diff", "--exit-code", "go.mod", "go.sum") != nil {
		return errRunGoModTidy
	}

	return nil
}

// Build compiles the frontend with Vite and the WASM binary.
func Build() error {
	if err := os.MkdirAll(targetDir, 0700); err != nil {
		return err
	}

	// Install npm dependencies if needed
	if _, err := os.Stat("node_modules"); os.IsNotExist(err) {
		fmt.Println("Installing npm dependencies...")
		if err := sh.RunV("npm", "ci"); err != nil {
			return fmt.Errorf("failed to install npm dependencies: %w", err)
		}
	}

	// Build frontend with Vite (includes grammar build via npm run build)
	fmt.Println("Building frontend with Vite...")
	if err := sh.RunV("npx", "vite", "build"); err != nil {
		return fmt.Errorf("failed to build frontend: %w", err)
	}

	// Copy wasm_exec.js from Go installation
	if err := sh.RunV("cp", build.Default.GOROOT+"/lib/wasm/wasm_exec.js", targetDir); err != nil {
		return err
	}

	// Build WASM binary
	fmt.Println("Building WASM binary...")
	if err := sh.RunWithV(map[string]string{"GOOS": "js", "GOARCH": "wasm"}, "go", "build", "-o", targetDir+"/playground.wasm", "-tags=no_fs_access", "cmd/playground/main.go"); err != nil {
		return err
	}

	return nil
}

// Test runs Go unit tests.
func Test() error {
	return sh.RunV("go", "test", "./internal")
}
