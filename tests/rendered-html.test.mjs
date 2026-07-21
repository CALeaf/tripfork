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
  assert.match(html, /Make one travel decision in 60 seconds/);
  assert.match(html, /Start the guided trial/);
  assert.match(html, /No sign-in · No typing · Real product/);
  assert.match(html, /What if we win The Wave/);
  assert.match(html, /Keep the 6-day loop/);
  assert.match(html, /Win \+ fly to Vegas/);
  assert.match(html, /Every tradeoff, side by side/);
  assert.match(html, /Estimated cost/);
  assert.match(html, /Trip pace/);
  assert.match(html, /Door-to-door transit/);
  assert.match(html, /Luggage freedom/);
  assert.match(html, /What matters most on this trip/);
  assert.match(html, /Overall fit/);
  assert.match(html, /Hawaii weather change/);
  assert.match(html, /Edit inputs/);
  assert.match(html, /Borrow an itinerary/);
  assert.match(html, /Southwest Grand Circle/);
  assert.match(html, /California Highway 1/);
  assert.match(html, /Use this itinerary/);
  assert.match(html, /Real routes you can make your own/);
  assert.match(html, /From red rock to neon/);
  assert.match(html, /Staggering giants/);
  assert.match(html, /Cloudy days, impossibly blue/);
  assert.match(html, /Snow at Lake Louise, kangaroos in Kelowna/);
  assert.match(html, /Publish as a guide/);
  assert.match(html, /Route at a glance/);
  assert.match(html, /Fork a new trip/);
  assert.match(html, />中文</);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("server-renders a public, forkable Leaves Notes guide", async () => {
  const response = await request("/guide/leaves-southwest-loop");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /From red rock to neon/);
  assert.match(html, /She Leaves Notes/);
  assert.match(html, /The version that was actually traveled/);
  assert.match(html, /Fork this trip/);
  assert.match(html, /Actual route/);
  assert.match(html, /Read the original story on She Leaves Notes/);
});

test("returns a featured guide that can be forked without sign-in", async () => {
  const response = await request("/api/guides?id=leaves-hawaii-big-island", { headers: { accept: "application/json" } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.guide.author, "She Leaves Notes");
  assert.equal(payload.guide.editorVerified, true);
  assert.equal(payload.guide.forkInput.destination, "Hawaii Big Island");
  assert.equal(payload.guide.branch.routePoints.length > 1, true);
});

test("serves every Leaves Notes post as a mapped, forkable guide", async () => {
  const guideIds = [
    "leaves-southwest-loop",
    "leaves-hawaii-big-island",
    "leaves-sequoia-kings-canyon",
    "leaves-kilauea-eruption-timing",
    "leaves-eastern-canada-loop",
    "leaves-yukon-tombstone",
    "leaves-toronto-niagara-no-car",
    "leaves-yellowstone-vancouver",
    "leaves-cancun-christmas",
    "leaves-banff-vancouver-loop",
  ];

  for (const id of guideIds) {
    const response = await request(`/api/guides?id=${id}`, { headers: { accept: "application/json" } });
    assert.equal(response.status, 200, id);
    const payload = await response.json();
    assert.equal(payload.guide.author, "She Leaves Notes", id);
    assert.match(payload.guide.sourceUrl, /^https:\/\/leavesnotes\.com\/posts\//, id);
    assert.equal(payload.guide.branch.routePoints.length > 1, true, id);
    assert.equal(payload.guide.forkInput.notes.length > 0, true, id);
  }
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
  assert.match(payload.trip.recommendations.pending.rationale, /从家出发到真正抵达/);
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
  assert.equal(payload.trip.originalInput.destination, "Utah and Arizona");
  assert.deepEqual(payload.trip.originalInput.transportModes, ["Drive my car", "Fly + rental car"]);
  assert.equal(payload.trip.branches.every((branch) => branch.routePoints.length >= 6), true);
  assert.equal(payload.trip.branches[0].routePoints.some((point) => point.label === "Grand Canyon"), true);
});

test("adds a distinct mapped route to a Highway 1 comparison", async () => {
  const response = await request("/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      trip: {
        destination: "California coast",
        notes: "Start in San Francisco and follow Highway 1 through Monterey, Big Sur and Santa Barbara to Los Angeles.",
        places: "Monterey, Big Sur, Santa Barbara, Los Angeles",
        transportModes: ["Drive my car", "Fly + rental car"],
      },
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.trip.branches[0].routePoints[0].label, "San Francisco");
  assert.equal(payload.trip.branches[0].routePoints.at(-1).label, "San Francisco");
  assert.equal(payload.trip.branches[1].routePoints.at(-1).label, "Los Angeles");
});
