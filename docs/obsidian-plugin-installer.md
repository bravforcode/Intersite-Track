# Obsidian Plugin Installer

สคริปต์นี้ใช้ติดตั้ง Obsidian community plugins จาก source repository ที่อ้างอิงอยู่ใน `community-plugins.json` ของ Obsidian releases แล้ว build ลงใน `.obsidian/plugins/<plugin-id>` โดยตรง

ค่า default ของ source คือไฟล์ official:

- https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json

## สิ่งที่ต้องมี

ติดตั้งเครื่องมือเหล่านี้ก่อน:

- Python 3.10+ (`python --version`)
- Git (`git --version`)
- Node.js + npm (`node --version`, `npm --version`)

สคริปต์นี้ใช้ Python standard library ล้วน ไม่ต้อง `pip install` อะไรเพิ่ม

## เตรียม Vault

ถ้ายังไม่มีโฟลเดอร์ plugins ให้สร้างไว้ก่อน หรือปล่อยให้สคริปต์สร้างให้:

```powershell
mkdir C:\Users\menum\OneDrive\Documents\MyVault\.obsidian\plugins
```

## วิธีรัน

รันด้วย path ของ Vault:

```powershell
python scripts\install_obsidian_plugins.py `
  --vault-path "C:\Users\menum\OneDrive\Documents\MyVault" `
  --limit 10
```

หรือระบุ target directory ตรง ๆ:

```powershell
python scripts\install_obsidian_plugins.py `
  --plugins-dir "C:\Users\menum\OneDrive\Documents\MyVault\.obsidian\plugins" `
  --limit 10
```

## พฤติกรรมของสคริปต์

- อ่านรายการ plugin จาก `community-plugins.json`
- ใช้ `id` ของ plugin เป็นชื่อโฟลเดอร์ปลายทาง เพราะ Obsidian ต้องการโฟลเดอร์ชื่อตรงกับ plugin id
- ถ้าโฟลเดอร์มีอยู่แล้ว:
  - `--existing pull` จะ `git pull --ff-only`
  - `--existing skip` จะข้าม
- ถ้ามี `package.json` จะรัน `npm install`
- ถ้าเจอ script build ที่รองรับ (`build`, `dist`, `release`, `compile`, `bundle`) จะรัน `npm run <script>`
- ถ้า build เสร็จ จะลบ `node_modules` ทิ้งโดยอัตโนมัติ
- จะเก็บไฟล์ที่ใช้จริงใน Obsidian ต่อไว้ เช่น `main.js`, `manifest.json`, `styles.css`
- ถ้า plugin ไหน build ไม่ผ่าน จะ log แล้วข้ามไปตัวถัดไป

## ตัวเลือกที่ใช้บ่อย

จำกัดจำนวน plugin:

```powershell
python scripts\install_obsidian_plugins.py --vault-path "C:\Vault" --limit 10
```

ติดตั้งเฉพาะบาง plugin:

```powershell
python scripts\install_obsidian_plugins.py `
  --vault-path "C:\Vault" `
  --plugin-id calendar `
  --plugin-id templater-obsidian
```

ข้าม plugin ที่มีอยู่แล้ว:

```powershell
python scripts\install_obsidian_plugins.py --vault-path "C:\Vault" --existing skip
```

เก็บ `node_modules` ไว้:

```powershell
python scripts\install_obsidian_plugins.py --vault-path "C:\Vault" --keep-node-modules
```

ดูแผนก่อนรันจริง:

```powershell
python scripts\install_obsidian_plugins.py --vault-path "C:\Vault" --limit 10 --dry-run
```

## Log

ค่า default ของ log file:

```text
logs/obsidian-plugin-installer.log
```

เปลี่ยน path ได้ด้วย `--log-file`

## ข้อควรรู้

- บาง plugin ใช้ `pnpm`, `bun`, หรือ workflow release เฉพาะทาง ทำให้ `npm install` / `npm run build` ไม่ผ่าน แม้ตัว plugin จะใช้งานได้จาก release asset
- `--limit` ไม่ได้ช่วยเรื่อง GitHub API rate limit โดยตรงมากนัก เพราะ flow นี้ใช้ `git clone` เป็นหลัก แต่ช่วยลดโหลด network, เวลา build, และจำนวน error ต่อรอบได้ดี
- ถ้าจะใช้งานใน Obsidian จริง หลังติดตั้งแล้วให้เปิด Community Plugins ใน Obsidian แล้ว enable plugin ตามปกติ
