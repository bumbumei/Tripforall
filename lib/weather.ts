// Open-Meteo 무료 날씨 API (키 불필요).
// https://api.open-meteo.com/v1/forecast
//
// 활용:
//  - 코스 중심 좌표 + 출발 날짜·시간의 기온·강수확률·일출일몰 가져오기
//  - 날씨 분류(맑음/구름/비/눈/더위/추위)로 스팟 추천 가중치 조정
//  - 화면에 "오늘 비 예보 — 실내 위주로 추천했습니다" 같은 메시지 노출

export type WeatherCondition =
  | "clear" // 맑음
  | "cloudy" // 구름
  | "rain" // 비
  | "snow" // 눈
  | "hot" // 더위 (32℃+)
  | "cold"; // 추위 (0℃-)

export interface WeatherSnapshot {
  condition: WeatherCondition;
  tempC: number; // 출발 시각 기온
  feelsLikeC?: number;
  precipProbPct: number; // 강수확률 0~100
  windKph?: number;
  summary: string; // "맑고 따뜻", "비 예보, 강수확률 80%" 등 사용자용 한 줄
  // 실내 권장 여부 (날씨 기반 추천에서 사용)
  preferIndoor: boolean;
  source: "open-meteo";
}

// WMO 날씨 코드 → condition 매핑
// https://open-meteo.com/en/docs#weathervariables
function classify(weatherCode: number, tempC: number, precipMm: number): WeatherCondition {
  if (tempC >= 32) return "hot";
  if (tempC <= 0) return "cold";
  if (weatherCode >= 71 && weatherCode <= 77) return "snow";
  if (weatherCode >= 80 && weatherCode <= 82) return "rain";
  if (weatherCode >= 61 && weatherCode <= 67) return "rain";
  if (weatherCode >= 51 && weatherCode <= 57) return "rain";
  if (precipMm >= 0.5) return "rain";
  if (weatherCode >= 1 && weatherCode <= 3) return "cloudy";
  return "clear";
}

const COND_LABEL: Record<WeatherCondition, string> = {
  clear: "맑음",
  cloudy: "구름",
  rain: "비",
  snow: "눈",
  hot: "더위",
  cold: "추위"
};

function summarize(c: WeatherCondition, tempC: number, prob: number): string {
  const t = `${Math.round(tempC)}℃`;
  switch (c) {
    case "rain":
      return `비 예보 (${t}, 강수확률 ${prob}%) — 실내 위주 동선이 안전합니다.`;
    case "snow":
      return `눈 예보 (${t}) — 미끄럼 주의, 실내 비중을 늘렸습니다.`;
    case "hot":
      return `더위 (${t}, 강수확률 ${prob}%) — 실내·그늘 위주로 짰습니다.`;
    case "cold":
      return `쌀쌀함 (${t}) — 실내 비중을 늘렸습니다.`;
    case "cloudy":
      return `흐림 (${t}) — 야외도 무리 없습니다.`;
    case "clear":
      return `맑고 ${tempC >= 18 ? "따뜻" : "선선"} (${t}) — 야외 동선에 좋은 날입니다.`;
  }
}

export async function getWeather(
  lat: number,
  lng: number,
  date?: string, // YYYY-MM-DD
  startTime?: string // HH:MM
): Promise<WeatherSnapshot | null> {
  // hourly 데이터를 3일치 받아서 출발 시각에 가장 가까운 1포인트를 사용.
  // (start_date/end_date를 forecast_days와 함께 보내면 충돌 — forecast_days만 사용)
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly:
      "temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m",
    timezone: "Asia/Seoul",
    forecast_days: "3"
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 1800 } // 30분
    });
    if (!res.ok) return null;
    const j = await res.json();
    const times: string[] = j?.hourly?.time ?? [];
    if (times.length === 0) return null;

    // 출발 시각 결정: date+startTime 있으면 그 시각, 없으면 오늘 정오.
    const targetISO = date && startTime
      ? `${date}T${startTime}`
      : new Date().toISOString().slice(0, 13) + ":00";

    // hourly 배열에서 가장 가까운 시간 찾기
    let bestIdx = 0;
    let bestDiff = Infinity;
    const targetMs = new Date(targetISO).getTime();
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    const tempC = Number(j.hourly.temperature_2m[bestIdx]);
    const feelsLikeC = Number(j.hourly.apparent_temperature[bestIdx]);
    const precipMm = Number(j.hourly.precipitation[bestIdx]);
    const precipProbPct = Number(j.hourly.precipitation_probability?.[bestIdx] ?? 0);
    const code = Number(j.hourly.weather_code[bestIdx]);
    const windKph = Math.round(Number(j.hourly.wind_speed_10m[bestIdx]) * 3.6);

    const condition = classify(code, tempC, precipMm);
    const preferIndoor =
      condition === "rain" || condition === "snow" || condition === "hot" || condition === "cold";

    return {
      condition,
      tempC: Math.round(tempC * 10) / 10,
      feelsLikeC: Math.round(feelsLikeC * 10) / 10,
      precipProbPct,
      windKph,
      summary: summarize(condition, tempC, precipProbPct),
      preferIndoor,
      source: "open-meteo"
    };
  } catch {
    return null;
  }
}

export function weatherLabel(c: WeatherCondition): string {
  return COND_LABEL[c];
}
