# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, shadcn/ui (Radix + Tailwind CSS 4), Sonner, Apache ECharts, TanStack Query, thư viện Motion (motion/react). Xác nhận ngày 02/11/2026. Dữ liệu là mock API phía front-end (có độ trễ, có thể giả lỗi) cho tới khi backend bổ sung API quản trị.

## Users

Ba cấp tài khoản (thay cho Quản trị trung tâm / Cán bộ đơn vị / Chỉ đọc, chốt 03/11/2026 theo bảng yêu cầu chức năng mục 4–5):

- **Lãnh đạo cơ sở** — xem thống kê toàn Thuế cơ sở, lọc theo tổ hoặc từng cán bộ; sửa thiết lập; duyệt, tạm dừng, hủy đợt gửi; đổi vai trò, tổ và trạng thái tài khoản cán bộ.
- **Lãnh đạo tổ** — xem thống kê của tổ mình, lọc theo cán bộ trong tổ; xem thiết lập và danh sách tài khoản của tổ (không sửa).
- **Cán bộ** — chỉ xem thống kê của NNT mình phụ trách; xem thiết lập (không sửa); không có màn Tài khoản.

Bối cảnh: cán bộ thuế làm việc trên máy bàn tại cơ quan, đôi khi kiểm tra nhanh trên điện thoại.

## Product Purpose

"Quản trị thông báo" — web riêng để thiết lập và theo dõi hệ thống thông báo Engagement gửi tới người nộp thuế (NNT) hộ kinh doanh qua iHanoi. Ba màn: **Thống kê**, **Thiết lập** (trước đây gọi là Cấu hình, đổi tên 04/11/2026; đường dẫn `#/thiet-lap`, link cũ `#/cau-hinh` vẫn mở đúng màn) và **Tài khoản** (màn Tài khoản thêm ngày 03/11/2026, chỉ lãnh đạo thấy). Thành công là cán bộ trả lời được: nhóm nào đang bật, job chạy lúc nào, gửi lúc nào, đợt nào đang gửi/lỗi, và thay đổi có hiệu lực khi nào.

## Operating Context

- Chi tiết, xem trước, lịch sử, xác nhận mở bằng drawer/modal/overlay trong hai màn; không có trang phụ.
- Mẫu thông báo chỉ xem trước; không soạn–duyệt mẫu.
- Giờ Việt Nam, số `10.000`, ngày `dd/MM/yyyy`, giờ 24h.

## Capabilities and Constraints

- Nguồn đặc tả: `web_quan_tri_engagement_views_va_mockup_stitch.md`.
- Quyền kiểm tra ở backend; UI ẩn nút ghi theo vai trò. Phạm vi xem trên URL bị giới hạn theo quyền; sửa link không mở rộng được phạm vi.
- Phạm vi số liệu đi theo cán bộ phụ trách NNT: đổi tổ của cán bộ thì NNT của cán bộ đó chuyển sang tổ mới. Mỗi tổ một lãnh đạo tổ.
- Đợt gửi chung cho cả cơ sở: không tách số liệu đợt theo tổ/cán bộ, chỉ lãnh đạo cơ sở thao tác.
- **Thời gian phản hồi trung bình** = từ lúc tạo thông báo tới khi iHanoi xác nhận đã giao, chỉ tính thông báo đã giao; tách hai chặng Tạo → gửi và Gửi → giao.
- Chưa làm: giao lại NNT giữa cán bộ, tạo/xóa tài khoản, xuất lịch sử hỏi đáp AI (yêu cầu mục 4–5 nhưng ngoài dữ liệu của web này).
- Không đưa cron, biến môi trường, token, tên queue lên form.
- Không có Gửi ngay, gửi lại hàng loạt, endpoint simulate.
- Đã giao (DELIVERED) là tập con của Đã gửi Noti (SENT); không cộng lẫn lỗi giao vào Gửi thất bại.
- NNT có thông báo trong kỳ ≠ NNT còn nghĩa vụ.

## Brand Commitments

- Tên sản phẩm trên UI: **Quản trị thông báo**.
- Logo: biểu trưng Thuế thành phố Hà Nội (`logo/images.jpg`, bản tròn nền trong suốt ở `web/public/logo-thue-ha-noi.png`, favicon `web/public/favicon.png`), kèm dòng "Thuế thành phố Hà Nội" dưới tên sản phẩm.
- Brand theo logo (03/11/2026): đỏ **Pantone 199 C `#D50032`** / hover `#B5002B` / active `#950023` / subtle `#FDF0F3`; vàng **Pantone 108 C `#FEDB00`** chỉ dùng trên nền đỏ đậm (mục đang mở ở sidebar). Mã Pantone là màu gần nhất đo từ ảnh logo, **chưa đối chiếu cẩm nang nhận diện chính thức**; các bậc hover/active/subtle pha từ 199 C. Phần còn lại giữ token 02/11/2026: nền app `#F8FAFC`, card `#FFFFFF`, viền `#E2E8F0` / hover `#94A3B8`; chữ `#0F172A` / `#64748B`; success `#10B981`, warning `#F59E0B`, danger `#7F1D1D`. Chữ trên màu dùng cặp tương phản đã mô tả tại mục “Màu và phản hồi hiện hành” trong DESIGN.md.
- Phong cách corporate theo mẫu cập nhật 02/11/2026: card dashboard bo 12px, bóng nhẹ khi nghỉ; hover viền Slate 400, bóng nổi và nâng 2px. Nút chính chữ trắng, hover Red 700, active Red 800 và scale 0,98. Đây là yêu cầu thay thế quy tắc flat trước đó.
- Sidebar desktop 272px (tăng từ 240px ngày 04/11/2026: logo 40px, tên 16px, mục điều hướng 15px cao 46px kèm icon 18px); nút thu gọn đặt cạnh logo; thu gọn là ẩn hẳn. Khi ẩn, hover-peek từ nút mở trên topbar hoặc mép trái (đè lên nội dung, không đẩy layout). Mobile: bottom nav Thống kê/Thiết lập/Tài khoản (Tài khoản ẩn với cán bộ).
- Hover lift áp cho card dashboard và mục điều hướng sidebar; tắt dịch chuyển khi prefers-reduced-motion.
- Không có công tắc giả lập trạng thái trong giao diện; trạng thái tải luôn hiện skeleton.
- Không hiển thị mã nhóm (D1a, D2…) trên giao diện. Màn Thiết lập gồm 4 tab thay cho danh mục 240px của đặc tả 3.1 (lệch đặc tả, chưa được nghiệp vụ xác nhận).
- Bộ lọc Thống kê trên desktop/tablet áp dụng ngay khi chọn (lệch đặc tả 4.1 vốn có nút "Áp dụng bộ lọc"; chưa được nghiệp vụ xác nhận).

## Evidence on Hand

Toàn bộ số liệu, tên NNT, MST, đợt gửi là **dữ liệu minh họa** từ mục 5 đặc tả. Không có nghiên cứu người dùng hay analytics. Không tự tạo số liệu ngoài mục 5, trừ hai phần đã được yêu cầu (03/11/2026) và ghi rõ là minh họa: cơ cấu 3 tổ, 13 tài khoản và phân công NNT cho cán bộ (`web/src/data/org.ts`); độ trễ iHanoi giao 1–20 phút (`web/src/data/mock.ts`).

## Product Principles

1. Số liệu tách bạch: thông báo, NNT, nghĩa vụ không trộn; gửi và giao tách riêng.
2. Không giả dữ liệu: thiếu là "—" kèm chú thích; nhóm chưa sử dụng không cho bật.
3. Thay đổi phải nhìn thấy trước khi áp dụng: xem trước, so sánh trước–sau, lý do, hiệu lực.
4. Không thao tác ngầm: đợt đang chạy giữ thiết lập đã ghi nhận; xác nhận nói rõ tác động thực tế.

## Accessibility & Inclusion

Vùng chạm ≥44px, input mobile ≥16px, tương phản ≥4.5:1, focus rõ, dùng được bằng bàn phím, tooltip mở được bằng chạm, không chức năng nào chỉ có qua hover, tôn trọng `prefers-reduced-motion`. Kiểm tra 360/390/768/1024/1440px.
