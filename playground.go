// Copyright 2021 Juan Pablo Tosso
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	coraza "github.com/jptosso/coraza-waf"
	"github.com/jptosso/coraza-waf/seclang"
)

type ClientRequest struct {
	Request    string `json:"request"`
	Response   string `json:"response"`
	Directives string `json:"directives"`
	Crs        bool   `json:"crs"`
}

type ServerResponse struct {
	Error       string
	AuditLog    string
	Output      string
	Transaction *coraza.Transaction
}

func main() {
	conf := flag.String("conf", "./playground.yaml", "config file to parse")
	flag.Parse()

	settings, err := OpenConfig(*conf)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	fs := http.FileServer(http.Dir("./public/"))
	http.Handle("/public/", fs)
	http.HandleFunc("/results", func(w http.ResponseWriter, r *http.Request) {
		apiHandler(w, r, settings)
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./www/client.html")
	})
	s := &http.Server{
		Addr:           fmt.Sprintf("%s:%d", settings.Address, settings.Port),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	fmt.Println("Sandbox will listen on " + s.Addr)
	log.Fatal(s.ListenAndServe())
}

func errorHandler(w http.ResponseWriter, err string) {
	w.Write([]byte(err))
}

func apiHandler(w http.ResponseWriter, req *http.Request, settings *Config) {
	var r ClientRequest
	err := json.NewDecoder(req.Body).Decode(&r)
	if err != nil {
		//http.Error(w, err.Error(), http.StatusBadRequest)
		//return
	}
	waf := coraza.NewWaf()
	if settings.CrsPath != "" {
		waf.DataDir = settings.CrsPath
	}

	parser, _ := seclang.NewParser(waf)
	if settings.Disable != nil {
		if len(settings.Disable.Operators) > 0 {
			parser.DisabledRuleOperators = append(parser.DisabledRuleOperators, settings.Disable.Operators...)
		}
		if len(settings.Disable.Directives) > 0 {
			parser.DisabledDirectives = append(parser.DisabledDirectives, settings.Disable.Directives...)
		}
		if len(settings.Disable.Actions) > 0 {
			parser.DisabledRuleActions = append(parser.DisabledRuleActions, settings.Disable.Actions...)
		}
	}
	err = parser.FromString(r.Directives)
	if err != nil {
		tt := `{{.}}`
		t := template.Must(template.New("none").Parse(tt))
		t.Execute(w, "ERROR: "+err.Error())
		return
	}
	if r.Crs {
		fmt.Println("Loading CRS rules")
		err = loadCrs(settings.CrsPath, parser)
		if err != nil {
			fmt.Println(err)
		}
	}
	tx := waf.NewTransaction()
	_, err = tx.ParseRequestReader(strings.NewReader(r.Request))
	if err != nil {
		errorHandler(w, "Invalid HTTP Request")
		return
	}
	// TODO process response
	w.Header().Set("Content-Type", "text/html")
	parsedTemplate, _ := template.ParseFiles("www/results.html")
	json, _ := tx.AuditLog().JSON()
	sr := &ServerResponse{
		Transaction: tx,
		AuditLog:    string(json),
	}
	err = parsedTemplate.Execute(w, sr)
	if err != nil {
		log.Println("Error executing template :", err)
		return
	}
}

func loadCrs(location string, pp *seclang.Parser) error {
	files := []string{
		"REQUEST-901-INITIALIZATION.conf",
		"REQUEST-903.9001-DRUPAL-EXCLUSION-RULES.conf",
		"REQUEST-903.9002-WORDPRESS-EXCLUSION-RULES.conf",
		"REQUEST-903.9003-NEXTCLOUD-EXCLUSION-RULES.conf",
		"REQUEST-903.9004-DOKUWIKI-EXCLUSION-RULES.conf",
		"REQUEST-903.9005-CPANEL-EXCLUSION-RULES.conf",
		"REQUEST-903.9006-XENFORO-EXCLUSION-RULES.conf",
		"REQUEST-905-COMMON-EXCEPTIONS.conf",
		"REQUEST-910-IP-REPUTATION.conf",
		"REQUEST-911-METHOD-ENFORCEMENT.conf",
		"REQUEST-912-DOS-PROTECTION.conf",
		"REQUEST-913-SCANNER-DETECTION.conf",
		"REQUEST-920-PROTOCOL-ENFORCEMENT.conf",
		"REQUEST-921-PROTOCOL-ATTACK.conf",
		"REQUEST-930-APPLICATION-ATTACK-LFI.conf",
		"REQUEST-931-APPLICATION-ATTACK-RFI.conf",
		"REQUEST-932-APPLICATION-ATTACK-RCE.conf",
		"REQUEST-933-APPLICATION-ATTACK-PHP.conf",
		"REQUEST-934-APPLICATION-ATTACK-NODEJS.conf",
		"REQUEST-941-APPLICATION-ATTACK-XSS.conf",
		"REQUEST-942-APPLICATION-ATTACK-SQLI.conf",
		"REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION.conf",
		"REQUEST-944-APPLICATION-ATTACK-JAVA.conf",
		"REQUEST-949-BLOCKING-EVALUATION.conf",
		"RESPONSE-950-DATA-LEAKAGES.conf",
		"RESPONSE-951-DATA-LEAKAGES-SQL.conf",
		"RESPONSE-952-DATA-LEAKAGES-JAVA.conf",
		"RESPONSE-953-DATA-LEAKAGES-PHP.conf",
		"RESPONSE-954-DATA-LEAKAGES-IIS.conf",
		"RESPONSE-959-BLOCKING-EVALUATION.conf",
		"RESPONSE-980-CORRELATION.conf",
	}
	rules := "SecAction \"id:900990,phase:1,nolog,pass,t:none,setvar:tx.crs_setup_version=340\"\n"

	var err error
	for _, f := range files {
		p := path.Join(location, f)
		content, err := ioutil.ReadFile(p)
		if err != nil {
			return err
		}

		rules += string(content) + "\n"
	}
	err = pp.FromString(rules)
	return err
}
