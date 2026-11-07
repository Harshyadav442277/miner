import json
cases = [
    ("https://nav.smartscreen.msft.net/phishingdemo.html", "the publisher designates this page as a phishing warning demonstration", False),
    ("http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/", "the publisher designates this URL as a malware warning test", False),
    ("https://example.com/manual", "the controlled fixture contains only a static manual and has no redirects", True),
    ("https://example.org/release", "the controlled fixture contains only static release notes and has no form", True),
    ("https://downloads.example.net/installer", "the controlled fixture returns a file matching the scanner's malware test signature", False),
    ("https://login.example.org/session", "the controlled fixture posts credentials to an unrelated host", False),
    ("https://docs.example.com/security", "the controlled fixture serves a static page and has no external frame", True),
    ("https://status.example.net/current", "the controlled fixture serves a static status page with no download", True),
]
for index, (url, evidence, safe) in enumerate(cases):
    other = cases[index ^ 1][0]
    prompt = f"Is {url} safe to open? In this test the scanner observed that {evidence}."
    def answer(target, verdict):
        return json.dumps({"url": target, "safe": verdict, "evidence": evidence})
    for kind, wrong in (("verdict flip", answer(url, not safe)), ("wrong URL", answer(other, safe))):
        print(json.dumps({"prompt":prompt, "chosen":answer(url, safe), "rejected":wrong,"kind":kind}))
