import { getConnection } from "./config/configDb";
import { configManager, controlDBManager } from "./config_manager";

export async function loadToDataWarehouse(configLogId?: number) {
  let stagingConn: any;
  let dwConn: any;
  let processLogId: number | undefined;

  try {
    // Load config
    await configManager.loadConfig();

    // Log start of process
    processLogId = await controlDBManager.logProcess(
      "Load to Data Warehouse",
      "LOAD_DW",
      configLogId
    );

    // Get database configs
    const stagingDbConfig = configManager.getWeatherDbConfig();
    const dwDbConfig = {
      host: stagingDbConfig.host,
      port: stagingDbConfig.port,
      database: "datawarehouse",
      username: stagingDbConfig.username,
      password: stagingDbConfig.password,
    };

    // Connect to staging database
    stagingConn = await getConnection(stagingDbConfig);

    // Connect to datawarehouse
    dwConn = await getConnection(dwDbConfig);

    console.log("Starting datawarehouse load process...");

    // Lấy dữ liệu từ transform_weather
    console.log("Fetching data from transform_weather...");
    const [rows]: any = await stagingConn.query(`
      SELECT * FROM transform_weather ORDER BY loaded_at DESC
    `);

    if (rows.length === 0) {
      console.log("No data in transform_weather to load.");
      return;
    }

    console.log(`Found ${rows.length} records to load into datawarehouse`);

    // Populate Dim_Time
    console.log("Populating Dim_Time in datawarehouse...");
    const timeMap = new Map<string, number>();
    for (const row of rows) {
      const datetime = new Date(row.time);
      const dateKey = `${datetime.getFullYear()}-${String(
        datetime.getMonth() + 1
      ).padStart(2, "0")}-${String(datetime.getDate()).padStart(
        2,
        "0"
      )} ${String(datetime.getHours()).padStart(2, "0")}:00:00`;

      if (!timeMap.has(dateKey)) {
        const year = datetime.getFullYear();
        const month = datetime.getMonth() + 1;
        const day = datetime.getDate();
        const hour = datetime.getHours();
        const quarter = Math.floor((month - 1) / 3) + 1;
        const season = getSeason(month);

        const [result]: any = await dwConn.query(
          `
          INSERT IGNORE INTO datawarehouse.Dim_Time 
          (datetime, date, year, month, day, hour, day_of_week, quarter, season)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            dateKey,
            datetime.toISOString().split("T")[0],
            year,
            month,
            day,
            hour,
            datetime.getDay(),
            quarter,
            season,
          ]
        );

        timeMap.set(dateKey, result.insertId);
      }
    }
    console.log(`Populated ${timeMap.size} time records`);

    // Populate Dim_Location
    console.log("Populating Dim_Location in datawarehouse...");
    const locationMap = new Map<string, number>();
    for (const row of rows) {
      const locationKey = `${row.city}_${row.latitude}_${row.longitude}`;

      if (!locationMap.has(locationKey)) {
        const [result]: any = await dwConn.query(
          `
          INSERT IGNORE INTO datawarehouse.Dim_Location 
          (city, latitude, longitude, timezone, timezone_abbreviation, utc_offset_seconds)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            row.city,
            row.latitude,
            row.longitude,
            row.timezone || "",
            row.timezone_abbreviation || "",
            row.utc_offset_seconds || 0,
          ]
        );

        locationMap.set(locationKey, result.insertId);
      }
    }
    console.log(`Populated ${locationMap.size} location records`);

    // Populate Fact_Weather
    console.log("Populating Fact_Weather in datawarehouse...");
    let factCount = 0;
    for (const row of rows) {
      const datetime = new Date(row.time);
      const dateKey = `${datetime.getFullYear()}-${String(
        datetime.getMonth() + 1
      ).padStart(2, "0")}-${String(datetime.getDate()).padStart(
        2,
        "0"
      )} ${String(datetime.getHours()).padStart(2, "0")}:00:00`;
      const locationKey = `${row.city}_${row.latitude}_${row.longitude}`;

      const timeKey = timeMap.get(dateKey);
      const locationKeyValue = locationMap.get(locationKey);

      if (timeKey && locationKeyValue) {
        await dwConn.query(
          `
          INSERT IGNORE INTO datawarehouse.Fact_Weather 
          (time_key, location_key, temperature_2m, humidity_2m, elevation)
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            timeKey,
            locationKeyValue,
            row.temperature_2m,
            row.humidity_2m,
            row.elevation,
          ]
        );
        factCount++;
      }
    }
    console.log(` Populated ${factCount} weather facts`);

    //Update process log success
    await controlDBManager.updateProcessLogStatus(
      processLogId,
      "SUCCESS",
      factCount
    );

    console.log("\n Datawarehouse load completed successfully!");
    console.log(`Total records loaded: ${factCount}`);
  } catch (err: any) {
    console.error("Error in loadToDataWarehouse:", err);
    if (processLogId) {
      await controlDBManager.updateProcessLogStatus(
        processLogId,
        "FAILED",
        0,
        err instanceof Error ? err.message : String(err)
      );
    }
    throw err;
  } finally {
    if (stagingConn) {
      await stagingConn.end();
    }
    if (dwConn) {
      await dwConn.end();
    }
  }
}

/**
 * Helper function để xác định mùa
 */
function getSeason(month: number): string {
  if (month === 12 || month === 1 || month === 2) return "Winter";
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  return "Autumn";
}

// CLI để chạy bằng tay
if (require.main === module) {
  loadToDataWarehouse()
    .then(() => {
      console.log("Datawarehouse load completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Datawarehouse load failed:", error);
      process.exit(1);
    });
}
