import { sampleHawaiiTrip, sampleTrip } from "./sample-trip";
import type { PublishedGuide } from "./guide-types";
import { inferRoutePoints } from "./route-points";

export const featuredPublishedGuides: PublishedGuide[] = [
  {
    id: "leaves-southwest-loop",
    title: "From red rock to neon",
    destination: "American Southwest",
    author: "She Leaves Notes",
    tripDate: "April–May 2026",
    duration: "6 days",
    actualCost: "$2,500 for two",
    summary: "Vegas, Zion, Bryce, Page, Monument Valley and the Grand Canyon in a tight six-day loop—with an honest warning about how much time disappears behind the wheel.",
    story: "This route was driven from the Bay Area and revised repeatedly around The Wave lottery. It worked in six days, but seven gives Monument Valley and Bryce the daylight they deserve.",
    bestFor: "Travelers who want five iconic parks and are willing to make an explicit time-versus-cost choice.",
    highlights: ["Zion and Bryce in one sweep", "Antelope Canyon timed entry", "Monument Valley sunset", "Grand Canyon sunrise"],
    tips: ["Add a seventh day if you can", "Book Antelope Canyon and Monument Valley lodging early", "Do not count a nine-hour drive as a sightseeing day"],
    sourceUrl: "https://leavesnotes.com/posts/southwest-six-day-loop/",
    branch: { ...sampleTrip.branches[1], routePoints: inferRoutePoints("American Southwest Zion Bryce Page The Wave Monument Valley Grand Canyon", "Drive my car", "extra-day") },
    forkInput: sampleTrip.originalInput!,
    publishedAt: "2026-04-30T00:00:00.000Z",
    editorVerified: true,
  },
  {
    id: "leaves-hawaii-big-island",
    title: "Above the volcano, beneath the Milky Way",
    destination: "Hawaii Big Island",
    author: "She Leaves Notes",
    tripDate: "February 2026",
    duration: "7 days",
    actualCost: "$4,000 for two",
    summary: "A Kona–Hilo loop with manta rays, sea turtles, Mauna Kea sunset and a flexible window for Volcanoes National Park.",
    story: "The useful part of this itinerary is not one perfect order. It is keeping both coasts fixed while one evening stays movable for summit weather or volcanic activity.",
    bestFor: "Travelers who want wildlife and volcanic landscapes without rebuilding the whole week when conditions change.",
    highlights: ["Night manta-ray experience", "Volcanoes National Park", "Mauna Kea sunset", "Hilo waterfalls"],
    tips: ["Keep one evening unbooked", "Carry warm layers for the summit", "Use official conditions before changing the route"],
    sourceUrl: "https://leavesnotes.com/posts/hawaii-big-island-week/",
    branch: { ...sampleHawaiiTrip.branches[0], routePoints: inferRoutePoints("Hawaii Big Island Kona Volcano Mauna Kea Hilo Waimea", "Fly + rental car", "weather-first") },
    forkInput: sampleHawaiiTrip.originalInput!,
    publishedAt: "2026-02-23T00:00:00.000Z",
    editorVerified: true,
  },
];

export function findFeaturedGuide(id: string) {
  return featuredPublishedGuides.find((guide) => guide.id === id);
}
