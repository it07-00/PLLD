# Hoàn thiện sau rà soát — 29/10/2026

## Phạm vi đã triển khai

Giữ các trang và bố cục chính. Các mục trong `RA_SOAT_2026-10-29.md` đã được xử lý ở mã nguồn như sau:

| Hạng mục | Thay đổi |
| --- | --- |
| Giới hạn 500 hồ sơ | Bỏ thao tác cắt danh sách; giữ toàn bộ hồ sơ hiện có. Khi bộ nhớ trình duyệt đầy, báo lỗi và giữ kết quả để lưu lại/xuất tạm. |
| Đọc kho lỗi | Không coi lỗi JSON/cấu trúc là kho rỗng; chặn ghi đè, có tải dữ liệu gốc và khôi phục file đã xác thực. |
| Nhập JSON | Kiểm tra từng hồ sơ, ngày/giờ, phép đo, điểm, cài đặt và logo; loại trùng cả trong file và với kho hiện có; báo số thêm/bỏ qua; chỉ ghi khi dữ liệu hợp lệ. |
| Khôi phục nhiều phần | Có hoàn tác nếu ghi hồ sơ/cài đặt bị lỗi; kiểm thử riêng nhánh hết dung lượng khi khôi phục. |
| Excel | Sắp theo công ty/người/ngày/thời điểm; chỉ gộp cùng ngày và cùng thông tin nhân sự. Không gộp khác chức danh, tuổi, thâm niên, bộ phận hoặc công ty. |
| Ngày giờ | Dùng Asia/Ho_Chi_Minh cho lưu kết quả, Dashboard, tên file; “Tuần này” bắt đầu thứ Hai và không đếm ngày tương lai. |
| Thống kê | Nhóm công ty + đơn vị; đếm mọi lượt kiểm tra, không phụ thuộc bài âm thanh; thiếu phép đo hiển thị “—”. |
| Lưu phiên | Giữ người lao động, bài đã hoàn thành, các lượt phản xạ, hình đã chọn và bộ đếm trí nhớ; mở lại có thể tiếp tục. Lượt phản xạ đang đo được bắt đầu lại để tránh số đo sai. |
| Rời phiên | Cảnh báo khi đóng/tải lại hoặc chuyển trang trong phiên; có tiếp tục, xuất tạm và xóa bản nháp theo xác nhận. Đồng bộ bản nháp giữa các tab để hạn chế hai phiên cùng chạy ghi đè. |
| Lỗi lưu kết quả | Giữ mã phiên ổn định; thử lưu lại không tạo bản ghi trùng. Chỉ báo đã lưu sau khi ghi thành công. |
| Tự điền | Cùng người chỉ tự điền một lần; giữ tuổi/chức danh/thời điểm đã sửa; đổi người hoặc công ty xóa thông tin tự điền của người cũ. Mặc định Đầu ca, khi lấy hồ sơ cũ chuyển Cuối ca. |
| Chuẩn hóa công ty | Dùng khóa chuẩn hóa chung khi tra cứu, gộp, lọc, thống kê, xóa; gợi ý tên đã dùng. Yêu cầu công ty cho hồ sơ mới. |
| Hồ sơ cũ | Trong Cài đặt có chọn nhiều hồ sơ thiếu công ty và gán công ty theo xác nhận; không đoán hoặc gán tự động. |
| Hiển thị | Thêm công ty trong Dashboard, thống kê, kết quả tổng kết; STT lịch sử dùng STT người lao động giống Excel. |
| Sao lưu | JSON phiên bản 2 chứa hồ sơ, cài đặt/logo và phiên nháp. Vẫn nhập được mảng JSON cũ. Có lựa chọn giữ cài đặt hiện tại khi nhập; kết quả tạm/phiên nháp có thể nhập lại. |
| Chuyển bài | Nhãn nút theo các bài thực tế đã chọn, không dùng tên bài kế tiếp cố định. |
| Phản xạ | Khởi tạo/resume âm thanh từ thao tác người dùng; nút kiểm tra loa; đóng AudioContext khi rời bài. Tạm dừng khi mất focus/đổi tab, bỏ lượt đang đo và tiếp tục lại. Không nhận phím giữ lặp. Tín hiệu thị giác được commit trong animation frame trước khi bắt đầu đo. |
| Trí nhớ | Tách bộ đếm khỏi hàm cập nhật state; lưu nháp lựa chọn, tạm dừng khi mất tập trung, khôi phục an toàn. Các hình có thao tác bàn phím và ID SVG riêng. |
| In | Nối nút in ở chi tiết/tổng kết; lấy công ty và chức danh đúng hồ sơ; mã hóa nội dung HTML, kiểm tra popup bị chặn, chờ ảnh/phông trước khi in. |
| Thứ tự mới nhất | Hồ sơ mới có UUID và mốc hoàn thành chính xác để sắp đúng ngay cả khi nhiều lần kiểm tra cùng phút. |
| Kiểm thử | Thêm `npm test`; mở rộng kiểm thử hồi quy cho các lỗi đã tái hiện. |

## Kết quả xác minh

- `npm test`: **36 kiểm thử đạt**.
- `npm run build`: thành công; bản bàn giao là `dist/index.html` cùng tài nguyên trong `dist`.
- Đã kiểm tra Chrome trên origin QA riêng `http://127.0.0.1:5175/`, không sử dụng dữ liệu đang vận hành:
  - Tạo và hoàn thành bài trí nhớ, ghi kết quả vào lịch sử và chỉ báo thành công sau khi lưu.
  - Mở ứng dụng ở tab mới, tiếp tục phiên đang dở và giữ nguyên 2 hình đã chọn.
  - Tự điền theo tên công ty khác kiểu chữ vẫn tìm đúng hồ sơ, chuyển Cuối ca.
  - Sửa tuổi thành 42, đổi chức danh và chọn Giữa ca; quay lại tên/STT không bị ghi đè.
  - Đổi sang công ty B và nhập lại STT 01: không lấy hồ sơ công ty A, trở về Đầu ca.
  - Người chỉ làm trí nhớ được thống kê là 1 lượt, không có phản xạ hiển thị “—”, có tên công ty.

## Giới hạn xác minh

- Nhánh hủy xóa được kiểm thử bằng hàm xác nhận giả và xác nhận không gọi mutation. Phép thử hộp thoại xóa thật trên Chrome bị công cụ điều khiển chặn khi cửa sổ thu nhỏ; chưa xác nhận trọn bước này trên UI.
- Đã kiểm thử HTML in và popup bị chặn; chưa nghiệm thu bản in trên máy in/PDF thực tế.
- Chưa đo độ trễ loa/màn hình bằng thiết bị hiệu chuẩn. Cơ chế lấy thời gian đã cải thiện nhưng không khẳng định loại bỏ được độ trễ phần cứng/trình duyệt; có nút kiểm tra loa để nghiệm thu thiết bị trước khi dùng.
- Chưa thay đổi ngưỡng xếp loại hoặc nội dung kiến nghị chuyên môn.
- Không sửa ngày lịch sử theo suy đoán; dữ liệu cũ không đủ mốc thời gian để tự hiệu chỉnh chắc chắn. Không tự gán công ty cho hồ sơ cũ.
- localStorage vẫn có dung lượng tùy trình duyệt; đã xử lý báo lỗi và giữ dữ liệu, không tự xóa bớt hồ sơ để lấy chỗ.
- Đợt này build `dist`; không đóng gói lại EXE.
