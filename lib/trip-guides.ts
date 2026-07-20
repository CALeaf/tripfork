import type { Locale } from "./i18n";
import type { TripInput } from "./trip-types";

type LocalizedText = Record<Locale, string>;

export type TripGuide = {
  id: string;
  tone: "desert" | "island" | "coast";
  title: LocalizedText;
  kicker: LocalizedText;
  summary: LocalizedText;
  route: LocalizedText;
  duration: LocalizedText;
  bestFor: LocalizedText;
  highlights: Record<Locale, string[]>;
  input: Record<Locale, TripInput>;
};

export const tripGuides: TripGuide[] = [
  {
    id: "southwest-loop",
    tone: "desert",
    kicker: { en: "Permit-aware road trip", zh: "会跟着抽签结果变化的环线" },
    title: { en: "Southwest Grand Circle", zh: "美西国家公园大环线" },
    summary: {
      en: "Compare a full Bay Area road trip with flying into Las Vegas—and keep a branch ready if The Wave permit comes through.",
      zh: "比较从湾区全程自驾和飞到拉斯维加斯再租车；如果抽中 The Wave，也提前留好能切换的路线。",
    },
    route: { en: "Bay Area · Zion · Bryce · Page · Monument Valley · Grand Canyon", zh: "湾区 · 锡安 · 布莱斯 · 佩吉 · 纪念碑谷 · 大峡谷" },
    duration: { en: "6–7 days", zh: "6–7 天" },
    bestFor: { en: "National parks + one uncertain permit", zh: "想多看国家公园，又有一个抽签项目" },
    highlights: {
      en: ["Drive vs fly + rental", "The Wave contingency", "Long-drive reality check"],
      zh: ["全程自驾 vs 飞机 + 租车", "The Wave 备选路线", "长途驾驶强度对比"],
    },
    input: {
      en: {
        title: "Southwest loop with a Wave contingency", destination: "Utah and Arizona Grand Circle", dates: "6–7 days", travelers: "2 travelers", budget: "$2,500", origin: "San Francisco Bay Area",
        notes: "Drive from the Bay Area to Las Vegas, then loop through Zion, Bryce, Page, Monument Valley and Grand Canyon before returning home.",
        places: "Las Vegas, Zion, Bryce, Page, The Wave, Antelope Canyon, Monument Valley, Grand Canyon", mustHaves: "Zion, Bryce, Antelope Canyon, Monument Valley and Grand Canyon", fixedBookings: "Return home by Sunday night", lockedItems: "Six-day core window", movableItems: "Page hotel, Monument Valley day, Grand Canyon sunrise", optionalItems: "Lake Powell and a Las Vegas evening", transportModes: ["Drive my car", "Fly + rental car"], uncertainty: "The Wave permit lottery", decisionDate: "Before free cancellation ends", constraints: "Avoid another long night drive",
      },
      zh: {
        title: "有 The Wave 备选路线的美西环线", destination: "美西国家公园大环线", dates: "6–7 天", travelers: "2 人", budget: "$2,500", origin: "旧金山湾区",
        notes: "从湾区到拉斯维加斯，再走锡安、布莱斯、佩吉、纪念碑谷和大峡谷，最后回到湾区。想比较全程自己开车和飞到拉斯维加斯再租车。",
        places: "拉斯维加斯、锡安、布莱斯、佩吉、The Wave、羚羊谷、纪念碑谷、大峡谷", mustHaves: "锡安、布莱斯、羚羊谷、纪念碑谷和大峡谷", fixedBookings: "周日晚前必须到家", lockedItems: "核心行程只有 6 天", movableItems: "佩吉住宿、纪念碑谷安排在哪天、大峡谷日出", optionalItems: "鲍威尔湖、拉斯维加斯夜游", transportModes: ["Drive my car", "Fly + rental car"], uncertainty: "The Wave 抽签结果", decisionDate: "免费取消截止前", constraints: "尽量不要再加一个开夜路的长途驾驶日",
      },
    },
  },
  {
    id: "big-island",
    tone: "island",
    kicker: { en: "Weather-flexible island week", zh: "给天气留余地的海岛行程" },
    title: { en: "Hawaii Big Island", zh: "夏威夷大岛 7 日" },
    summary: {
      en: "Hold the two coasts steady while one evening moves with volcano and summit conditions.",
      zh: "科纳和希洛的住宿尽量不动，只留一个晚上跟着火山和山顶天气调整。",
    },
    route: { en: "Kona · Volcano · Mauna Kea · Hilo · Waimea", zh: "科纳 · 火山公园 · 冒纳凯阿 · 希洛 · 威美亚" },
    duration: { en: "7 days", zh: "7 天" },
    bestFor: { en: "Wildlife, volcanoes and changing weather", zh: "想看海洋生物、火山，又怕天气有变化" },
    highlights: {
      en: ["Movable summit evening", "Volcano fallback", "Coast-first low-fatigue plan"],
      zh: ["山顶日落可换时间", "火山情况不好时的备选", "更轻松的海岸路线"],
    },
    input: {
      en: {
        title: "Big Island weather-flex week", destination: "Hawaii Big Island", dates: "7 days", travelers: "2 travelers", budget: "$4,000", origin: "Kona airport",
        notes: "Start on the Kona coast, stay near Volcano, continue to Hilo and return through Waimea. Keep one evening movable for the clearest Mauna Kea or eruption-viewing window.",
        places: "Kona, manta rays, Volcanoes National Park, Mauna Kea, Hilo, waterfalls, Waimea, Hapuna Beach", mustHaves: "Manta rays, daytime volcano park, waterfalls and one good sunset", fixedBookings: "Kona arrival and departure flights", lockedItems: "Seven-day trip and the first two Kona nights", movableItems: "Mauna Kea evening and one Hilo afternoon", optionalItems: "A second volcano visit and one beach stop", transportModes: ["Fly + rental car", "Let TripFork suggest"], uncertainty: "Volcano activity and summit weather", decisionDate: "Check 48 hours before", constraints: "Avoid crossing the island twice on the same day",
      },
      zh: {
        title: "能看天气调整的夏威夷大岛 7 日", destination: "夏威夷大岛", dates: "7 天", travelers: "2 人", budget: "$4,000", origin: "科纳机场",
        notes: "先玩科纳海岸，再住火山公园附近，然后去希洛，最后经过威美亚回科纳。留一个晚上，根据天气决定去冒纳凯阿还是看火山。",
        places: "科纳、魔鬼鱼、火山国家公园、冒纳凯阿、希洛、瀑布、威美亚、哈普纳海滩", mustHaves: "夜潜魔鬼鱼、白天逛火山公园、瀑布和一次好看的日落", fixedBookings: "科纳往返机票", lockedItems: "一共 7 天，前两晚住科纳", movableItems: "冒纳凯阿那晚、希洛的一个下午", optionalItems: "第二次去火山、一个海滩", transportModes: ["Fly + rental car", "Let TripFork suggest"], uncertainty: "火山情况和山顶天气", decisionDate: "提前 48 小时再看", constraints: "尽量不要一天横穿大岛两次",
      },
    },
  },
  {
    id: "pacific-coast",
    tone: "coast",
    kicker: { en: "Classic coastal drive", zh: "经典海岸公路" },
    title: { en: "California Highway 1", zh: "加州一号公路" },
    summary: {
      en: "Compare a one-way coastal drive with a round trip, and see what changes if Highway 1 access or time gets tight.",
      zh: "比较单程自驾和往返自驾；如果一号公路有路段不好走，或者时间变紧，也能看清要怎么改。",
    },
    route: { en: "San Francisco · Monterey · Big Sur · Santa Barbara · Los Angeles", zh: "旧金山 · 蒙特雷 · 大苏尔 · 圣塔芭芭拉 · 洛杉矶" },
    duration: { en: "5–6 days", zh: "5–6 天" },
    bestFor: { en: "Ocean views without marathon driving", zh: "想看海景，但不想每天都开很久" },
    highlights: {
      en: ["One-way vs round trip", "Road-closure fallback", "Under 5 hours driving a day"],
      zh: ["单程 vs 往返", "封路时的备选", "每天尽量少于 5 小时驾驶"],
    },
    input: {
      en: {
        title: "Highway 1 without rushed driving", destination: "California coast", dates: "5–6 days", travelers: "2 travelers", budget: "$2,200", origin: "San Francisco",
        notes: "Start in San Francisco and follow the coast through Monterey, Carmel, Big Sur, San Luis Obispo and Santa Barbara to Los Angeles. Compare returning the car in LA with driving back north.",
        places: "Monterey, Carmel, Big Sur, San Luis Obispo, Santa Barbara, Los Angeles", mustHaves: "Big Sur viewpoints, one slow coast day and Santa Barbara", fixedBookings: "Start in San Francisco", lockedItems: "At least one full day around Big Sur", movableItems: "Monterey and San Luis Obispo nights", optionalItems: "Los Angeles city day", transportModes: ["Drive my car", "Fly + rental car"], uncertainty: "Highway closures and one-way versus round-trip logistics", decisionDate: "Before booking the final hotel", constraints: "Avoid more than five hours of driving per day",
      },
      zh: {
        title: "不赶路的加州一号公路", destination: "加州海岸", dates: "5–6 天", travelers: "2 人", budget: "$2,200", origin: "旧金山",
        notes: "从旧金山出发，沿海经过蒙特雷、卡梅尔、大苏尔、圣路易斯奥比斯波和圣塔芭芭拉，最后到洛杉矶。想比较洛杉矶异地还车和自己再开回北加州。",
        places: "蒙特雷、卡梅尔、大苏尔、圣路易斯奥比斯波、圣塔芭芭拉、洛杉矶", mustHaves: "大苏尔观景点、一天慢慢走海岸、圣塔芭芭拉", fixedBookings: "从旧金山出发", lockedItems: "大苏尔附近至少留完整一天", movableItems: "蒙特雷和圣路易斯奥比斯波住哪天", optionalItems: "洛杉矶市区一天", transportModes: ["Drive my car", "Fly + rental car"], uncertainty: "一号公路路况，以及单程还是往返更合适", decisionDate: "订最后一晚住宿前", constraints: "每天尽量不要开超过 5 小时",
      },
    },
  },
];
