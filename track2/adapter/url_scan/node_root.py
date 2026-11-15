"""The node's batch input_root (remote.BatchInputRoot), ported from track2/adapter/check_executor.py
on branch claude/evaluators-status-a51518."""
import hashlib


def sha256_hex(s):
    return hashlib.sha256(s.encode()).hexdigest()


def encode_input(ids):
    """runtime.EncodeFloatInput."""
    return '{"input_ids":[%s],"attention_mask":[%s]}' % (",".join(map(str, ids)), ",".join("1" for _ in ids))


def batch_input_root(batch):
    leaves = sorted(f"{i}:{sha256_hex(encode_input(ids))}" for i, ids in enumerate(batch))
    return sha256_hex("\n".join(leaves))
