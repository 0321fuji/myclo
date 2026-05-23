import { NextRequest, NextResponse } from "next/server";
import { WEATHER_CODE_MAP } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || "35.6762";
  const lon = searchParams.get("lon") || "139.6503";

  const hour = new Date().getHours();
  const isEvening = hour >= 20 || hour < 5;
  const targetDay = isEvening ? 1 : 0;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&current=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=2`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const data = await res.json();

    const weatherCode = data.daily.weather_code[targetDay] as number;
    const weatherInfo = WEATHER_CODE_MAP[weatherCode] || { description: "不明", icon: "🌡️" };

    return NextResponse.json({
      temperature: Math.round(data.current.temperature_2m),
      maxTemp: Math.round(data.daily.temperature_2m_max[targetDay]),
      minTemp: Math.round(data.daily.temperature_2m_min[targetDay]),
      weatherCode,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      isToday: !isEvening,
    });
  } catch {
    return NextResponse.json(
      {
        temperature: 20,
        maxTemp: 25,
        minTemp: 15,
        weatherCode: 1,
        description: "晴れ",
        icon: "☀️",
        isToday: true,
      },
      { status: 200 }
    );
  }
}
