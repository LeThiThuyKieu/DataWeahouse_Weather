import axios from "axios";
import dotenv from "dotenv";
import { getConnection } from "./config/configDb";
dotenv.config();

export async function fetchAndLoad() {
  const conn = await getConnection();

  const lat = process.env.LATITUDE || "10.82";
  const lon = process.env.LONGITUDE || "106.63";
  const url = `${process.env.OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`;

  try {
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;

    // Kiểm tra dữ liệu hourly
    if (data.hourly && Array.isArray(data.hourly.time)) {
      const times = data.hourly.time;
      const temps = data.hourly.temperature_2m || [];
      const hums = data.hourly.relative_humidity_2m || [];

      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const temperature = temps[i] ?? null;
        const humidity = hums[i] ?? null;

        await conn.execute(
          `INSERT INTO general_weather
          (city, latitude, longitude, elevation, utc_offset_seconds, timezone, timezone_abbreviation, time, temperature_2m, humidity_2m)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.city ?? "Ho Chi Minh City",
            String(data.latitude ?? lat),
            String(data.longitude ?? lon),
            String(data.elevation ?? ""),
            String(data.utc_offset_seconds ?? ""),
            data.timezone ?? "",
            data.timezone_abbreviation ?? "",
            time,
            String(temperature),
            String(humidity),
          ]
        );
      }
      console.log(`Inserted ${times.length} rows into general_weather`);
    } else {
      // fallback: 1 bản ghi duy nhất
      await conn.execute(
        `INSERT INTO general_weather
        (city, latitude, longitude, elevation, utc_offset_seconds, timezone, timezone_abbreviation, time, temperature_2m, humidity_2m)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.city ?? "Ho Chi Minh City",
          String(data.latitude ?? lat),
          String(data.longitude ?? lon),
          String(data.elevation ?? ""),
          String(data.utc_offset_seconds ?? ""),
          data.timezone ?? "",
          data.timezone_abbreviation ?? "",
          data.time ?? new Date().toISOString(),
          String(data.temperature_2m ?? ""),
          String(data.humidity_2m ?? ""),
        ]
      );
      console.log(`Inserted 1 row into general_weather`);
    }
  } catch (err) {
    console.error("Error fetching or inserting:", err);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  fetchAndLoad().catch(console.error);
}
