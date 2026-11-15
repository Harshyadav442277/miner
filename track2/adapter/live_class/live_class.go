// Package main: drop this file into the adapter kit's cmd/adapterbuild before `go build`, so
// adapterbuild resolves an intent's class from the live node instead of the kit's compiled-in
// catalog (track2 GAPS G36: the compiled list says hybrid where the node demands judgment).
//
//	cp live_class.go <kit>/cmd/adapterbuild/ && cd <kit> && go build -o adapterbuild-live ./cmd/adapterbuild
//	LIVE_CLASS_INTENTS=EVENT_OUTCOME_RESOLUTION adapterbuild-live lora --intent EVENT_OUTCOME_RESOLUTION ...
//
// It reads GET <node>/engine/v1/intents/<INTENT>_GENERAL for each intent in LIVE_CLASS_INTENTS
// and installs the answers with catalog.UseClasses, the same hook a node's database load uses.
// Nothing else in adapterbuild changes: the Stage 1 parser and the foundation load are the kit's.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/scoring/catalog"
)

func init() {
	intents := strings.TrimSpace(os.Getenv("LIVE_CLASS_INTENTS"))
	if intents == "" {
		return
	}
	node := os.Getenv("LIVE_CLASS_NODE")
	if node == "" {
		node = "https://devnode.telegraphprotocol.com"
	}
	client := &http.Client{Timeout: 30 * time.Second}
	classes := map[string]catalog.Class{}
	for _, intent := range strings.Split(intents, ",") {
		id := strings.TrimSuffix(strings.TrimSpace(intent), "_GENERAL")
		resp, err := client.Get(node + "/engine/v1/intents/" + id + "_GENERAL")
		if err != nil {
			fmt.Fprintln(os.Stderr, "live class:", err)
			os.Exit(2)
		}
		var body struct {
			Class string `json:"class"`
		}
		err = json.NewDecoder(resp.Body).Decode(&body)
		resp.Body.Close()
		if err != nil || body.Class == "" {
			fmt.Fprintf(os.Stderr, "live class: no class for %s (%v)\n", id, err)
			os.Exit(2)
		}
		classes[id] = catalog.Class(body.Class)
		classes[id+"_GENERAL"] = catalog.Class(body.Class)
		fmt.Fprintf(os.Stderr, "live class: %s is %s on %s\n", id, body.Class, node)
	}
	catalog.UseClasses(classes)
}
