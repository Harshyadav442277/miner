// Load the verified child class for the URL_SCAN family before the kit's Stage 1 check.
// Copy into cmd/adapterbuild and build a dedicated binary. The package parser is unchanged.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/scoring/catalog"
)

func init() {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get("https://devnode.telegraphprotocol.com/engine/v1/intents/URL_SCAN_VERDICT")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	defer resp.Body.Close()
	var body struct{ Class string }
	err = json.NewDecoder(resp.Body).Decode(&body)
	if resp.StatusCode != 200 || err != nil || body.Class != "hybrid" {
		fmt.Fprintln(os.Stderr, "URL_SCAN_VERDICT no longer confirms the verified hybrid class")
		os.Exit(2)
	}
	catalog.UseClasses(map[string]catalog.Class{"URL_SCAN": catalog.ClassHybrid, "URL_SCAN_VERDICT": catalog.ClassHybrid})
	fmt.Fprintln(os.Stderr, "URL_SCAN class verified from live URL_SCAN_VERDICT")
}
