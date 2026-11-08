"""Self-authored injection-prone code templates, each with a vulnerable and a fixed form.

Template id is the split entity. Slots are written «name» so code braces need no escaping.
Every snippet is inert text shown to the reward model as review input; none is ever executed.
CWE ids and titles follow MITRE CWE (https://cwe.mitre.org, terms of use permit reuse).
"""

# (id, lang, family, cwe, sev, title, fix, vulnerable, safe)
T = [
    ("py-sqli-fstring", "python", "sqli", "CWE-89", "high", "SQL injection: request value interpolated into the query",
     "use a parameterised query (cursor.execute(sql, params))",
     'def «fn»(«p»):\n    cur = db.cursor()\n    cur.execute(f"SELECT * FROM «tbl» WHERE «col» = \'{«p»}\'")\n    return cur.fetchall()',
     'def «fn»(«p»):\n    cur = db.cursor()\n    cur.execute("SELECT * FROM «tbl» WHERE «col» = %s", («p»,))\n    return cur.fetchall()'),
    ("py-sqli-format", "python", "sqli", "CWE-89", "high", "SQL injection via str.format in a raw query",
     "pass the value as a bound parameter instead of formatting it into SQL",
     'def «fn»(request):\n    q = "DELETE FROM «tbl» WHERE «col» = {}".format(request.args["«p»"])\n    db.engine.execute(q)',
     'def «fn»(request):\n    db.session.execute(text("DELETE FROM «tbl» WHERE «col» = :v"), {"v": request.args["«p»"]})'),
    ("js-sqli-concat", "javascript", "sqli", "CWE-89", "high", "SQL injection: query built by string concatenation",
     "use placeholders ($1) with a values array",
     'app.get("/«route»", async (req, res) => {\n  const rows = await db.query("SELECT * FROM «tbl» WHERE «col» = \'" + req.query.«p» + "\'");\n  res.json(rows);\n});',
     'app.get("/«route»", async (req, res) => {\n  const rows = await db.query("SELECT * FROM «tbl» WHERE «col» = $1", [req.query.«p»]);\n  res.json(rows);\n});'),
    ("java-sqli-concat", "java", "sqli", "CWE-89", "critical", "SQL injection in a JDBC Statement built from user input",
     "switch to PreparedStatement with ? placeholders",
     'public List<Row> «fn»(String «p») throws SQLException {\n    Statement st = conn.createStatement();\n    return map(st.executeQuery("SELECT * FROM «tbl» WHERE «col» = \'" + «p» + "\'"));\n}',
     'public List<Row> «fn»(String «p») throws SQLException {\n    PreparedStatement ps = conn.prepareStatement("SELECT * FROM «tbl» WHERE «col» = ?");\n    ps.setString(1, «p»);\n    return map(ps.executeQuery());\n}'),
    ("php-sqli-concat", "php", "sqli", "CWE-89", "critical", "SQL injection from $_GET concatenated into mysqli_query",
     "use mysqli prepared statements with bind_param",
     '$r = mysqli_query($conn, "SELECT * FROM «tbl» WHERE «col» = \'" . $_GET[\'«p»\'] . "\'");',
     '$st = $conn->prepare("SELECT * FROM «tbl» WHERE «col» = ?");\n$st->bind_param("s", $_GET[\'«p»\']);\n$st->execute();'),
    ("go-sqli-sprintf", "go", "sqli", "CWE-89", "high", "SQL injection: fmt.Sprintf builds the query from a URL parameter",
     "pass the value as a query argument (db.Query(sql, v))",
     'func «fn»(w http.ResponseWriter, r *http.Request) {\n\tq := fmt.Sprintf("SELECT * FROM «tbl» WHERE «col» = \'%s\'", r.URL.Query().Get("«p»"))\n\trows, _ := db.Query(q)\n\twriteRows(w, rows)\n}',
     'func «fn»(w http.ResponseWriter, r *http.Request) {\n\trows, _ := db.Query("SELECT * FROM «tbl» WHERE «col» = $1", r.URL.Query().Get("«p»"))\n\twriteRows(w, rows)\n}'),
    ("rb-sqli-interp", "ruby", "sqli", "CWE-89", "high", "SQL injection through string interpolation in ActiveRecord where",
     "use hash conditions or ? placeholders",
     'def «fn»\n  @rows = «Model».where("«col» = \'#{params[:«p»]}\'")\nend',
     'def «fn»\n  @rows = «Model».where(«col»: params[:«p»])\nend'),
    ("py-cmd-system", "python", "cmdi", "CWE-78", "critical", "OS command injection: user input passed to os.system",
     "call subprocess.run with an argument list and no shell",
     'def «fn»(«p»):\n    os.system("ping -c 1 " + «p»)',
     'def «fn»(«p»):\n    subprocess.run(["ping", "-c", "1", «p»], check=True)'),
    ("py-cmd-shell", "python", "cmdi", "CWE-78", "critical", "command injection: subprocess with shell=True on a request field",
     "drop shell=True and pass an argument list",
     'def «fn»(request):\n    name = request.form["«p»"]\n    subprocess.run(f"convert {name} /tmp/out.png", shell=True)',
     'def «fn»(request):\n    name = request.form["«p»"]\n    subprocess.run(["convert", name, "/tmp/out.png"], check=True)'),
    ("js-cmd-exec", "javascript", "cmdi", "CWE-78", "critical", "command injection: child_process.exec with a query parameter",
     "use execFile with an argument array",
     'app.get("/«route»", (req, res) => {\n  exec("git log --author=" + req.query.«p», (err, out) => res.send(out));\n});',
     'app.get("/«route»", (req, res) => {\n  execFile("git", ["log", "--author=" + req.query.«p»], (err, out) => res.send(out));\n});'),
    ("php-cmd-shell", "php", "cmdi", "CWE-78", "critical", "command injection: shell_exec on a request parameter",
     "wrap the argument with escapeshellarg or avoid the shell",
     '$out = shell_exec("nslookup " . $_GET[\'«p»\']);\necho $out;',
     '$out = shell_exec("nslookup " . escapeshellarg($_GET[\'«p»\']));\necho htmlspecialchars($out);'),
    ("go-cmd-sh", "go", "cmdi", "CWE-78", "critical", "command injection: sh -c with a form value",
     "run the binary directly with separate arguments",
     'func «fn»(r *http.Request) error {\n\treturn exec.Command("sh", "-c", "tar -xf "+r.FormValue("«p»")).Run()\n}',
     'func «fn»(r *http.Request) error {\n\treturn exec.Command("tar", "-xf", filepath.Base(r.FormValue("«p»"))).Run()\n}'),
    ("py-path-join", "python", "path", "CWE-22", "high", "path traversal: request filename joined to the upload directory",
     "normalise with os.path.realpath and require the result to stay under the base directory",
     '@app.route("/«route»")\ndef «fn»():\n    return send_file(os.path.join(UPLOAD_DIR, request.args["«p»"]))',
     '@app.route("/«route»")\ndef «fn»():\n    return send_from_directory(UPLOAD_DIR, secure_filename(request.args["«p»"]))'),
    ("js-path-send", "javascript", "path", "CWE-22", "high", "path traversal: req.params value passed to res.sendFile",
     "strip directories with path.basename and set the root option",
     'app.get("/«route»/:«p»", (req, res) => {\n  res.sendFile(path.join(__dirname, "files", req.params.«p»));\n});',
     'app.get("/«route»/:«p»", (req, res) => {\n  res.sendFile(path.basename(req.params.«p»), { root: path.join(__dirname, "files") });\n});'),
    ("java-path-file", "java", "path", "CWE-22", "high", "path traversal: File built from a request parameter",
     "canonicalise the path and check it starts with the base directory",
     'File f = new File(BASE_DIR, request.getParameter("«p»"));\nFiles.copy(f.toPath(), response.getOutputStream());',
     'Path p = BASE.resolve(request.getParameter("«p»")).normalize();\nif (!p.startsWith(BASE)) throw new SecurityException();\nFiles.copy(p, response.getOutputStream());'),
    ("py-ssrf-requests", "python", "ssrf", "CWE-918", "high", "server-side request forgery: requests.get on a user-supplied URL",
     "allow-list destination hosts and block internal address ranges",
     'def «fn»():\n    url = request.json["«p»"]\n    return requests.get(url, timeout=5).text',
     'def «fn»():\n    url = request.json["«p»"]\n    if urlparse(url).hostname not in ALLOWED_HOSTS:\n        abort(400)\n    return requests.get(url, timeout=5).text'),
    ("js-ssrf-axios", "javascript", "ssrf", "CWE-918", "high", "SSRF: axios fetches a URL taken from the request body",
     "validate the host against an allow-list before fetching",
     'router.post("/«route»", async (req, res) => {\n  const r = await axios.get(req.body.«p»);\n  res.send(r.data);\n});',
     'router.post("/«route»", async (req, res) => {\n  if (!ALLOWED.has(new URL(req.body.«p»).host)) return res.sendStatus(400);\n  const r = await axios.get(req.body.«p»);\n  res.send(r.data);\n});'),
    ("js-xss-innerhtml", "javascript", "xss", "CWE-79", "medium", "DOM XSS: URL parameter written to innerHTML",
     "assign textContent or sanitise with DOMPurify",
     'const «p» = new URLSearchParams(location.search).get("«p»");\ndocument.getElementById("«col»").innerHTML = «p»;',
     'const «p» = new URLSearchParams(location.search).get("«p»");\ndocument.getElementById("«col»").textContent = «p»;'),
    ("py-xss-fstring", "python", "xss", "CWE-79", "medium", "reflected XSS: query string echoed into HTML without escaping",
     "render through a template with autoescaping or markupsafe.escape",
     '@app.route("/«route»")\ndef «fn»():\n    return f"<h1>Results for {request.args.get(\'«p»\')}</h1>"',
     '@app.route("/«route»")\ndef «fn»():\n    return render_template("results.html", term=request.args.get("«p»"))'),
    ("php-xss-echo", "php", "xss", "CWE-79", "medium", "reflected XSS: $_GET value echoed directly",
     "escape output with htmlspecialchars(..., ENT_QUOTES)",
     'echo "<p>Hello " . $_GET[\'«p»\'] . "</p>";',
     'echo "<p>Hello " . htmlspecialchars($_GET[\'«p»\'], ENT_QUOTES) . "</p>";'),
    ("py-deser-pickle", "python", "deser", "CWE-502", "critical", "insecure deserialization: pickle.loads on request data",
     "accept JSON and validate it instead of unpickling untrusted bytes",
     'def «fn»():\n    obj = pickle.loads(request.get_data())\n    return jsonify(process(obj))',
     'def «fn»():\n    obj = json.loads(request.get_data())\n    return jsonify(process(obj))'),
    ("py-deser-yaml", "python", "deser", "CWE-502", "critical", "unsafe YAML load of an uploaded file",
     "use yaml.safe_load",
     'def «fn»(upload):\n    cfg = yaml.load(upload.read(), Loader=yaml.Loader)\n    apply(cfg)',
     'def «fn»(upload):\n    cfg = yaml.safe_load(upload.read())\n    apply(cfg)'),
    ("java-deser-ois", "java", "deser", "CWE-502", "critical", "Java deserialization of the request body with ObjectInputStream",
     "use a data format such as JSON, or an ObjectInputFilter allow-list",
     'ObjectInputStream in = new ObjectInputStream(request.getInputStream());\n«Model» m = («Model») in.readObject();',
     '«Model» m = mapper.readValue(request.getInputStream(), «Model».class);'),
    ("php-deser-cookie", "php", "deser", "CWE-502", "high", "unserialize() on a cookie value",
     "store json_encode data and json_decode it",
     '$prefs = unserialize($_COOKIE[\'«p»\']);',
     '$prefs = json_decode($_COOKIE[\'«p»\'] ?? "{}", true);'),
    ("py-eval", "python", "eval", "CWE-95", "critical", "code injection: eval on a request argument",
     "parse literals with ast.literal_eval or a real expression parser",
     'def «fn»():\n    return str(eval(request.args["«p»"]))',
     'def «fn»():\n    return str(ast.literal_eval(request.args["«p»"]))'),
    ("js-eval", "javascript", "eval", "CWE-95", "critical", "code injection: eval of a request body field",
     "use a safe expression evaluator, never eval",
     'app.post("/«route»", (req, res) => {\n  res.json({ value: eval(req.body.«p») });\n});',
     'app.post("/«route»", (req, res) => {\n  res.json({ value: mathjs.evaluate(String(req.body.«p»)) });\n});'),
    ("py-hash-md5", "python", "hash", "CWE-916", "high", "passwords hashed with unsalted MD5",
     "use bcrypt, scrypt or argon2 with a per-user salt",
     'def «fn»(user, password):\n    user.pw_hash = hashlib.md5(password.encode()).hexdigest()\n    user.save()',
     'def «fn»(user, password):\n    user.pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())\n    user.save()'),
    ("js-hash-sha1", "javascript", "hash", "CWE-916", "high", "password stored as a fast SHA-1 digest",
     "hash with bcrypt or argon2",
     'async function «fn»(user, password) {\n  user.hash = crypto.createHash("sha1").update(password).digest("hex");\n  await user.save();\n}',
     'async function «fn»(user, password) {\n  user.hash = await bcrypt.hash(password, 12);\n  await user.save();\n}'),
    ("py-tls-verify", "python", "tls", "CWE-295", "high", "TLS certificate verification disabled (verify=False)",
     "remove verify=False; pin a CA bundle if needed",
     'def «fn»(«p»):\n    return requests.post(PAYMENT_API, json=«p», verify=False).json()',
     'def «fn»(«p»):\n    return requests.post(PAYMENT_API, json=«p», timeout=10).json()'),
    ("go-tls-skip", "go", "tls", "CWE-295", "high", "InsecureSkipVerify: true disables certificate checks",
     "remove InsecureSkipVerify and configure RootCAs",
     'tr := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}\nclient := &http.Client{Transport: tr}',
     'tr := &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12}}\nclient := &http.Client{Transport: tr}'),
    ("js-tls-reject", "javascript", "tls", "CWE-295", "high", "rejectUnauthorized: false on an HTTPS agent",
     "keep certificate validation on",
     'const agent = new https.Agent({ rejectUnauthorized: false });\nconst r = await fetch(API_URL, { agent });',
     'const agent = new https.Agent({ keepAlive: true });\nconst r = await fetch(API_URL, { agent });'),
    ("py-jwt-noverify", "python", "jwt", "CWE-347", "critical", "JWT signature verification disabled",
     "decode with the key and an explicit algorithms list",
     'def «fn»(token):\n    claims = jwt.decode(token, options={"verify_signature": False})\n    return claims["sub"]',
     'def «fn»(token):\n    claims = jwt.decode(token, SECRET, algorithms=["HS256"])\n    return claims["sub"]'),
    ("js-jwt-decode", "javascript", "jwt", "CWE-347", "critical", "jwt.decode used for authentication without verifying the signature",
     "use jwt.verify with the secret and algorithms",
     'function «fn»(req, res, next) {\n  req.user = jwt.decode(req.headers.authorization.split(" ")[1]);\n  next();\n}',
     'function «fn»(req, res, next) {\n  req.user = jwt.verify(req.headers.authorization.split(" ")[1], SECRET, { algorithms: ["HS256"] });\n  next();\n}'),
    ("py-redirect", "python", "redirect", "CWE-601", "medium", "open redirect to the unvalidated next parameter",
     "only redirect to relative paths or allow-listed hosts",
     '@app.route("/«route»")\ndef «fn»():\n    return redirect(request.args.get("next", "/"))',
     '@app.route("/«route»")\ndef «fn»():\n    nxt = request.args.get("next", "/")\n    return redirect(nxt if nxt.startswith("/") and not nxt.startswith("//") else "/")'),
    ("java-xxe", "java", "xxe", "CWE-611", "high", "XML external entity (XXE): DocumentBuilderFactory with DTDs enabled",
     "set disallow-doctype-decl to true before parsing",
     'DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();\nDocument d = f.newDocumentBuilder().parse(request.getInputStream());',
     'DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();\nf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);\nDocument d = f.newDocumentBuilder().parse(request.getInputStream());'),
    ("py-random-token", "python", "random", "CWE-330", "medium", "password-reset token generated with the random module",
     "use secrets.token_urlsafe",
     'def «fn»(user):\n    user.reset_token = "".join(random.choice(string.ascii_letters) for _ in range(20))',
     'def «fn»(user):\n    user.reset_token = secrets.token_urlsafe(32)'),
    ("js-random-token", "javascript", "random", "CWE-330", "medium", "session token derived from Math.random()",
     "use crypto.randomBytes",
     'function «fn»() {\n  return Math.random().toString(36).slice(2);\n}',
     'function «fn»() {\n  return crypto.randomBytes(32).toString("hex");\n}'),
]
EXT = {"python": "py", "javascript": "js", "java": "java", "php": "php", "go": "go", "ruby": "rb"}
SLOTS = {
    "fn": ["get_user", "find_order", "lookup", "export_report", "load_profile", "handle", "search", "fetch_invoice",
           "preview", "download", "run_job", "import_config", "reset", "login", "check_host", "render_page", "auth"],
    "p": ["user_id", "name", "email", "q", "host", "file", "path", "term", "data", "expr", "target", "url", "doc"],
    "tbl": ["users", "orders", "invoices", "accounts", "products", "sessions", "tickets", "customers"],
    "col": ["id", "email", "name", "status", "owner", "sku", "ref"],
    "route": ["search", "report", "files", "lookup", "fetch", "preview", "export", "proxy", "calc"],
    "Model": ["User", "Order", "Invoice", "Account", "Profile", "Ticket"],
}


def fill(text, slots):
    for k, v in slots.items():
        text = text.replace(f"«{k}»", v)
    return text


def code_scenario(rng, templates, n_vuln, n_safe):
    """templates: this split's template tuples. One language per scenario, 1-3 functions."""
    langs = sorted({t[1] for t in templates})
    lang = rng.choice(langs)
    pool = [t for t in templates if t[1] == lang]
    if len(pool) < n_vuln + n_safe:
        n_safe = max(0, len(pool) - n_vuln)
    if len(pool) < n_vuln:
        return None
    picks = rng.sample(pool, n_vuln + n_safe)
    fname = rng.choice(["app", "handlers", "views", "service", "routes", "api", "util"]) + "." + EXT[lang]
    blocks, findings, traps, used = [], [], [], set()
    for i, t in enumerate(picks):
        slots = {k: rng.choice(v) for k, v in SLOTS.items()}
        while slots["fn"] in used:
            slots["fn"] = rng.choice(SLOTS["fn"])
        used.add(slots["fn"])
        vuln = i < n_vuln
        blocks.append(fill(t[7] if vuln else t[8], slots))
        where = f"{fname} ({slots['fn']})" if "«fn»" in t[7] else f"{fname} (line {sum(b.count(chr(10)) + 1 for b in blocks[:-1]) + 1})"
        item = {"sev": t[4], "loc": where, "ref": t[3], "title": t[5], "fix": t[6], "kind": "code"}
        (findings if vuln else traps).append(item)
    order = list(range(len(blocks)))
    rng.shuffle(order)
    return {"category": "code", "entity": [f"tpl:{picks[i][0]}" for i in order],
            "files": [(fname, lang, "\n\n".join(blocks[i] for i in order))], "findings": findings, "traps": traps}
