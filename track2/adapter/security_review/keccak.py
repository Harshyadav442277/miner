"""Ethereum keccak256 (original Keccak padding, not SHA3-256) in pure Python, for package
identity when no adapterbuild manifest exists. Self-test: keccak256(b"") ==
c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470."""
import sys

RC = [0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000, 0x000000000000808B,
      0x0000000080000001, 0x8000000080008081, 0x8000000000008009, 0x000000000000008A, 0x0000000000000088,
      0x0000000080008009, 0x000000008000000A, 0x000000008000808B, 0x800000000000008B, 0x8000000000008089,
      0x8000000000008003, 0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
      0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008]
ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]]
M = (1 << 64) - 1


def rol(x, n):
    return ((x << n) | (x >> (64 - n))) & M if n else x


def f(s):
    for rc in RC:
        c = [s[x][0] ^ s[x][1] ^ s[x][2] ^ s[x][3] ^ s[x][4] for x in range(5)]
        d = [c[(x - 1) % 5] ^ rol(c[(x + 1) % 5], 1) for x in range(5)]
        s = [[s[x][y] ^ d[x] for y in range(5)] for x in range(5)]
        b = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                b[y][(2 * x + 3 * y) % 5] = rol(s[x][y], ROT[x][y])
        s = [[b[x][y] ^ ((~b[(x + 1) % 5][y]) & b[(x + 2) % 5][y]) for y in range(5)] for x in range(5)]
        s[0][0] ^= rc
    return s


def keccak256(data):
    rate = 136
    data = bytearray(data) + b"\x01"
    data += b"\x00" * (-len(data) % rate)
    data[-1] |= 0x80
    s = [[0] * 5 for _ in range(5)]
    for off in range(0, len(data), rate):
        block = data[off:off + rate]
        for i in range(rate // 8):
            s[i % 5][i // 5] ^= int.from_bytes(block[8 * i:8 * i + 8], "little")
        s = f(s)
    out = b"".join(s[i % 5][i // 5].to_bytes(8, "little") for i in range(4))
    return out.hex()


if __name__ == "__main__":
    assert keccak256(b"") == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
    for p in sys.argv[1:]:
        print(keccak256(open(p, "rb").read()), p)
