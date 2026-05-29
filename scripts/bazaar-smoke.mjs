const baseUrl = (process.argv[2] ?? "https://api.callbsman.com").replace(/\/+$/, "");
const analyzeUrl = `${baseUrl}/v1/analyze`;
const expectedPayTo = "0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1";
const expectedAsset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const sampleBody = {
  mode: "agent_action_check",
  input:
    "The user wants to send 250 USDC to an unknown wallet after a Telegram investment offer promising guaranteed returns.",
  context: {
    proposed_action: "send_payment",
    asset: "USDC",
    amount: "250",
    recipient_type: "unknown_wallet",
    channel: "telegram",
    verification_status: "unverified"
  },
  language: "en",
  locale: "US"
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, received: ${text.slice(0, 160)}`);
  }
}

async function checkFreeEndpoint(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.status === 200, `${path} expected 200, got ${response.status}`);
  console.log(`PASS ${path} is free`);
}

function checkPaymentBody(body, label) {
  assert(body.x402Version === 2, `${label} body missing x402Version=2`);
  assert(body.resource?.url === analyzeUrl, `${label} body resource.url mismatch`);
  assert(body.accepts?.[0]?.amount === "1000", `${label} body amount mismatch`);
  assert(body.accepts?.[0]?.asset === expectedAsset, `${label} body asset mismatch`);
  assert(body.accepts?.[0]?.payTo === expectedPayTo, `${label} body payTo mismatch`);
  assert(body.extensions?.bazaar?.name === "Call BS Man API", `${label} Bazaar name missing`);
  assert(body.extensions?.bazaar?.serviceName === "Call BS Man API", `${label} serviceName missing`);
  assert(body.extensions?.bazaar?.iconUrl, `${label} iconUrl missing`);
}

async function checkUnpaidAnalyze(method) {
  const response = await fetch(analyzeUrl, {
    method,
    headers: method === "POST" ? { "content-type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(sampleBody) : undefined
  });
  assert(response.status === 402, `${method} /v1/analyze expected 402, got ${response.status}`);
  assert(response.headers.get("payment-required"), `${method} /v1/analyze missing PAYMENT-REQUIRED header`);
  const body = await readJson(response);
  checkPaymentBody(body, `${method} /v1/analyze`);
  console.log(`PASS ${method} /v1/analyze returns x402 challenge with Bazaar identity`);
}

async function checkWellKnown() {
  const response = await fetch(`${baseUrl}/.well-known/x402`);
  assert(response.status === 200, `/.well-known/x402 expected 200, got ${response.status}`);
  const body = await readJson(response);
  assert(body.name === "Call BS Man API", "well-known name mismatch");
  assert(body.description, "well-known description missing");
  assert(body.serviceName === "Call BS Man API", "well-known serviceName missing");
  assert(body.iconUrl, "well-known iconUrl missing");
  assert(body.accepts?.[0]?.payTo === expectedPayTo, "well-known payTo mismatch");
  console.log("PASS /.well-known/x402 is Bazaar-shaped");
}

async function main() {
  console.log(`Bazaar smoke check: ${baseUrl}`);
  await checkFreeEndpoint("/");
  await checkFreeEndpoint("/health");
  await checkWellKnown();
  await checkUnpaidAnalyze("GET");
  await checkUnpaidAnalyze("POST");
  console.log("\nAll unpaid discovery checks passed.");
  console.log("Next paid check: run an AgentCash fetch, then x402trace bazaar-check.");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
