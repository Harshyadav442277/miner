"""Offline tests for the untrusted-URL guard (no network: the resolver is faked)."""
import socket
import tempfile
import unittest
from unittest import mock

import safe_fetch
from safe_fetch import UnsafeURL, check_url, fetch, output_path


def fake_resolve(table):
    def resolve(host, port, proto=0):
        if host not in table:
            raise socket.gaierror("unknown host")
        return [(socket.AF_INET, socket.SOCK_STREAM, proto, "", (ip, port)) for ip in table[host]]
    return resolve


RESOLVE = fake_resolve({"good.example.com": ["93.184.215.14"], "rebind.example.com": ["93.184.215.14", "10.1.2.3"],
                        "inner.example.com": ["192.168.1.5"], "shared.example.com": ["100.64.0.9"]})


class CheckURL(unittest.TestCase):
    def refused(self, url):
        with self.assertRaises(UnsafeURL):
            check_url(url, RESOLVE)

    def test_file_scheme(self):
        self.refused("file:///C:/Windows/win.ini")

    def test_http_loopback(self):
        self.refused("http://127.0.0.1/")

    def test_https_literal_private(self):
        self.refused("https://10.0.0.1/")
        self.refused("https://127.0.0.1/")
        self.refused("https://169.254.169.254/latest/meta-data/")
        self.refused("https://[::1]/")
        self.refused("https://224.0.0.1/")

    def test_option_injection(self):
        self.refused("-o C:/Users/x/evil")
        self.refused("--config")
        self.refused("-oC:/x")

    def test_private_resolution(self):
        self.refused("https://inner.example.com/")
        self.refused("https://rebind.example.com/")  # any non-public address refuses
        self.refused("https://shared.example.com/")

    def test_other_schemes_and_shapes(self):
        self.refused("http://good.example.com/")
        self.refused("ftp://good.example.com/")
        self.refused("https:///nohost")
        self.refused("https://user:pw@good.example.com/")
        self.refused("https://good.example.com/a b")

    def test_good_https(self):
        self.assertEqual(check_url("https://good.example.com/x?url=a", RESOLVE),
                         ("good.example.com", 443, "93.184.215.14"))


class Fetch(unittest.TestCase):
    def test_refused_url_never_runs_curl(self):
        with mock.patch.object(safe_fetch.subprocess, "run") as run:
            rec = fetch("file:///etc/passwd", resolve=RESOLVE)
        run.assert_not_called()
        self.assertTrue(rec["error"].startswith("refused"))

    def test_bad_method(self):
        with mock.patch.object(safe_fetch.subprocess, "run") as run:
            rec = fetch("https://good.example.com/", method="DELETE", resolve=RESOLVE)
        run.assert_not_called()
        self.assertIn("method", rec["error"])

    def test_redirect_to_private_is_refused(self):
        reply = mock.Mock(returncode=0, stdout=b"\n302\nhttps://inner.example.com/", stderr=b"")
        with mock.patch.object(safe_fetch.subprocess, "run", return_value=reply) as run:
            rec = fetch("https://good.example.com/", resolve=RESOLVE)
        self.assertEqual(run.call_count, 1)
        self.assertIn("non-public", rec["error"])
        argv = run.call_args[0][0]
        self.assertEqual(argv[-2:], ["--url", "https://good.example.com/"])
        self.assertIn("=https", argv)
        self.assertNotIn("-L", argv)


class OutputPath(unittest.TestCase):
    def test_ids(self):
        with tempfile.TemporaryDirectory() as out:
            self.assertEqual(output_path(out, "4433").name, "miner-4433.json")
            for bad in ("../x", "..\\x", "4433/../../x", "a b", "", None, 11):
                with self.assertRaises(UnsafeURL):
                    output_path(out, bad)


if __name__ == "__main__":
    unittest.main()
