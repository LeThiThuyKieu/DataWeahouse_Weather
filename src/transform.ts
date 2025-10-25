import { getConnection } from "./config/configDb";

export async function transformOnce() {
  const conn = await getConnection();

  try {
    const [rows]: any = await conn.query(
      `SELECT * FROM general_weather WHERE is_transformed = FALSE LIMIT 1000`
    );

    if (rows.length === 0) {
      console.log("No rows to transform.");
      return;
    }

    for (const row of rows) {
      try {
        const city = row.city;
        const latitude = parseFloat(row.latitude) || null;
        const longitude = parseFloat(row.longitude) || null;
        const elevation = parseFloat(row.elevation) || null;
        const utc_offset_seconds = parseInt(row.utc_offset_seconds) || null;
        const timezone = row.timezone;
        const timezone_abbreviation = row.timezone_abbreviation;
        const time = new Date(row.time);
        const temperature_2m = parseFloat(row.temperature_2m) || null;
        const humidity_2m = parseFloat(row.humidity_2m) || null;

        await conn.execute(
          `INSERT INTO transform_weather
          (city, latitude, longitude, elevation, utc_offset_seconds, timezone, timezone_abbreviation, time, temperature_2m, humidity_2m)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            city,
            latitude,
            longitude,
            elevation,
            utc_offset_seconds,
            timezone,
            timezone_abbreviation,
            time,
            temperature_2m,
            humidity_2m,
          ]
        );

        // đánh dấu đã transform
        await conn.execute(
          `UPDATE general_weather SET is_transformed = TRUE WHERE id = ?`,
          [row.id]
        );
      } catch (err) {
        console.error("Transform error for row", row.id, err);
      }
    }

    console.log(`Transformed ${rows.length} rows.`);
  } catch (err) {
    console.error("Error in transform:", err);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  transformOnce().catch(console.error);
}
