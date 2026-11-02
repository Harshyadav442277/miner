"""General machine-verdict variants, independent of any provider's schema."""
import json

from build_pairs import norm
from build_query_binding import answer


def varied_answer(q, hit, entry, fmt, rng, snapshot):
    text = answer(q, hit, entry, fmt, rng, snapshot)
    if fmt == "prose":
        return text
    body = json.loads(text)
    value = body.pop("matched")
    field = rng.choice(("matched", "match", "on_list", "sanctioned", "verdict"))
    claim = ("match" if value else "no_match") if field == "verdict" else int(value) if rng.randrange(2) else value
    # Keep the claim early; its spelling/value type varies independently of truth.
    items = list(body.items())
    body = dict(items[:1] + [(field, claim)] + items[1:])
    for record in body.get("matches", []):
        if norm(q) != norm(entry["name"]):
            record.update(matched_alias=q, match_type="normalized_exact_alias")
    return json.dumps(body, ensure_ascii=False)
