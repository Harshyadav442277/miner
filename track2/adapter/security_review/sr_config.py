"""Self-authored misconfiguration templates: Docker, Kubernetes, Terraform, nginx, web
frameworks and endpoint specs. Each check has an insecure and a secure line; a scenario turns
some checks insecure (findings) and leaves others secure (false-positive traps).
Rule ideas follow public benchmarks (CIS, OWASP ASVS); all text here is self-written.
"""

# file template id -> (filename, lang, header, footer, checks)
# check: (key, insecure line, secure line, sev, title, fix)
C = {
    "dockerfile": ("Dockerfile", "dockerfile", "FROM python:3.12-slim\nWORKDIR /app\nCOPY . .", 'CMD ["gunicorn", "app:app"]', [
        ("user", "USER root", "USER 10001", "medium", "container runs as root", "create and switch to an unprivileged USER"),
        ("curl", "RUN curl -sSL https://get.example.sh | sh", "RUN pip install --no-cache-dir -r requirements.txt", "high",
         "remote script piped to sh during build", "download a pinned artefact and verify its checksum"),
        ("add", "ADD http://mirror.example.com/tool.tar.gz /opt/", "COPY vendor/tool.tar.gz /opt/", "medium",
         "ADD fetches a remote archive over plain HTTP", "COPY a vendored, checksummed file instead"),
        ("ssh", "EXPOSE 22", "EXPOSE 8000", "medium", "SSH port exposed from the application image", "remove sshd and port 22; use docker exec"),
        ("env", "ENV ADMIN_PASSWORD=Winter2024!", "ENV PYTHONUNBUFFERED=1", "critical", "plaintext admin password baked into an image layer",
         "pass secrets at runtime through a secret mount")]),
    "k8s-deploy": ("deployment.yaml", "yaml", "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  template:\n    spec:", "      containers:\n      - name: api\n        image: registry.local/api:2.3.1", [
        ("priv", "      securityContext:\n        privileged: true", "      securityContext:\n        privileged: false", "critical",
         "privileged container (full host access)", "set privileged: false and drop all capabilities"),
        ("hostnet", "      hostNetwork: true", "      hostNetwork: false", "high", "pod shares the host network namespace", "remove hostNetwork"),
        ("root", "      runAsUser: 0", "      runAsNonRoot: true", "high", "pod runs as UID 0", "set runAsNonRoot: true and a non-zero runAsUser"),
        ("hostpath", "      volumes:\n      - name: host\n        hostPath:\n          path: /", "      volumes:\n      - name: tmp\n        emptyDir: {}", "high",
         "hostPath volume mounts the node's root filesystem", "use emptyDir or a PersistentVolumeClaim"),
        ("sa", "      automountServiceAccountToken: true", "      automountServiceAccountToken: false", "low",
         "service account token mounted although the app does not call the API", "set automountServiceAccountToken: false")]),
    "tf-aws": ("main.tf", "hcl", 'provider "aws" {\n  region = "us-east-1"\n}', "", [
        ("s3acl", 'resource "aws_s3_bucket_acl" "logs" {\n  bucket = aws_s3_bucket.logs.id\n  acl    = "public-read"\n}',
         'resource "aws_s3_bucket_public_access_block" "logs" {\n  bucket                  = aws_s3_bucket.logs.id\n  block_public_acls       = true\n}', "high",
         "S3 bucket ACL is public-read", "remove the public ACL and enable the public access block"),
        ("sg22", 'resource "aws_security_group_rule" "ssh" {\n  type        = "ingress"\n  from_port   = 22\n  to_port     = 22\n  cidr_blocks = ["0.0.0.0/0"]\n}',
         'resource "aws_security_group_rule" "ssh" {\n  type        = "ingress"\n  from_port   = 22\n  to_port     = 22\n  cidr_blocks = ["10.0.0.0/16"]\n}', "high",
         "SSH (22) open to 0.0.0.0/0", "restrict the CIDR to a bastion or VPN range"),
        ("rds", 'resource "aws_db_instance" "main" {\n  publicly_accessible = true\n  storage_encrypted   = false\n}',
         'resource "aws_db_instance" "main" {\n  publicly_accessible = false\n  storage_encrypted   = true\n}', "high",
         "RDS instance publicly accessible and unencrypted", "set publicly_accessible = false and storage_encrypted = true"),
        ("iam", 'resource "aws_iam_policy" "app" {\n  policy = jsonencode({ Statement = [{ Effect = "Allow", Action = "*", Resource = "*" }] })\n}',
         'resource "aws_iam_policy" "app" {\n  policy = jsonencode({ Statement = [{ Effect = "Allow", Action = ["s3:GetObject"], Resource = aws_s3_bucket.logs.arn }] })\n}', "critical",
         "IAM policy grants Action * on Resource *", "scope the policy to the actions and resources the app needs")]),
    "nginx": ("nginx.conf", "nginx", "server {\n    listen 443 ssl;\n    server_name app.example.com;", "    location / { proxy_pass http://app:8000; }\n}", [
        ("autoindex", "    autoindex on;", "    autoindex off;", "medium", "directory listing enabled", "set autoindex off"),
        ("tls", "    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;", "    ssl_protocols TLSv1.2 TLSv1.3;", "medium", "deprecated TLS 1.0/1.1 enabled",
         "allow only TLSv1.2 and TLSv1.3"),
        ("tokens", "    server_tokens on;", "    server_tokens off;", "low", "nginx version disclosed in headers", "set server_tokens off"),
        ("git", "    location /.git { root /srv/app; }", "    location ~ /\\.git { deny all; }", "high", ".git directory served publicly",
         "deny access to /.git and remove it from the web root")]),
    "django": ("settings.py", "python", "INSTALLED_APPS = [\"django.contrib.auth\", \"shop\"]", 'ROOT_URLCONF = "shop.urls"', [
        ("debug", "DEBUG = True", "DEBUG = False", "high", "DEBUG = True in production settings (stack traces and settings leak)", "set DEBUG = False"),
        ("hosts", 'ALLOWED_HOSTS = ["*"]', 'ALLOWED_HOSTS = ["shop.example.com"]', "medium", "ALLOWED_HOSTS accepts any Host header",
         "list the real hostnames"),
        ("cookie", "SESSION_COOKIE_SECURE = False", "SESSION_COOKIE_SECURE = True", "medium", "session cookie sent over plain HTTP",
         "set SESSION_COOKIE_SECURE = True"),
        ("cors", "CORS_ALLOW_ALL_ORIGINS = True\nCORS_ALLOW_CREDENTIALS = True", "CORS_ALLOWED_ORIGINS = [\"https://shop.example.com\"]", "high",
         "CORS allows every origin with credentials", "allow-list trusted origins only")]),
    "express": ("server.js", "javascript", 'const express = require("express");\nconst app = express();', "app.listen(process.env.PORT);", [
        ("cors", 'app.use(cors({ origin: true, credentials: true }));', 'app.use(cors({ origin: ["https://app.example.com"], credentials: true }));', "high",
         "CORS reflects any origin while allowing credentials", "restrict origin to an allow-list"),
        ("session", 'app.use(session({ secret: "keyboard cat", cookie: { secure: false } }));',
         'app.use(session({ secret: process.env.SESSION_SECRET, cookie: { secure: true, httpOnly: true } }));', "high",
         "hardcoded session secret and insecure cookie", "load the secret from the environment and set secure/httpOnly"),
        ("helmet", 'app.disable("etag");', 'app.use(helmet());', "low", "no security headers middleware (helmet)", "add helmet()"),
        ("limit", 'app.post("/login", login);', 'app.post("/login", rateLimit({ windowMs: 60000, max: 10 }), login);', "medium",
         "login endpoint has no rate limiting (credential stuffing)", "add a rate limiter to /login")]),
    "openapi": ("openapi.yaml", "yaml", "openapi: 3.0.3\ninfo: { title: Billing API, version: 1.2.0 }", "components:\n  securitySchemes:\n    bearer: { type: http, scheme: bearer }", [
        ("http", "servers:\n  - url: http://api.example.com/v1", "servers:\n  - url: https://api.example.com/v1", "high",
         "API served over plain HTTP (tokens in clear text)", "serve only over HTTPS"),
        ("admin", "paths:\n  /admin/users:\n    get:\n      security: []", "paths:\n  /admin/users:\n    get:\n      security: [{ bearer: [] }]", "critical",
         "admin endpoint /admin/users declared with no authentication", "require bearer auth and an admin role"),
        ("idor", "  /invoices/{id}:\n    get:\n      description: returns any invoice by numeric id", "  /invoices/{id}:\n    get:\n      description: returns the caller's invoice; ownership checked", "high",
         "invoice lookup by sequential id without an ownership check (IDOR)", "enforce object-level authorisation"),
        ("apikey", "  /export:\n    get:\n      parameters:\n      - { name: api_key, in: query }", "  /export:\n    get:\n      security: [{ bearer: [] }]", "medium",
         "API key passed in the query string (logged by proxies)", "move the credential to an Authorization header")]),
}


def config_scenario(rng, tid, n_bad):
    fname, lang, head, foot, checks = C[tid]
    picks = rng.sample(checks, min(len(checks), rng.randint(max(2, n_bad), len(checks))))
    bad = set(rng.sample(range(len(picks)), min(n_bad, len(picks))))
    lines, findings, traps = [head], [], []
    for i, (key, insecure, secure, sev, title, fix) in enumerate(picks):
        line_no = "\n".join(lines).count("\n") + 2
        lines.append(insecure if i in bad else secure)
        item = {"sev": sev, "loc": f"{fname} line {line_no}", "ref": None, "title": title, "fix": fix, "kind": "config"}
        (findings if i in bad else traps).append(item)
    if foot:
        lines.append(foot)
    return {"category": "config", "entity": [f"cfg:{tid}"], "files": [(fname, lang, "\n".join(lines))],
            "findings": findings, "traps": traps}
