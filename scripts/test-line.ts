import dotenv from "dotenv";
dotenv.config();

async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  console.log("Using broadcast API...");

  const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ type: "text", text: "ทดสอบ LINE แจ้งเตือนจาก TaskAm ✅" }],
    }),
  });

  console.log("Status:", res.status);
  console.log("Response:", await res.text());
  process.exit(0);
}

main();
