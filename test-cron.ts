import { checkUpcomingDeadlines } from "./server/cron.js";
import { logger } from "./server/utils/logger.js";

async function test() {
  console.log("Running manual checkUpcomingDeadlines...");
  try {
    await checkUpcomingDeadlines();
    console.log("Finished checkUpcomingDeadlines.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
