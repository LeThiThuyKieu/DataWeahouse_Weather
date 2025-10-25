import cron from "node-cron";
import dotenv from "dotenv";
import { fetchAndLoad } from "./fetch_and_load";
import { transformOnce } from "./transform";
dotenv.config();

const schedule = process.env.CRON_SCHEDULE || "0 * * * *"; //mỗi tiếng 1 lần, đúng vào phút đầu của giờ (vd: 00:00,01:00,02:00)

console.log("Scheduler started with cron:", schedule);
console.log("Nó sẽ tự động lấy dữ liệu mỗi chu kỳ bạn đặt trong .env");

cron.schedule(schedule, async () => {
  console.log(`Running scheduled fetch at ${new Date().toISOString()}`);
  try {
    await fetchAndLoad();
    await transformOnce();
  } catch (err) {
    console.error("Scheduled job error:", err);
  }
});
