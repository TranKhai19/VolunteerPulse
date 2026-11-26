# VolunteerPulse (TìnhNguyệnMap)

> **Nền tảng Điều phối & Minh bạch Tình nguyện Vùng cao — Kết nối Đoàn Xã & Đại học Duy Tân**  
> Sản phẩm dự thi **Bảng A — Cuộc thi Sáng tạo cùng AI 2026** (Mã hồ sơ: **A-002** • Thành đoàn Đà Nẵng & BCH Đoàn Đại học Duy Tân).

---

## 1. Giới thiệu & 7 Phân hệ chức năng chính

1. **Xem công khai & Quản trị phân quyền (Auth RBAC — Duyệt TK):**
   - Khách và Mạnh thường quân có thể xem ngay **Bản đồ nhu cầu** và **Báo cáo minh bạch** mà không cần đăng nhập.
   - Cán bộ Đoàn / TNV bấm **Đăng nhập vận hành** (Supabase Auth). Admin Đoàn trường sử dụng mục **Duyệt TK** để phê duyệt và cấp đúng vai trò (`admin`, `coordinator`, `dtu_unit`, `commune_youth`, `volunteer`).
2. **Bản đồ nhu cầu (Interactive Geo-Map):**
   - Bản đồ số Leaflet/OpenStreetMap + PostGIS hiển thị các điểm bản miền núi Quảng Nam – Đà Nẵng (Nam Trà My, Tây Giang, Đông Giang, Phước Sơn, Hòa Bắc), cảnh báo địa hình, mất sóng 4G, vùng trắng chưa có đơn vị nhận và lộ trình gom xe.
3. **Kết nối Đoàn Xã 2 chiều (Ecosystem):**
   - Đoàn Xã gửi phiếu nhu cầu địa phương; các Liên chi đoàn ĐH Duy Tân xem các điểm bản còn trống để đăng ký nhận hỗ trợ hoặc liên quân.
4. **Phân bổ ngân sách & Lộ trình (OR-Tools + Gemini 2.5 Flash):**
   - Kéo thanh tổng ngân sách và trọng số ưu tiên vùng sâu để tự động tính phương án chia suất quà, áo ấm, túi y tế công bằng (chống thừa quà >100% tại điểm gần trục chính), tối ưu tuyến gom xe 2-opt VRP và gọi trực tiếp **Gemini 2.5 Flash** phân tích hậu cần thực địa.
5. **Ghép nhân sự thông minh (Smart Volunteer Matching):**
   - Tự động tính độ phù hợp kỹ năng (Y tế & Sơ cứu, Lái xe địa hình, Kỹ thuật & Điện mặt trời, Hậu cần, Dạy học, Truyền thông) và đề xuất đội hình tối ưu cho từng điểm bản.
6. **Xác thực hiện trường 2 chiều & Chế độ Offline 4G:**
   - Tải ảnh trao quà hoặc hóa đơn thực tế, tự lấy tọa độ GPS thiết bị, lưu ảnh gốc lên **Supabase Storage (`field-evidence`)**, dùng **Gemini Vision** kiểm đếm hiện vật kèm bounding box hoặc đọc hóa đơn OCR.
   - Khi mất sóng 4G vùng cao, biên bản được lưu vào **IndexedDB Offline Queue** và đồng bộ 1 chạm khi có sóng để Trưởng đoàn duyệt chéo và Bí thư Đoàn Xã xác nhận 2 chiều.
7. **Báo cáo minh bạch, Tổng kết nhiều năm & Giấy chứng nhận TNV điện tử:**
   - Xuất sao kê **CSV** hoặc in/lưu **PDF** nộp Đoàn trường ngay lập tức.
   - Biểu đồ so sánh tác động qua các mùa chiến dịch, khởi tạo mùa chiến dịch mới cho các năm sau và in **Giấy chứng nhận TNV điện tử** có mã xác thực riêng (`VP-YYYY-ID`).

---

## 2. Hướng dẫn cài đặt & Chạy cục bộ

### Yêu cầu môi trường
- Node.js `>= 20` và `npm`
- Tài khoản [Supabase](https://supabase.com/) (PostGIS + Auth + Storage)
- Khóa API [Google AI Studio (Gemini 2.5 Flash)](https://aistudio.google.com/apikey)

### Các bước chạy nhanh
```bash
cd web
cp .env.example .env.local
# Điền GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY vào web/.env.local

npm install
npm run dev
```
Mở trình duyệt tại `http://localhost:3000`.

### Cấu hình Cơ sở dữ liệu Supabase
Chạy lần lượt các tệp SQL trong thư mục `web/supabase/` trên Supabase SQL Editor:
1. `web/supabase/schema.sql`
2. `web/supabase/migrations/001_phase1_production_foundation.sql`
3. `web/supabase/migrations/002_phase2_audit_and_soft_delete.sql`

### Kiểm thử & Build Production
```bash
cd web
npm test        # Chạy bộ Unit Test Vitest (thuật toán phân bổ & ghép nhân sự)
npm run build   # Kiểm tra biên dịch Production Next.js 15
```

---

## 3. Hướng dẫn trải nghiệm & Tài khoản dùng thử (dành cho BGK)

- **Chế độ Xem công khai (không cần đăng nhập):** Truy cập trực tiếp URL ứng dụng để xem **Bản đồ nhu cầu** và **Báo cáo minh bạch**.
- **Chế độ Vận hành (Admin Đoàn trường):** Bấm **Đăng nhập vận hành** ở thanh bên trái và nhập tài khoản dùng thử:
  - **URL trực tuyến:** `[Cập nhật link Vercel sau khi deploy]`
  - **Email Admin dùng thử:** `[Cập nhật email tài khoản dùng thử trên Supabase]`
  - **Mật khẩu:** `[Cập nhật mật khẩu tài khoản dùng thử]`
- **Gợi ý luồng kiểm thử nhanh (2 phút):**
  1. Xem công khai Bản đồ → Đăng nhập Admin → mở **Duyệt TK** để xem phân quyền vai trò.
  2. Vào **Kết nối Đoàn Xã** → sang **Phân bổ ngân sách**, kéo thanh ngân sách & bấm **Phân tích bằng Gemini AI** → xem **Ghép nhân sự**.
  3. Vào **Xác thực 2 chiều** → chọn 1 điểm bản, tải 1 ảnh thật & bấm **Xác thực GPS và phân tích AI** → bật **Mô phỏng mất sóng 4G**, gửi 1 biên bản Offline → tắt mất sóng & bấm **Đồng bộ bản ghi Offline**.
  4. Vào **Báo cáo minh bạch** (Tải CSV / Xuất PDF) → sang **Tổng kết nhiều năm**, xem biểu đồ & in **Giấy chứng nhận TNV điện tử**.

---

## 4. Bộ hồ sơ bàn giao (`handout/` & `Mau1_A-002.docx`)

| Tệp bàn giao | Mô tả |
|---|---|
| `Mau1_A-002.docx` | Hồ sơ mô tả sản phẩm bản Word chỉnh sửa trực tiếp theo Mẫu 1 |
| `handout/Ho_So_San_Pham_A-002_VolunteerPulse.pdf` | Hồ sơ mô tả sản phẩm bản PDF theo Mẫu 1 (≤ 12 trang) |
| `handout/Video_Demo_VolunteerPulse.mp4` | Video trình diễn sản phẩm Full HD 1080p có thuyết minh tiếng Việt (`01:53`) |
| `handout/Prompt_Log_VolunteerPulse.pdf` | Prompt Log đầy đủ: System Prompt thực tế trong mã nguồn + lịch sử hội thoại & gỡ lỗi |
| `handout/Ban_Ke_Khai_Cong_Cu_AI_VolunteerPulse.pdf` | Bản kê khai đầy đủ Công cụ AI, Mô hình, Thư viện, Dataset, API, Mã nguồn & Tài nguyên |

---

## 5. Nhóm tác giả (Mã hồ sơ: A-002 — Đại học Duy Tân)

| STT | Họ và tên | MSSV | Khoa / Đơn vị |
|---|---|---|---|
| 1 | **Khải Trần Duy** (Đội trưởng) | 32311570033 | LCĐ Khoa Khoa học Máy tính |
| 2 | **Kỳ Nguyễn Quốc Hưng** | 31211149665 | LCĐ Khoa CNPM Việt - Mỹ (CMU) |
| 3 | **Nguyễn Hữu Phát Đạt** | 31211147680 | LCĐ Khoa CNPM Việt - Mỹ (CMU) |
| 4 | **Liễu Hiệp Phát** | 31211165821 | LCĐ Khoa Công nghệ Thông tin |
