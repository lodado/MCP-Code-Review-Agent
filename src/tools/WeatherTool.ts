import { MCPTool } from "mcp-framework";
import { z } from "zod";
import axios, { AxiosError } from "axios";

interface WeatherApiInput {
  city: string;
}

interface WeatherApiResponse {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  precipitation: number;
}

class WeatherApiTool extends MCPTool<WeatherApiInput> {
  name = "weather_api";
  description = "Open-Meteo API를 사용하여 도시의 실제 날씨 정보를 가져오기";

  private readonly GEOCODING_URL =
    "https://geocoding-api.open-meteo.com/v1/search";
  private readonly WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

  schema = {
    city: {
      type: z.string(),
      description: "날씨를 가져올 도시 이름",
    },
  };

  async execute({ city }: WeatherApiInput): Promise<string> {
    try {
      // 첫째, 도시의 좌표를 가져옵니다
      // 한국 도시명을 영어로 변환
      const cityName = this.translateCityName(city);
      const geoResponse = await axios.get(this.GEOCODING_URL, {
        params: {
          name: cityName,
          count: 1,
          language: "en",
          format: "json",
        },
      });

      if (!geoResponse.data.results?.length) {
        throw new Error(`도시 '${city}'를 찾을 수 없습니다`);
      }

      const location = geoResponse.data.results[0];

      // 그런 다음 좌표를 사용하여 날씨 데이터를 가져옵니다
      const weatherResponse = await axios.get(this.WEATHER_URL, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
          ],
          timezone: "auto",
        },
      });

      const current = weatherResponse.data.current;

      // 날씨 코드에 따라 조건 매핑
      const condition = this.getWeatherCondition(current.weather_code);

      return JSON.stringify({
        city: location.name,
        temperature: Math.round(current.temperature_2m),
        condition,
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        feelsLike: Math.round(current.apparent_temperature),
        precipitation: current.precipitation,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`날씨 데이터 가져오기 실패: ${error.message}`);
      }
      throw new Error(
        "날씨 데이터 가져오기 실패: 알 수 없는 오류가 발생했습니다"
      );
    }
  }

  private translateCityName(city: string): string {
    const cityMap: Record<string, string> = {
      수원: "Suwon",
      서울: "Seoul",
      부산: "Busan",
      대구: "Daegu",
      인천: "Incheon",
      광주: "Gwangju",
      대전: "Daejeon",
      울산: "Ulsan",
      세종: "Sejong",
      경기: "Gyeonggi",
      강원: "Gangwon",
      충북: "Chungbuk",
      충남: "Chungnam",
      전북: "Jeonbuk",
      전남: "Jeonnam",
      경북: "Gyeongbuk",
      경남: "Gyeongnam",
      제주: "Jeju",
    };

    return cityMap[city] || city;
  }

  private getWeatherCondition(code: number): string {
    // WMO 날씨 해석 코드 (https://open-meteo.com/en/docs)
    const conditions: Record<number, string> = {
      0: "맑은 하늘",
      1: "주로 맑음",
      2: "부분적으로 흐림",
      3: "흐림",
      45: "안개",
      48: "서리안개",
      51: "가벼운 이슬비",
      53: "보통 이슬비",
      55: "강한 이슬비",
      61: "약한 비",
      63: "보통 비",
      65: "강한 비",
      71: "약한 눈",
      73: "보통 눈",
      75: "강한 눈",
      77: "눈 알갱이",
      80: "약한 소나기",
      81: "보통 소나기",
      82: "강한 소나기",
      85: "약한 눈소나기",
      86: "강한 눈소나기",
      95: "천둥번개",
      96: "약한 우박을 동반한 천둥번개",
      99: "강한 우박을 동반한 천둥번개",
    };

    return conditions[code] || "알 수 없음";
  }
}

export default WeatherApiTool;
