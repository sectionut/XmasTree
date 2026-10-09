// Xmas Tree protocol helpers (shared by the page and the tests).
(function (g) {
  "use strict";
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const UUIDS = {
    service: "e2f00001-5b1c-4d7a-9e3f-8c6a1b2d4f50",
    challenge: "e2f00002-5b1c-4d7a-9e3f-8c6a1b2d4f50",
    command: "e2f00003-5b1c-4d7a-9e3f-8c6a1b2d4f50",
    status: "e2f00004-5b1c-4d7a-9e3f-8c6a1b2d4f50",
  };

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // PBKDF2-HMAC-SHA256(password, salt, iters) -> 32-byte key
  async function deriveKey(password, saltHex, iters) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: iters },
      base, 256);
    return new Uint8Array(bits);
  }

  async function hmacHex(keyBytes, message) {
    const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(message))));
  }

  // One signed command frame, newline-terminated, as bytes.
  async function buildFrame(keyBytes, nonce, seq, payload) {
    const p = JSON.stringify(payload);
    const m = await hmacHex(keyBytes, `${nonce}:${seq}:${p}`);
    return enc.encode(JSON.stringify({ s: seq, p, m }) + "\n");
  }

  function parseJson(dataView) {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    return JSON.parse(dec.decode(bytes));
  }

  g.TreeProto = { UUIDS, hexToBytes, bytesToHex, deriveKey, hmacHex, buildFrame, parseJson };
})(typeof window !== "undefined" ? window : globalThis);
