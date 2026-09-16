import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.mjs";

const MODULE = `#!name = Fetch test\n[Rule]\nDOMAIN,example.com,REJECT`;

async function inspect(url, env = {}) {
  return worker.fetch(new Request("https://anywhere.example/api/inspect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  }), env);
}

test("Kelee sources use the configured Loon User-Agent", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  let request;
  globalThis.fetch = async (input, init) => {
    request = { input: String(input), init };
    return new Response(MODULE, { status: 200 });
  };

  const response = await inspect("https://rule.kelee.one/Loon/Test.lpx", {
    KELEE_LOON_USER_AGENT: "Loon/test-build",
    FETCH_CACHE_TTL_SECONDS: "0",
  });

  assert.equal(response.status, 200);
  assert.equal(request.input, "https://rule.kelee.one/Loon/Test.lpx");
  assert.equal(request.init.headers["user-agent"], "Loon/test-build");
  assert.equal(request.init.headers.accept, "*/*");
});

test("ordinary sources keep the converter User-Agent", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  let headers;
  globalThis.fetch = async (_input, init) => {
    headers = init.headers;
    return new Response(MODULE, { status: 200 });
  };

  const response = await inspect("https://example.com/Test.sgmodule", {
    KELEE_LOON_USER_AGENT: "Loon/test-build",
    FETCH_CACHE_TTL_SECONDS: "0",
  });

  assert.equal(response.status, 200);
  assert.equal(headers["user-agent"], "AnywhereModuleConverter/0.1");
  assert.equal(headers.accept, undefined);
});
