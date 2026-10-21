package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/wasm/runtime"
	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/wasm/wasmbin"
)

// packMain writes one module per intent: the verified base module plus a
// telegraph.adapter section declaring class "comparator", with the intent named in
// the informational "tool" field. The arithmetic is byte-identical across intents.
// Only the label differs, which is what lets one author register the same
// comparator on several intents: the node refuses the same bytes twice from one address.
//
//	go run . pack <base.wasm> <out-dir> INTENT_A,INTENT_B,...
func packMain(base, outDir, intents string) error {
	b, err := os.ReadFile(base)
	if err != nil {
		return err
	}
	if _, ok, _ := wasmbin.CustomSection(b, runtime.AdapterMetaSection); ok {
		return fmt.Errorf("%s already carries a %s section", base, runtime.AdapterMetaSection)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	type entry struct {
		Intent    string `json:"intent"`
		File      string `json:"file"`
		Bytes     int    `json:"bytes"`
		Keccak256 string `json:"keccak256"`
	}
	var manifest []entry
	for _, intent := range strings.Split(intents, ",") {
		intent = strings.TrimSpace(intent)
		meta := runtime.AdapterMeta{ABIVersion: runtime.AdapterABIVersion, Class: "comparator",
			Tool: "telegraph_comparator 0.1.0 for " + intent}
		out := wasmbin.AppendCustomSection(append([]byte(nil), b...), runtime.AdapterMetaSection, meta.Encode())
		got, err := runtime.ReadAdapterMeta(out)
		if err != nil || got == nil {
			return fmt.Errorf("%s: section did not read back: %v", intent, err)
		}
		if err := got.Check("comparator"); err != nil {
			return fmt.Errorf("%s: node would refuse the section: %w", intent, err)
		}
		file := intent + ".wasm"
		if err := os.WriteFile(filepath.Join(outDir, file), out, 0o644); err != nil {
			return err
		}
		manifest = append(manifest, entry{intent, file, len(out), "0x" + hex.EncodeToString(crypto.Keccak256(out))})
	}
	j, _ := json.MarshalIndent(manifest, "", "  ")
	return os.WriteFile(filepath.Join(outDir, "manifest.json"), append(j, '\n'), 0o644)
}
