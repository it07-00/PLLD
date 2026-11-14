# Hướng dẫn triển khai PLLĐ-BC lên Hosting iNET

## 1. Tạo Database MySQL trên iNET (cPanel / DirectAdmin)
1. Đăng nhập trang quản trị hosting iNET (cPanel hoặc DirectAdmin).
2. Vào **MySQL Databases** -> tạo 1 database mới (ví dụ `plld_db`) và 1 user MySQL, gán toàn quyền (`ALL PRIVILEGES`) cho user đó vào database.
3. Mở **phpMyAdmin**, chọn database vừa tạo -> tab **Import** -> chọn file `server-php/schema.sql` để tạo 2 bảng `plld_records` và `plld_settings`.

## 2. Upload Backend API lên Hosting
1. Trên hosting (trong `public_html` hoặc thư mục của subdomain như `plld.tenmiencuaban.com`), tạo thư mục `api/`.
2. Upload 2 file `server-php/index.php` và `server-php/config.example.php` vào thư mục `api/`.
3. Đổi tên `config.example.php` thành `config.php` và điền:
   - `db_name`, `db_user`, `db_pass` vừa tạo ở bước 1.
   - `api_key`: tự đặt một chuỗi bí mật dài (ví dụ `BaoChau-PLLD-2026-#9xK2mP`), dùng chung cho mọi máy trong đội.
4. Kiểm tra đường dẫn API: `https://tenmiencuaban.com/api/index.php?action=ping` (nếu mở trên trình duyệt sẽ báo lỗi 401 thiếu API Key là đúng).

## 3. Upload bản Web lên Hosting (tùy chọn nếu muốn mở trực tiếp trên trình duyệt)
1. Chạy `npm run build` trong thư mục `PLLĐ-BC` để tạo thư mục `dist/`.
2. Upload toàn bộ file trong `dist/` (`index.html`, `logo.png`) vào `public_html/` (hoặc thư mục gốc của subdomain).
3. Từ giờ bạn có thể mở trực tiếp `https://tenmiencuaban.com/` trên trình duyệt **HOẶC** tiếp tục dùng file `.exe` trên máy tính — cả hai đều đồng bộ chung về database trên iNET.

## 4. Kết nối trên máy A và máy B
1. Mở app PLLĐ-BC (bản Web hoặc bản `.exe`) -> vào **Cài đặt** -> mục **Đồng bộ Online (Hosting iNET)**.
2. Nhập:
   - **Địa chỉ API**: `https://tenmiencuaban.com/api/index.php`
   - **Mã bảo mật (API Key)**: mã đã đặt trong `config.php`.
3. Bấm **Kiểm tra kết nối** -> **Lưu cấu hình** -> **Đồng bộ ngay**.
4. Nếu máy A đã có sẵn dữ liệu test từ trước, chỉ cần bấm **Đồng bộ ngay** 1 lần khi có mạng là toàn bộ hồ sơ cũ sẽ được đẩy lên iNET; sang máy B nhập cùng địa chỉ API + API Key rồi bấm **Đồng bộ ngay** là có đủ dữ liệu.
