import type { RoutePoint } from "./trip-types";

const southwest = {
  bay: { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  vegas: { label: "Las Vegas", lat: 36.1699, lng: -115.1398 },
  zion: { label: "Zion", lat: 37.2982, lng: -113.0263 },
  bryce: { label: "Bryce Canyon", lat: 37.6283, lng: -112.1677 },
  page: { label: "Page", lat: 36.9147, lng: -111.4558 },
  wave: { label: "The Wave", lat: 36.995, lng: -112.006 },
  monument: { label: "Monument Valley", lat: 36.998, lng: -110.098 },
  canyon: { label: "Grand Canyon", lat: 36.0544, lng: -112.1401 },
};

const hawaii = {
  kona: { label: "Kona", lat: 19.6400, lng: -155.9969 },
  volcano: { label: "Volcano", lat: 19.4194, lng: -155.2885 },
  mauna: { label: "Mauna Kea", lat: 19.7590, lng: -155.4567 },
  hilo: { label: "Hilo", lat: 19.7074, lng: -155.0885 },
  waimea: { label: "Waimea", lat: 20.0231, lng: -155.6717 },
  hapuna: { label: "Hapuna Beach", lat: 19.9934, lng: -155.8254 },
};

const coast = {
  sf: { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  monterey: { label: "Monterey", lat: 36.6002, lng: -121.8947 },
  bigSur: { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
  slo: { label: "San Luis Obispo", lat: 35.2828, lng: -120.6596 },
  santaBarbara: { label: "Santa Barbara", lat: 34.4208, lng: -119.6982 },
  la: { label: "Los Angeles", lat: 34.0522, lng: -118.2437 },
};

function localize(points: RoutePoint[], locale: "en" | "zh"): RoutePoint[] {
  if (locale === "en") return points;
  const labels: Record<string, string> = {
    "San Francisco": "旧金山", "Las Vegas": "拉斯维加斯", Zion: "锡安", "Bryce Canyon": "布莱斯", Page: "佩吉", "Monument Valley": "纪念碑谷", "Grand Canyon": "大峡谷",
    Kona: "科纳", Volcano: "火山公园", "Mauna Kea": "冒纳凯阿", Hilo: "希洛", Waimea: "威美亚", "Hapuna Beach": "哈普纳海滩",
    Monterey: "蒙特雷", "Big Sur": "大苏尔", "San Luis Obispo": "圣路易斯奥比斯波", "Santa Barbara": "圣塔芭芭拉", "Los Angeles": "洛杉矶",
  };
  return points.map((point) => ({ ...point, label: labels[point.label] ?? point.label }));
}

export function inferRoutePoints(text: string, mode = "", branchId = "", locale: "en" | "zh" = "en"): RoutePoint[] | undefined {
  const haystack = `${text} ${mode} ${branchId}`;
  if (/hawai|big island|volcano|mauna|kona|夏威夷|火山|科纳|冒纳凯阿/i.test(haystack)) {
    const points = branchId.includes("active")
      ? [hawaii.kona, hawaii.volcano, hawaii.hilo, hawaii.volcano, hawaii.waimea, hawaii.kona]
      : branchId.includes("coast")
        ? [hawaii.kona, hawaii.volcano, hawaii.hilo, hawaii.waimea, hawaii.hapuna, hawaii.kona]
        : [hawaii.kona, hawaii.volcano, hawaii.mauna, hawaii.hilo, hawaii.waimea, hawaii.kona];
    return localize(points, locale);
  }
  if (/pacific coast|highway 1|big sur|monterey|california coast|一号公路|大苏尔|蒙特雷|加州海岸/i.test(haystack)) {
    const oneWay = [coast.sf, coast.monterey, coast.bigSur, coast.slo, coast.santaBarbara, coast.la];
    const points = /drive my car|own car|round trip|往返|自己开|自驾/i.test(`${mode} ${branchId}`) ? [...oneWay, coast.sf] : oneWay;
    return localize(points, locale);
  }
  if (/zion|bryce|page|grand canyon|monument|utah|arizona|southwest|the wave|锡安|布莱斯|佩吉|大峡谷|纪念碑|美西/i.test(haystack)) {
    const includesWave = /wave|extra|fly|抽中/i.test(`${text} ${branchId}`);
    const core = [southwest.vegas, southwest.zion, southwest.bryce, southwest.page, ...(includesWave ? [southwest.wave] : []), southwest.monument, southwest.canyon, southwest.vegas];
    const points = /fly|rental|飞机|租车/i.test(mode) ? core : [southwest.bay, ...core, southwest.bay];
    return localize(points, locale);
  }
  return undefined;
}
