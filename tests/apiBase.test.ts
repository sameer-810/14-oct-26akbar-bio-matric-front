import test from "node:test";
import assert from "node:assert/strict";
import { apiBase } from "../src/config/apiBase";

test("the API address always ends in /api/v1, however the host's setting was typed", () => {
  assert.equal(apiBase("https://x.onrender.com"), "https://x.onrender.com/api/v1");
  assert.equal(apiBase("https://x.onrender.com/"), "https://x.onrender.com/api/v1");
  assert.equal(apiBase("https://x.onrender.com/api/v1"), "https://x.onrender.com/api/v1");
  assert.equal(apiBase(" https://x.onrender.com/api/v1/ "), "https://x.onrender.com/api/v1");
  assert.equal(apiBase(""), "");
});
