# Vault Second Brain

ระบบนี้ถูกแปลงให้รองรับหลายโปรเจคแล้ว โดยใช้ Obsidian Vault เป็น second brain กลาง และใช้ note retrieval แบบสั้นเพื่อดึง context ก่อนเริ่ม session

## แนวคิด

- Code เป็น source of truth สำหรับงานและโครงสร้างระบบ
- Vault เป็น source of truth สำหรับ memory ระยะยาว, rules, skills, decisions, learnings
- AI ไม่ต้องอ่านโน้ตยาวทุกครั้ง แต่เรียก `context brief` ที่คัดเฉพาะสิ่งสำคัญให้แทน

## คำสั่งหลัก

```bash
npm run vault:register
npm run vault:projects
npm run vault:full
npm run vault:context -- --task "fix auth bug in login flow"
npm run vault:preflight -- --task "fix auth bug in login flow"
npm run vault:playbooks
```

## ใช้กับโปรเจคอื่น

กรณีรันจาก repo ปัจจุบัน:

```bash
npm run vault:register -- --project vibescity --project-name VibesCity --project-root C:\work\vibescity
npm run vault:context -- --project vibescity --task "implement payments page"
```

ถ้าอยู่ใน repo ใหม่ ให้ใส่ไฟล์ `.vaultsync/project.json` แบบนี้:

```json
{
  "projectKey": "vibescity",
  "projectName": "VibesCity",
  "projectFolder": "VibesCity",
  "scanDirs": ["src", "app", "server", "tests", "scripts"],
  "screenshotDir": "docs/screenshots"
}
```

แล้วค่อยรัน:

```bash
npm run vault:register
npm run vault:full
```

## โน้ตที่ควรดูแล

- `01-Projects/<Project>/Context/Session-Rules.md`
- `01-Projects/<Project>/Context/Preferred-Skills.md`
- `01-Projects/<Project>/Context/Session-Playbooks.md`
- `01-Projects/<Project>/Context/Playbook-Suggestions.md`
- `01-Projects/<Project>/Context/Working-Agreements.md`
- `01-Projects/<Project>/Context/Domain-Glossary.md`
- `Meta/AI/Global-Rules.md`
- `Meta/AI/Global-Skills.md`
- `Meta/AI/Global-Session-Playbooks.md`

## Query-aware retrieval

`vault:context` ไม่ได้ดูแค่ keyword ตรง ๆ แล้ว แต่จะพยายามจับ intent ของงาน เช่น

- bug fix
- auth / security
- api / backend
- database / schema
- deploy / infra
- ui / frontend
- testing
- payments

จากนั้นจะ:

- boost ประเภทโน้ตที่ควรอ่าน
- ดึง skill ที่เหมาะ
- match playbook ที่เกี่ยวข้อง
- สร้าง checklist สั้น ๆ ให้ session นั้น

## Workflow ที่ช่วยประหยัด context

1. อัปเดต rules/skills/learnings ลง Vault แทนการพิมพ์ซ้ำใน chat
2. เริ่ม session ด้วย `vault:context -- --task "..."`
3. ถ้าต้องการ prompt สั้นมาก ใช้ `vault:preflight -- --task "..."`
4. ให้ AI อ่าน brief ที่ `Meta/AI/context-cache/<project>/latest.md` หรือ `preflight.md`
5. ใช้ full notes เฉพาะตอนจำเป็นจริง

## Auto playbook suggestion

`vault:playbooks` จะอ่าน history จาก:

- `Meta/agent-log/<Project>/`
- `02-Areas/Dev-Practice/<Project>-Learnings.md`
- `02-Areas/Dev-Practice/<Project>-Security-Notes.md`

แล้วสรุปเป็นข้อเสนอใหม่ใน:

- `01-Projects/<Project>/Context/Playbook-Suggestions.md`

แนวคิดคือถ้างานบางประเภทเกิดซ้ำใน history แต่ยังไม่มี playbook รองรับ ระบบจะเสนอ template ให้ย้ายเข้า `Session-Playbooks.md` ได้เลย

## Session Playbook format

ใช้ heading `##` ต่อหนึ่ง playbook แล้วใส่ field แบบนี้:

```md
## Auth Work
match: auth, login, token, session
skills:
- playwright
- security-best-practices
rules:
- Read auth-related architecture notes first.
checklist:
- Identify caller and route
- Verify middleware / guard path
note-hints:
- auth
- login
- token
category-boosts:
- architecture: 16
- security: 10
```

ผลคือ context ที่ส่งเข้า session จะสั้นลง แต่ยังอ้างอิง memory เก่าได้ต่อเนื่อง
