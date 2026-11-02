"""Extract published deletion records and exclude explicitly consolidated targets."""
from html.parser import HTMLParser
import re

from collect_miners import norm


class NoticeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.tables = [], []
        self.tag, self.buf, self.table, self.row, self.cell = None, [], None, None, None

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "h1", "h2", "h3", "h4", "h5", "h6"):
            self.tag, self.buf = tag, []
        if tag == "br" and self.tag:
            self.buf.append("\n")
        if tag == "table":
            self.table = []
        if tag == "tr" and self.table is not None:
            self.row = []
        if tag in ("th", "td") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.tag:
            self.buf.append(data)
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == self.tag:
            self.blocks.append((tag, "".join(self.buf)))
            self.tag, self.buf = None, []
        if tag in ("th", "td") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.table.append(self.row)
            self.row = None
        if tag == "table" and self.table is not None:
            self.tables.append(self.table)
            self.table = None


def deletion_records(html):
    parser = NoticeParser()
    parser.feed(html)
    excluded = set()
    for table in parser.tables:
        if not any("retained uid" in " ".join(row).lower() for row in table):
            continue
        for row in table:
            for cell in row:
                if re.search(r"[A-Z]", cell) and not re.search("retained|deleted|sanctioned target", cell, re.I):
                    excluded.add(norm(cell))
    active, records = False, []
    for tag, block in parser.blocks:
        if tag.startswith("h"):
            active = "following deletions" in block.lower() and "sdn list" in block.lower()
        elif active and tag == "p":
            records.extend(" ".join(s.split()) for s in re.split(r"\n\s*\n", block) if s.strip())
    return records, excluded


def organization_names(record):
    if re.search(r"\(individual\)|\bDOB\b|\bIMO\b|\bvessel\b|\baircraft\b", record, re.I):
        return None
    alias = re.search(r" \((?:a|f|n)\.k\.a\. ", record)
    if alias:
        primary = record[:alias.start()].strip().strip('"')
    else:
        prefix = re.split(r";| \[", record, 1)[0]
        parts = prefix.split(", ")
        selected = [parts.pop(0)]
        while parts and re.fullmatch(r"(?:LTD\.?|INC\.?|S\.?A\.?|GMBH|LLC|L\.?L\.?C\.?|CORP\.?)", parts[0]):
            selected.append(parts.pop(0))
        primary = ", ".join(selected).strip().strip('"')
        if "(" in primary or ")" in primary:
            return None
    if not primary.isascii() or not primary.isupper() or not 4 <= len(primary) <= 160:
        return None
    names = [primary]
    if alias:
        start, depth, end = alias.start()+1, 0, None
        for i in range(start, len(record)):
            depth += record[i] == "("
            depth -= record[i] == ")"
            if depth == 0:
                end = i
                break
        if end is None:
            return None
        text = record[start+1:end]
        for name in re.split(r";\s*(?:(?:a|f|n)\.k\.a\.\s*)?", text):
            name = re.sub(r"^(?:a|f|n)\.k\.a\.\s*", "", name).strip().strip('"')
            if name.isascii() and name:
                names.append(name)
    return primary, list(dict.fromkeys(names))
