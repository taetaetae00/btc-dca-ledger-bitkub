# BTC DCA Ledger (auto-sync from Bitkub, ฟรีทั้งหมด)

หน้าเว็บนี้ดึงประวัติการซื้อ BTC จริงจากบัญชี Bitkub ของคุณโดยตรง ทุกชั่วโมง
ไม่ต้องแตะโทรศัพท์ ไม่ต้องอ่านแจ้งเตือน LINE เลย — ใช้ GitHub ฟรี (Actions + Pages)

## วิธีติดตั้ง (ทำครั้งเดียว)

1. **สร้าง API Key ของ Bitkub**
   - Login bitkub.com → Account → API Management
   - สร้างคีย์ใหม่ **แบบ read-only เท่านั้น** (ไม่ต้องให้สิทธิ์ถอนเงิน/เทรด) — ปลอดภัยไว้ก่อน
   - เก็บ API Key และ API Secret ไว้ (Secret จะโชว์ครั้งเดียว)

2. **สร้าง GitHub repo**
   - สร้าง repo ใหม่ (private ก็ได้) แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป
     (`index.html`, `data/`, `scripts/`, `.github/workflows/sync.yml`)

3. **ใส่ API key เป็น Secret** (อย่าใส่ในโค้ดตรงๆ)
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - เพิ่ม `BITKUB_API_KEY` และ `BITKUB_API_SECRET`

4. **เปิด GitHub Pages**
   - Repo → Settings → Pages → Source: Deploy from branch → Branch: `main` / `(root)`
   - จะได้ลิงก์ประมาณ `https://<username>.github.io/<repo>/`

5. **รัน sync ครั้งแรกด้วยมือ** (ไม่ต้องรอครบชั่วโมง)
   - Repo → Actions → เลือก workflow "Sync Bitkub BTC purchases" → Run workflow

หลังจากนั้นระบบจะดึงข้อมูลอัตโนมัติทุกชั่วโมง (แก้ตารางเวลาได้ที่
`.github/workflows/sync.yml` บรรทัด `cron: "0 * * * *"`) แล้ว commit ไฟล์
`data/orders.json` กลับเข้า repo เอง หน้าเว็บจะโหลดไฟล์นี้ทุกครั้งที่เปิด

## หมายเหตุ

- ฟิลด์ผลลัพธ์จาก Bitkub API อาจมีการเปลี่ยนชื่อคีย์ในบางเวอร์ชัน ถ้า sync
  ครั้งแรกได้ตัวเลขแปลกๆ ให้เปิด log ใน Actions ดู raw response แล้วปรับ
  `scripts/sync-bitkub.mjs` ฟังก์ชัน `normalize()` เล็กน้อย
- ช่อง "เพิ่มรายการด่วน" ในหน้าเว็บใช้สำหรับดูตัวเลขคร่าวๆ ระหว่างรอ sync
  รอบถัดไป ไม่ได้ถูกส่งขึ้น Bitkub หรือที่ใดๆ (เก็บในเบราว์เซอร์ตัวเองเท่านั้น)
- ทุกอย่างในเอกสารนี้ใช้ของฟรีทั้งหมด: GitHub Actions (free tier), GitHub Pages (free),
  Bitkub API (free สำหรับเจ้าของบัญชี)
