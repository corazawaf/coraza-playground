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
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	_ "github.com/jptosso/coraza-libinjection"
	_ "github.com/jptosso/coraza-pcre"
	"github.com/jptosso/coraza-waf/v2"
	"github.com/jptosso/coraza-waf/v2/seclang"
	"github.com/jptosso/coraza-waf/v2/types/variables"
)

var defaultRequest = "POST /testpath?query=data HTTP/1.1\nHost: somehost.com:80\nContent-Type: application/x-www-form-urlencoded\nUser-Agent: SomeUserAgent\nX-Real-Ip: 127.0.0.1\nContent-length: 21\n\nsomecontent=somevalue"
var defaultResponse = "HTTP/1.1 200 OK\nContent-length: 2\n\nOk"
var defaultDirectives = "SecDefaultAction \"phase:1,log,auditlog,pass\"\nSecDefaultAction \"phase:2,log,auditlog,pass\"\nSecAction \"id:900990,\\\n\tphase:1,\\\n\tnolog,\\\n\tpass,\\\n\tt:none,\\\n\tsetvar:tx.crs_setup_version=340\""

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
	Collections []coraza.Collection
}

var settings Config

func main() {
	conf := flag.String("conf", "./playground.yaml", "config file to parse")
	flag.Parse()
	st, err := OpenConfig(*conf)
	settings = *st
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	if settings.Crs.Enabled {
		fmt.Println("Preparing CRS...")
		if err := downloadCrs(settings.Crs.Version, settings.Crs.Path); err != nil {
			fmt.Println("[CRS] Error: " + err.Error())
			os.Exit(1)
		}
	}

	rtr := mux.NewRouter()

	fs := http.FileServer(http.Dir("./public/"))
	if settings.Aws.Enabled {
		err = connectAws()
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	}
	rtr.HandleFunc("/p/{id:[\\w]+}", openRequest).Methods("GET")
	rtr.Handle("/public/", fs)
	rtr.HandleFunc("/results", apiHandler).Methods("POST")
	rtr.HandleFunc("/save", saveRequest).Methods("POST")
	rtr.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		parsedTemplate, _ := template.ParseFiles("www/client.html")
		err = parsedTemplate.Execute(w, ClientRequest{defaultRequest, defaultResponse, defaultDirectives, false})
		if err != nil {
			log.Println("Error executing template :", err)
			return
		}
	}).Methods("GET")
	http.Handle("/", rtr)
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
	w.WriteHeader(500)
	w.Write([]byte(err))
}

func openRequest(w http.ResponseWriter, req *http.Request) {
	r, err := getItem(mux.Vars(req)["id"])
	if err != nil {
		errorHandler(w, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/html")
	parsedTemplate, _ := template.ParseFiles("www/client.html")
	err = parsedTemplate.Execute(w, r)
	if err != nil {
		log.Println("Error executing template :", err)
		return
	}
}
func saveRequest(w http.ResponseWriter, req *http.Request) {
	var r ClientRequest
	err := json.NewDecoder(req.Body).Decode(&r)
	if err != nil {
		errorHandler(w, "Content decode:"+err.Error())
		return
	}

	bts, err := json.Marshal(r)
	if err != nil {
		errorHandler(w, "failed to marshal json request")
		return
	}
	if len(bts) > (1 << 20) { //1megabyte
		errorHandler(w, "request is too big")
		return
	}
	id, err := uploadItem(bts)
	if err != nil {
		errorHandler(w, "File upload: "+err.Error())
		return
	}
	fmt.Fprintf(w, "/p/%s\n", id)
}

func apiHandler(w http.ResponseWriter, req *http.Request) {
	r := &ClientRequest{}
	err := json.NewDecoder(req.Body).Decode(r)
	if err != nil {
		errorHandler(w, err.Error())
		return
	}

	waf := coraza.NewWaf()
	if settings.CrsPath != "" {
		waf.DataDir = settings.CrsPath
	}

	parser, _ := seclang.NewParser(waf)
	if len(settings.Disable.Operators) > 0 {
		waf.GetConfig("disabled_rule_operators", settings.Disable.Operators)
	}
	if len(settings.Disable.Directives) > 0 {
		waf.GetConfig("disabled_directives", settings.Disable.Directives)
	}
	if len(settings.Disable.Actions) > 0 {
		waf.GetConfig("disabled_rule_actions", settings.Disable.Actions)
	}
	err = parser.FromString(r.Directives)
	if err != nil {
		tt := `{{.}}`
		t := template.Must(template.New("none").Parse(tt))
		t.Execute(w, "ERROR: "+err.Error())
		return
	}
	if r.Crs {
		if !settings.Crs.Enabled {
			errorHandler(w, "CRS is disabled :(")
			return
		}
		if err := parser.FromFile(path.Join(settings.Crs.Path, "crs.conf")); err != nil {
			errorHandler(w, "Failed to parse CRS rules")
			return
		}
	}
	tx := waf.NewTransaction()
	defer tx.ProcessLogging()
	_, err = tx.ParseRequestReader(strings.NewReader(r.Request))
	if err != nil {
		errorHandler(w, "Invalid HTTP Request: "+err.Error())
		return
	}

	err = responseProcessor(tx, strings.NewReader(r.Response))
	if err != nil {
		errorHandler(w, "Invalid HTTP response: "+err.Error())
	}
	w.Header().Set("Content-Type", "text/html")
	parsedTemplate, _ := template.ParseFiles("www/results.html")
	json, err := json.Marshal(tx.AuditLog())
	if err != nil {
		errorHandler(w, err.Error())
		return
	}
	collections := []coraza.Collection{}
	for i := variables.RuleVariable(1); i < 100; i++ {
		if col := tx.GetCollection(i); col != nil {
			collections = append(collections, *col)
			continue
		}
		break
	}
	sr := &ServerResponse{
		Transaction: tx,
		Collections: collections,
		AuditLog:    string(json),
	}
	err = parsedTemplate.Execute(w, sr)
	if err != nil {
		log.Println("Error executing template :", err)
		return
	}
}

func responseProcessor(tx *coraza.Transaction, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	protocol := ""
	status := ""

	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return fmt.Errorf("invalid variable count for response header")
			}
			protocol, status, _ = spl[0], spl[1], spl[2]
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ":", 2)
			if len(spl) != 2 {
				return fmt.Errorf("invalid response header")
			}
			key, value := spl[0], spl[1]
			value = strings.TrimSpace(value)
			tx.AddResponseHeader(key, value)
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	bf := strings.Join(bodybuffer, "\r\n")
	tx.ResponseBodyBuffer.Write([]byte(bf))
	st, _ := strconv.Atoi(status)
	tx.ProcessResponseHeaders(st, protocol)
	tx.ProcessResponseBody()
	return nil
}
