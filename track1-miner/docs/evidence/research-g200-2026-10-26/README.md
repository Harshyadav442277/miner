# G200: RESEARCH_QUERY drops the question's qualifier (fixed 2026-10-26)

**The defect.** The 2026-10-21 audit graded 3 of 4 RESEARCH_QUERY answers as fails, and all three still failed on
current code at the start of this work:
- "Will Nivolumab show improved bladder cancer outcomes?" got a head-and-neck trial.
- "What does research say about creatine supplementation and cognition?" got a beetroot-juice review.
- "Will Pakistan sanction Iran?" got a root-canal trial in Iran (later, Pakistan's Wikipedia intro).

**Method.** `tools/research-replay.mjs` answers the 99 recorded routed questions plus the audit's creatine
question in-process, against live ClinicalTrials.gov, Europe PMC and Wikipedia. It was run on the code before
(`before.json`/`.txt`) and after (`after.json`/`.txt`). `diff.txt` lists every answer whose lead sentence
changed, and each was read by hand.

## What changed in `src/research.ts`

1. **A qualifier** (`qualifierOf`) is what the question asks about the name, minus forecast words ("approved",
   "market share", "outperform"), generic words ("disease", "get") and names.
   - Each candidate is searched together with it: "Nivolumab bladder cancer".
   - A trial must name it in its title or conditions; CheckMate-style titles say "urothelial", and the
     conditions say "Bladder Cancer".
   - A paper must name it in its title or abstract. One or two words must all match; three or more, all but one.
   - Lay words stand for clinical ones: "eye" for retina, macular and ocular; "paediatric" for child.
   - Hyphenated words match by their parts: "alpha-thalassemia" meets "Alpha (α)-Thalassemia", not
     "Beta-thalassemia".
   - When no trial names it outright, the registry's own matches stand, if their title names the candidate.
   - A qualifier over four words is ignored, because the question is a pasted passage.
2. **Names** (`searchNames`): a drug or trial code goes first ("LY3537021" before "Eli Lilly"), and a bare
   company word ("Medical") is never a candidate.
3. **Concept literature** must contain every content word of each concept, not only its longest word. For a
   non-forecast question it now leads over a trial that matches only one concept. The "what does research say
   about" scaffolding is stripped.
4. **A state's political decision** ("sanction", "mediate", "invade"…, with no clinical word) is declined by
   name as `out_of_scope`, rather than answered with any record that names the country.

## Result on the 100 questions

| | evidence | no_evidence | unknown | unavailable |
|---|---:|---:|---:|---:|
| Before | 96 | 4 | 0 | 0 |
| After | 90 | 8 | 2 | 0 |

**47 lead sentences changed.** Representative changes:
- **Now the trial or paper on the thing asked:**
  - Nivolumab and bladder cancer: NCT03980041, conditions Bladder Cancer and Urothelial Carcinoma.
  - Creatine and cognition: a scoping review on exactly that.
  - Luspatercept in alpha-thalassemia: NCT05664737.
  - Semaglutide and diabetic eye disease: an ocular blood-flow study.
  - Ponatinib in paediatric leukaemia; Cagrilintide in bone metabolism; Holy Basil for sensitive skin.
  - MeMed BV in LRTI management; Boston Scientific's DBS registry; Essilor's myopia-control lens.
  - Baricitinib delaying type 1 diabetes; Glufosfamide versus 5-FU.
  - LY3537021's own trials; Patisiran-LNP pregnancy surveillance; AstraZeneca's SLE study; Pirtobrutinib in ITP.
- **Now an honest "no evidence" instead of an off-topic record:**
  - Sony's game-ownership lawsuit, where the old answer was Sony's corporate profile.
  - "Will FDA fine Fresenius Kabi?", where it was an autotransfusion paper.
  - Planet Labs, where it was a leaf-area-index paper.
  - "Is it true that the Eiffel Tower is in Berlin?", where it was a singing-voice paper.
  - "Can researchers trust OpenAI?"
- **Declined as political decisions:** both Pakistan questions.
- **Still weak, by reading:**
  - "Will Novartis' malaria drug be approved?" leads with an artemether-lumefantrine surveillance study: Novartis
    malaria, but not necessarily the drug meant.
  - Lo.Li.Pharma and amenorrhoea gets an unrelated amenorrhoea trial (the old answer was unrelated too).
  - Varian's pancreatic trial gets a pancreatic study not shown to be Varian's.
  - "Research Inc's study" reads "Research on Inc …".

## Not covered

- These are recorded routed questions, answered from this machine. Upstream search results change over days.
- Synonyms beyond the small clinical map are not covered: a question in lay terms that the registry spells
  differently can still miss.
