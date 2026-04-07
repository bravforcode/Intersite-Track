import dotenv from "dotenv";
dotenv.config();

async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // Check bot info
  const botRes = await fetch("https://api.line.me/v2/bot/info", {
    headers: { Authorization: "Bearer " + token },
  });
  console.log("Bot info status:", botRes.status);
  const botInfo = await botRes.json();
  console.log("Bot info:", JSON.stringify(botInfo, null, 2));

  process.exit(0);
}

main();
