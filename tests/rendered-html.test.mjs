import assert from "node:assert/strict";
import test from "node:test";

async function request(pathname = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the TripFork decision workspace", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>TripFork/);
  assert.match(html, /Compare every way/);
  assert.match(html, /What if we win The Wave/);
  assert.match(html, /Keep the 6-day loop/);
  assert.match(html, /Win \+ fly to Vegas/);
  assert.match(html, /Every tradeoff, side by side/);
  assert.match(html, /Estimated cost/);
  assert.match(html, /Trip pace/);
  assert.match(html, /Door-to-door transit/);
  assert.match(html, /Luggage freedom/);
  assert.match(html, /Fork a new trip/);
  assert.match(html, />中文</);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("returns a Chinese comparison when Chinese is selected", async () => {
  const response = await request("/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locale: "zh",
      trip: {
        title: "美西交通对比",
        destination: "犹他和亚利桑那",
        dates: "6 天",
        travelers: "2 人",
        budget: "$3,000",
        origin: "旧金山",
        notes: "第一天开车到拉斯维加斯，之后游览锡安、布莱斯、佩吉和大峡谷，周日晚回家。",
        places: "锡安、布莱斯、佩吉、大峡谷",
        mustHaves: "锡安和大峡谷",
        fixedBookings: "周五下午 1:15 羚羊谷",
        lockedItems: "周日晚回家",
        movableItems: "布莱斯日出",
        optionalItems: "鲍威尔湖",
        transportModes: ["Drive my car", "Fly + rental car"],
        uncertainty: "",
        decisionDate: "预订前",
        constraints: "避免连续两天驾驶九小时",
      },
    }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.source, "demo");
  assert.deepEqual(
    payload.trip.branches.map((branch) => branch.transportMode),
    ["自驾", "飞机 + 租车"],
  );
  assert.match(payload.trip.recommendations.pending.rationale, /门到门时间/);
});

test("builds transport branches from an existing itinerary", async () => {
  const response = await request("/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      trip: {
        title: "Southwest transport test",
        destination: "Utah and Arizona",
        dates: "6 days",
        travelers: "2 travelers",
        budget: "$3,000",
        origin: "San Francisco",
        notes: "Day 1 drive to Las Vegas, then visit Zion, Bryce, Page and Grand Canyon before returning home.",
        places: "Zion, Bryce, Page, Grand Canyon",
        mustHaves: "Zion and Grand Canyon",
        fixedBookings: "Antelope Canyon Friday at 1:15 PM",
        lockedItems: "Return home Sunday night",
        movableItems: "Bryce sunrise",
        optionalItems: "Lake Powell",
        transportModes: ["Drive my car", "Fly + rental car"],
        uncertainty: "",
        decisionDate: "Before booking",
        constraints: "Avoid two consecutive nine-hour driving days",
      },
    }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.source, "demo");
  assert.deepEqual(
    payload.trip.branches.map((branch) => branch.transportMode),
    ["Drive my car", "Fly + rental car"],
  );
  assert.equal(payload.trip.inputSummary.existingPlan.includes("Las Vegas"), true);
  assert.equal(payload.trip.inputSummary.lockedItems.includes("Sunday night"), true);
});
