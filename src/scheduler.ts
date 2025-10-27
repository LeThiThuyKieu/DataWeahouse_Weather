import cron from "node-cron";
import { runScheduledETL } from "./etl_process";
import { configManager } from "./config_manager";

// Load config để lấy schedule
let schedule = "0 */6 * * *"; // Mặc định: mỗi 6 tiếng

configManager.loadConfig().then(() => {
  const etlConfig = configManager.getETLConfig();
  if (etlConfig.fetch.schedule) {
    schedule = etlConfig.fetch.schedule;
  }
});

console.log("Scheduler started with cron:", schedule);
console.log("Nó sẽ tự động chạy ETL process mỗi chu kỳ bạn đặt trong .env");

cron.schedule(schedule, async () => {
  console.log(`Running scheduled ETL at ${new Date().toISOString()}`);
  try {
    await runScheduledETL();
  } catch (err) {
    console.error("Scheduled ETL job error:", err);
  }
});
