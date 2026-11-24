"""Preference pairs for SMART_CONTRACT_AUDIT (generator v1). Every contract is assembled here, so the right answer is
known by construction.

Two question kinds, the ones the public write-up of the current champion (#187) describes the pool as holding.
That write-up was read for methods only; none of its code or data is used.
1. **Access control.** Which check restricts who may call function F?
   - Better answer: F's own modifier, or its `require(msg.sender == ...)`, as JSON `{"target", "authorization_check"}`.
   - Worse answer: another function's check, a check that is not about the caller (whenNotPaused, nonReentrant), or
     "none" for a guarded function.
2. **Audit.** One weakness is planted in one function of a Solidity 0.4 contract with numbered lines.
   - Better answer: Verdict / Highest severity / Finding (class, function, line) / Fix.
   - Worse answer: the wrong class, function or line, or a "Safe" verdict.

LiveCert serves this intent. That is disclosed (ARCHITECTURE A7), and nothing here names or formats a LiveCert
answer. Contracts are generated; a fixed fifth of the contract names is test-only.

    python -I generate_pairs.py --tokenizer C:/Users/hyada/tg-eval/foundation/tokenizer.json --out C:/Users/hyada/tg-eval/pairs/sca_v1
"""
import argparse
import hashlib
import json
import os
import random

MAX_TOKENS = 500
CONTRACTS = ["Vault", "Treasury", "Staking", "Auction", "Escrow", "Lottery", "TokenSale", "Bridge", "Registry", "Faucet",
             "Crowdfund", "Marketplace", "Payroll", "Insurance", "Exchange", "Lending", "Oracle", "Governor"]
VERBS = ["withdraw", "deposit", "setFee", "pause", "mint", "burn", "setOracle", "claim", "upgrade", "sweep", "setOwner",
         "addMember", "removeMember", "setRate", "finalize", "refund", "execute", "setLimit", "rescue", "distribute"]
CALLER = {"onlyOwner": "modifier onlyOwner() { require(msg.sender == owner); _; }",
          "onlyAdmin": "modifier onlyAdmin() { require(admins[msg.sender]); _; }",
          "onlyRole(MINTER_ROLE)": None}
OTHER = ["whenNotPaused", "nonReentrant"]
PARAMS = ["amount", "value", "wad", "qty", "shares", "units"]
VULNS = {
    "reentrancy": ("High", "an external call is made before the balance is set to zero",
                   "update the balance before the call (checks-effects-interactions)"),
    "tx.origin authentication": ("High", "authorization uses tx.origin instead of msg.sender",
                                 "compare msg.sender, not tx.origin"),
    "unchecked call return value": ("Medium", "the result of a low-level call is ignored",
                                    "check the boolean the call returns"),
    "integer overflow": ("High", "arithmetic on uint256 can wrap without SafeMath in Solidity 0.4",
                         "use SafeMath or Solidity 0.8 checked arithmetic"),
    "unprotected selfdestruct": ("Critical", "anyone can call selfdestruct", "restrict the function to the owner"),
}


def split_ok(w, split):
    return (int(hashlib.sha256(w.encode()).hexdigest(), 16) % 5 == 0) == (split == "test")


def access_case(rng, split):
    name = rng.choice([c for c in CONTRACTS if split_ok(c, split)]) + str(rng.randint(2, 999))
    sigs = {}
    fns = rng.sample(VERBS, 4)  # split by contract name only: a split's share of verbs can be under 4
    guards = {}
    for f in fns:
        guards[f] = rng.choice(["onlyOwner", "onlyAdmin", "onlyRole(MINTER_ROLE)", "inline", "inline", None])
    if all(g is None for g in guards.values()):
        guards[fns[0]] = "onlyOwner"
    lines = [f"contract {name} is AccessControl {{", "    address public owner;", "    mapping(address => bool) public admins;",
             "    bytes32 public constant MINTER_ROLE = keccak256(\"MINTER_ROLE\");", "    bool public paused;"]
    lines += ["    " + CALLER["onlyOwner"], "    " + CALLER["onlyAdmin"],
              "    modifier whenNotPaused() { require(!paused); _; }"]
    checks = {}
    for f in fns:
        g, extra = guards[f], rng.choice(["", " whenNotPaused", " nonReentrant"])
        if g == "inline":
            who = rng.choice(["owner", "treasury", "governor"])
            req = f"require(msg.sender == {who}, \"not {who}\");"
            prm = rng.choice(PARAMS)
            sigs[f] = f"function {f}(uint256 {prm}) external{extra}"
            lines += [f"    {sigs[f]} {{", f"        {req}", f"        total += {prm};", "    }"]
            checks[f] = req
        else:
            prm = rng.choice(PARAMS)
            sigs[f] = f"function {f}(uint256 {prm}) external{' ' + g if g else ''}{extra}"
            lines += [f"    {sigs[f]} {{", f"        total += {prm};", "    }"]
            checks[f] = g or "none"
        checks[f + "#extra"] = extra.strip()
    lines.append("}")
    target = rng.choice(fns)
    right = checks[target]
    pool = [checks[f] for f in fns if f != target and checks[f] not in (right, "none")]
    if checks[target + "#extra"]:
        pool.append(checks[target + "#extra"])
    pool += ["none"] if right != "none" else ["onlyOwner"]
    wrong = rng.choice(pool)
    q = rng.choice(["Which check restricts who may call `{f}` in this contract?\n\n{c}",
                    "Access-control audit: what authorizes callers of {f}()?\n```solidity\n{c}\n```",
                    "In the contract below, name the guard on {f}.\n{c}"]).format(f=target, c="\n".join(lines))
    body = lambda chk: json.dumps({"contract": name, "target": target, "signature": sigs[target],
                                   "authorization_check": chk})
    return q, body(right), body(wrong), "access"


SAFE = {
    "reentrancy": ["function {f}() public {", "    uint256 amount = balances[msg.sender];",
                   "    balances[msg.sender] = 0;", "    require(msg.sender.call.value(amount)());", "}"],
    "tx.origin authentication": ["function {f}(address to) public {", "    require(msg.sender == owner);",
                                 "    to.transfer(this.balance);", "}"],
    "unchecked call return value": ["function {f}(address to, uint256 amount) public onlyOwner {",
                                    "    require(to.call.value(amount)());", "    paid[to] += amount;", "}"],
    "integer overflow": ["function {f}(uint256 amount) public {", "    require(balances[msg.sender] + amount >= amount);",
                         "    balances[msg.sender] += amount;", "}"],
    "unprotected selfdestruct": ["function {f}() public onlyOwner {", "    selfdestruct(owner);", "}"],
}


def audit_case(rng, split):
    name = rng.choice([c for c in CONTRACTS if split_ok(c, split)]) + str(rng.randint(2, 999))
    safe = rng.random() < 0.3
    vuln = rng.choice(list(VULNS))
    fn = rng.choice(VERBS)
    body = {
        "reentrancy": ["function {f}() public {", "    uint256 amount = balances[msg.sender];",
                       "    msg.sender.call.value(amount)();", "    balances[msg.sender] = 0;", "}"],
        "tx.origin authentication": ["function {f}(address to) public {", "    require(tx.origin == owner);",
                                     "    to.transfer(this.balance);", "}"],
        "unchecked call return value": ["function {f}(address to, uint256 amount) public onlyOwner {",
                                        "    to.call.value(amount)();", "    paid[to] += amount;", "}"],
        "integer overflow": ["function {f}(uint256 amount) public {", "    balances[msg.sender] += amount;",
                             "    totalSupply += amount;", "}"],
        "unprotected selfdestruct": ["function {f}() public {", "    selfdestruct(msg.sender);", "}"],
    }[vuln] if not safe else SAFE[vuln]
    head = ["pragma solidity ^0.4.24;", f"contract {name} {{", "    address public owner;",
            "    mapping(address => uint256) public balances;", "    uint256 public totalSupply;",
            "    modifier onlyOwner() { require(msg.sender == owner); _; }",
            "    function deposit() public payable { balances[msg.sender] += msg.value; }"]
    src = head + ["    " + l.replace("{f}", fn) for l in body] + ["}"]  # Solidity braces rule out str.format
    line_no = next(i for i, l in enumerate(src, 1) if any(k in l for k in
                   ("call.value", "tx.origin", "selfdestruct", "+= amount", "msg.sender == owner")))
    numbered = "\n".join(f"{i:>2}  {l}" for i, l in enumerate(src, 1))
    sev, why, fix = VULNS[vuln]

    def say(v, cls, f, ln):
        if v == "safe":
            return (f"Verdict: Safe\nHighest severity: None\nFinding: {f}() in {name} has no exploitable weakness; "
                    f"line {ln} (`{src[ln - 1].strip()}`) is guarded.\nFix: none needed.")
        s, w, fx = VULNS[cls]
        return (f"Verdict: Vulnerable\nHighest severity: {s}\nFinding: {cls} in {name}.{f}() at line {ln} "
                f"(`{src[ln - 1].strip()}`): {w}.\nFix: {fx}.")
    if safe:  # the right verdict is Safe; the worse answer reports the class the guard prevents
        q = rng.choice(["Audit this contract and report the most severe finding with its line.\n\n{c}",
                        "Security review of {n}. Give Verdict, Highest severity, Finding (with line) and Fix.\n{c}"]
                       ).format(c=numbered, n=name)
        return q, say("safe", None, fn, line_no), say("v", vuln, fn, line_no), "safe_flagged"
    kind = rng.choice(["wrong_class", "wrong_line", "safe", "wrong_class"])
    if kind == "wrong_class":
        rej = say("v", rng.choice([v for v in VULNS if v != vuln]), fn, line_no)
    elif kind == "wrong_line":
        rej = say("v", vuln, fn, rng.choice([l for l in range(3, len(src)) if l != line_no]))
    else:
        rej = say("safe", None, fn, line_no)
    q = rng.choice(["Audit this contract and report the most severe finding with its line.\n\n{c}",
                    "Security review of {n}. Give Verdict, Highest severity, Finding (with line) and Fix.\n{c}"]
                   ).format(c=numbered, n=name)
    return q, say("v", vuln, fn, line_no), rej, kind


def build(n, seed, split, tok):
    rng = random.Random(seed)
    rows, seen = [], set()
    while len(rows) < n:
        q, c, r, kind = (access_case if rng.random() < 0.55 else audit_case)(rng, split)
        if c == r or q in seen:
            continue
        if max(len(tok.encode(f"### Task:\n{q}\n\n### Answer:\n{a}").ids) for a in (c, r)) > MAX_TOKENS:
            continue
        seen.add(q)
        rows.append(dict(prompt=q, chosen=c, rejected=r, kind=kind, style="json" if kind == "access" else "report"))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=4000)
    a = ap.parse_args()
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(a.tokenizer)
    train = build(a.n + 300, 7, "train", tok)
    sets = {"train": train[:a.n], "val": train[a.n:], "test": build(400, 97, "test", tok)}
    os.makedirs(a.out, exist_ok=True)
    for name, rows in sets.items():
        with open(os.path.join(a.out, f"{name}.jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(name, len(rows))


if __name__ == "__main__":
    main()
