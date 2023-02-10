package main

import (
	"log"
	"net/http"
	"os"
)

const buildDir = "./www"

func main() {
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		log.Fatalf("build dir %q does not exist", buildDir)
	}

	fs := http.FileServer(http.Dir(buildDir))
	http.Handle("/", fs)

	log.Println("Listening on http://localhost:3000/index.html")
	err := http.ListenAndServe(":3000", nil)
	if err != nil {
		log.Fatal(err)
	}
}
