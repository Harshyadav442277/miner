package main

// verify suite <suite-dir> NAME=<module.wasm> ...
//
// Scores every case of suite/<FAMILY>.jsonl (written by ../evaluation/gen-suite.mjs) with the
// kit's ReferenceScore, with each named module under the node's runtime, and with six seeded
// mutants of the rule. Every score is compared with the case's `expected`, which the generator
// computed from the documented rule without consulting any scorer. A module name is matched to a
// family by its FAMILY_ prefix (for example ours:FX_NOW=...).

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/scoring/comparator"
	"github.com/telegraphprotocol/telegraph-wasm-baseline/pkg/wasm/runtime"
)

type suiteCase struct {
	ID, Intent, Key, Mode string
	Spec                  [2]int64
	Truth, Miner          int64
	Expected              int64
}

type rawCase struct {
	ID       string    `json:"id"`
	Intent   string    `json:"intent"`
	Key      string    `json:"key"`
	Mode     string    `json:"failure_mode"`
	Spec     [2]string `json:"spec"`
	Truth    string    `json:"truth"`
	Miner    string    `json:"miner"`
	Expected int64     `json:"expected"`
}

func loadSuite(path string) ([]suiteCase, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var out []suiteCase
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	p := func(s string) int64 { v, e := strconv.ParseInt(s, 10, 64); if e != nil { err = e }; return v }
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		var r rawCase
		if e := json.Unmarshal([]byte(line), &r); e != nil {
			return nil, e
		}
		out = append(out, suiteCase{r.ID, r.Intent, r.Key, r.Mode, [2]int64{p(r.Spec[0]), p(r.Spec[1])}, p(r.Truth), p(r.Miner), r.Expected})
	}
	return out, err
}

// Mutants: plausible ways a hand-written comparator gets the rule wrong. They show which
// failure modes the suite can detect; none is a real module.
func satMul64(a, b int64) int64 {
	p := new(big.Int).Mul(big.NewInt(a), big.NewInt(b))
	if p.IsInt64() {
		return p.Int64()
	}
	if p.Sign() < 0 {
		return math.MinInt64
	}
	return math.MaxInt64
}

var mutants = []struct {
	name string
	f    func(code, tol, truth, miner int64) int64
}{
	{"swapped_truth_miner", func(c, t, tr, m int64) int64 { return comparator.ReferenceScore(c, t, m, tr) }},
	{"reltol_i64_saturating_product", func(c, t, tr, m int64) int64 {
		if int32(c) != 2 {
			return comparator.ReferenceScore(c, t, tr, m)
		}
		d := tr
		if d < 0 {
			d = -d
		}
		if d < 1 {
			d = 1
		}
		diff := m - tr
		if diff < 0 {
			diff = -diff
		}
		return comparator.ReferenceScore(1, t, 0, satMul64(diff, 10000)/d)
	}},
	{"reltol_rounds_not_truncates", func(c, t, tr, m int64) int64 {
		if int32(c) != 2 {
			return comparator.ReferenceScore(c, t, tr, m)
		}
		d := new(big.Int).Abs(big.NewInt(tr))
		if d.Sign() == 0 {
			d.SetInt64(1)
		}
		q := new(big.Rat).SetFrac(new(big.Int).Mul(new(big.Int).Abs(new(big.Int).Sub(big.NewInt(m), big.NewInt(tr))), big.NewInt(10000)), d)
		f, _ := q.Float64()
		return comparator.ReferenceScore(1, t, 0, int64(math.Round(f)))
	}},
	{"zero_at_tolerance_not_2x", func(c, t, tr, m int64) int64 {
		k := int32(c)
		if (k != 1 && k != 2) || t <= 0 {
			return comparator.ReferenceScore(c, t, tr, m)
		}
		// reads "tolerance" as the point where the score reaches 0, instead of 2*tolerance
		e := new(big.Int).Abs(new(big.Int).Sub(big.NewInt(m), big.NewInt(tr)))
		if k == 2 {
			d := new(big.Int).Abs(big.NewInt(tr))
			if d.Sign() == 0 {
				d.SetInt64(1)
			}
			e.Quo(e.Mul(e, big.NewInt(10000)), d)
		}
		if e.Cmp(big.NewInt(t)) >= 0 {
			return 0
		}
		return 10000 * (t - e.Int64()) / t
	}},
	{"unknown_code_scores_zero", func(c, t, tr, m int64) int64 {
		if k := int32(c); k < 0 || k > 3 {
			return 0
		}
		return comparator.ReferenceScore(c, t, tr, m)
	}},
	{"float64_arithmetic", func(c, t, tr, m int64) int64 {
		k := int32(c)
		if (k != 1 && k != 2) || t <= 0 {
			return comparator.ReferenceScore(c, t, tr, m)
		}
		e := math.Abs(float64(m) - float64(tr))
		if k == 2 {
			e = e * 10000 / math.Max(math.Abs(float64(tr)), 1)
		}
		w := 2 * float64(t)
		if e >= w {
			return 0
		}
		return int64(10000 * (w - e) / w)
	}},
}

func suiteMain(dir string, mods []string) error {
	ctx := context.Background()
	fams := []string{"FX_NOW", "CRYPTO_PRICE", "WEATHER_CHECK"}
	for _, fam := range fams {
		cases, err := loadSuite(filepath.Join(dir, fam+".jsonl"))
		if err != nil {
			return fmt.Errorf("%s: %w", fam, err)
		}
		type scorer struct {
			name  string
			score func(int, suiteCase) (int64, error)
		}
		var scorers []scorer
		scorers = append(scorers, scorer{"kit ReferenceScore", func(_ int, c suiteCase) (int64, error) {
			return comparator.ReferenceScore(c.Spec[0], c.Spec[1], c.Truth, c.Miner), nil
		}})
		for _, m := range mods {
			name, path, ok := strings.Cut(m, "=")
			if !ok || !strings.Contains(name, ":"+fam) {
				continue
			}
			wasm, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			// two independent runtimes: the second run checks determinism
			var runs [2][]int64
			for r := 0; r < 2; r++ {
				rt, err := runtime.NewDeterministicInterruptible(ctx, wasm)
				if err != nil {
					return fmt.Errorf("%s: %w", name, err)
				}
				for _, c := range cases {
					s, err := rt.ScoreDeterministic(ctx, c.Miner, c.Truth, c.Spec)
					if err != nil && (c.Truth == 0 || strings.Contains(err.Error(), "rejected the input")) {
						// the runtime refuses an unresolved (zero) truth, or a negative (refusal) score from the module
						runs[r] = append(runs[r], -1)
						continue
					}
					if err != nil {
						rt.Close(ctx) //nolint:errcheck
						return fmt.Errorf("%s %s: %w", name, c.ID, err)
					}
					runs[r] = append(runs[r], int64(s))
				}
				rt.Close(ctx) //nolint:errcheck
			}
			nondet := 0
			for i := range runs[0] {
				if runs[0][i] != runs[1][i] {
					nondet++
				}
			}
			got := runs[0]
			label := fmt.Sprintf("%s (nondeterministic %d)", name, nondet)
			scorers = append(scorers, scorer{label, func(i int, _ suiteCase) (int64, error) { return got[i], nil }})
		}
		for _, mu := range mutants {
			f := mu.f
			scorers = append(scorers, scorer{"mutant " + mu.name, func(_ int, c suiteCase) (int64, error) { return f(c.Spec[0], c.Spec[1], c.Truth, c.Miner), nil }})
		}
		fmt.Printf("\n== %s: %d cases ==\n", fam, len(cases))
		for _, s := range scorers {
			agree, refused, byMode, shown := 0, 0, map[string]int{}, 0
			var ex []string
			for i, c := range cases {
				v, err := s.score(i, c)
				if err != nil {
					return err
				}
				if v == c.Expected {
					agree++
					continue
				}
				if v == -1 {
					refused++
					continue
				}
				byMode[c.Mode]++
				if shown < 2 {
					ex = append(ex, fmt.Sprintf("%s %s %s spec=[%d,%d] truth=%d miner=%d want=%d got=%d", c.ID, c.Key, c.Mode, c.Spec[0], c.Spec[1], c.Truth, c.Miner, c.Expected, v))
					shown++
				}
			}
			modes := make([]string, 0, len(byMode))
			for k, n := range byMode {
				modes = append(modes, fmt.Sprintf("%s:%d", k, n))
			}
			sort.Strings(modes)
			fmt.Printf("%-46s agree %d/%d  refused %d  disagree %d  %s\n", s.name, agree, len(cases), refused, len(cases)-agree-refused, strings.Join(modes, " "))
			for _, e := range ex {
				fmt.Println("    e.g.", e)
			}
		}
	}
	return nil
}
