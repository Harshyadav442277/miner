// Convert replay bits with the kit's exact integer sigmoid before hybrid fusion.
// Run with the adapter kit as the working directory and score JSON paths as arguments.
package main

import (
	"encoding/json"
	"fmt"
	"os"

	runtime "github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/wasm/runtime"
)

func main() {
	for _, path := range os.Args[1:] {
		raw, err := os.ReadFile(path)
		if err != nil {
			panic(err)
		}
		var data map[string]any
		if err := json.Unmarshal(raw, &data); err != nil {
			panic(err)
		}
		for _, item := range data["rows"].([]any) {
			row := item.(map[string]any)
			bps := make([]int32, 2)
			for i, key := range []string{"chosen", "rejected"} {
				score := row[key].(map[string]any)
				value, err := runtime.NewModelScoreFromBits(uint32(score["bits"].(float64)))
				if err != nil {
					panic(err)
				}
				bps[i] = value.BasisPoints()
				score["basis_points"] = bps[i]
			}
			row["bps_win"] = bps[0] > bps[1]
			row["bps_tie"] = bps[0] == bps[1]
		}
		encoded, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			panic(err)
		}
		if err := os.WriteFile(path, encoded, 0644); err != nil {
			panic(err)
		}
		fmt.Println("converted", path)
	}
}
