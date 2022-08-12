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
	"log"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

var serverPort = 80
var serverAddr = "127.0.0.1"
var configPath = ""
var crsVersions arrayFlags

type arrayFlags []string

func (i *arrayFlags) String() string {
	return strings.Join(*i, ", ")
}

func (i *arrayFlags) Set(value string) error {
	*i = append(*i, value)
	return nil
}

func main() {
	flag.IntVar(&serverPort, "port", 80, "server port")
	flag.StringVar(&serverAddr, "addr", "127.0.0.1", "server address")
	flag.Var(&crsVersions, "crs", "CRS version")
	flag.StringVar(&configPath, "path", "", "config files path")
	flag.Parse()

	if err := preparseCRS(); err != nil {
		log.Fatal(err)
	}

	rtr := mux.NewRouter()
	rtr.HandleFunc("/", apiHandler).Methods("POST")
	http.Handle("/", rtr)
	s := &http.Server{
		Addr:           fmt.Sprintf("%s:%d", serverAddr, serverPort),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	fmt.Println("Sandbox will listen on " + s.Addr)
	log.Fatal(s.ListenAndServe())
}

func preparseCRS() error {
	return nil
}

func errorHandler(w http.ResponseWriter, err string) {
	w.WriteHeader(500)
	w.Write([]byte(err))
}

func apiHandler(w http.ResponseWriter, req *http.Request) {
	r := &ClientRequest{}
	err := json.NewDecoder(req.Body).Decode(r)
	if err != nil {
		errorHandler(w, fmt.Sprintf("Error parsing request JSON: %s", err.Error()))
		return
	}
	var coraza waf
	if r.CrsVersion != nil {
		version := *r.CrsVersion
		re := regexp.MustCompile(`^[34]{1}(\.[0-9]{1,2}){1,2}$`)
		if !re.MatchString(version) {
			errorHandler(w, "invalid CRS version")
			return
		}
		files := []string{
			path.Join(configPath, "coraza.conf"),
			path.Join(configPath, "crs", version, "coraza.conf"),
			path.Join(configPath, "crs", version, "rules/*.conf"),
		}
		if err := coraza.AddDirectivesFromString(r.Directives); err != nil {
			errorHandler(w, err.Error())
			return
		}
		for _, f := range files {
			if err := coraza.AddDirectivesFromFile(f); err != nil {
				errorHandler(w, err.Error())
				return
			}
		}
	}

	request, err := requestProcessor(r.Request)
	if err != nil {
		errorHandler(w, err.Error())
		return
	}
	resp, err := responseProcessor(r.Response)
	if err != nil {
		errorHandler(w, err.Error())
		return
	}
	if res, err := coraza.Results(request, resp, 5); err != nil {
		errorHandler(w, err.Error())
		return
	} else {
		w.WriteHeader(200)
		if err := json.NewEncoder(w).Encode(res); err != nil {
			errorHandler(w, err.Error())
			return
		}
	}
}
