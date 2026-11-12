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

"Quản trị thông báo" — web riêng để thiết lập và theo dõi hệ thống thông báo Engagement gửi tới người nộp thuế (NNT) hộ kinh doanh qua iHanoi. Sáu màn: **Thống kê**, **Gửi thông báo**, **Mẫu tin**, **Kênh gửi**, **Thiết lập** (trước đây gọi là Cấu hình, đổi tên 04/11/2026; đường dẫn `#/thiet-lap`, link cũ `#/cau-hinh` vẫn mở đúng màn) và **Tài khoản** (màn Tài khoản thêm ngày 03/11/2026, chỉ lãnh đạo thấy). Thành công là cán bộ trả lời được: nhóm nào đang bật, job chạy lúc nào, gửi lúc nào, đợt nào đang gửi/lỗi, và thay đổi có hiệu lực khi nào.

## Operating Context

- Chi tiết, xem trước, lịch sử, xác nhận mở bằng drawer/modal/overlay trong hai màn; không có trang phụ.
- **Đăng nhập (09/11/2026, mock):** màn chia đôi (cột thương hiệu đỏ brand / cột form); nhận 3 tài khoản xem thử, mật khẩu bất kỳ; chọn tài khoản xem thử là vào luôn. Chuyển cảnh sang trang chủ: logo + tên gom vào giữa (560ms) → chờ ≥1,6s kèm ba chấm, tới khi trang chủ tải xong → logo bay về đúng hộp logo thật (620ms) → lớp che đỏ `#B5002B` mở lỗ tròn từ tâm logo (980ms). Đăng xuất (chiều ngược): lớp che khép lỗ tròn về tâm logo trên trang chủ (720ms) → logo bay về hộp logo màn đăng nhập (620ms), màn đăng nhập hiện dần; tổng ~1,4s, không có pha chờ. Giảm chuyển động: chỉ fade. Thời lượng theo yêu cầu, chưa kiểm chứng với người dùng; khi nối Keycloak/OIDC cần xác định lại điểm bắt đầu chuyển cảnh.
- Thông báo tự động (Engagement) dùng mẫu cố định, chỉ xem trước. Gửi chủ động dùng màn Mẫu tin: soạn nháp → xuất bản phiên bản (05/11/2026).
- Giờ Việt Nam, số `10.000`, ngày `dd/MM/yyyy`, giờ 24h.

## Capabilities and Constraints

- Nguồn đặc tả: `web_quan_tri_engagement_views_va_mockup_stitch.md`.
- Quyền kiểm tra ở backend; UI ẩn nút ghi theo vai trò. Phạm vi xem trên URL bị giới hạn theo quyền; sửa link không mở rộng được phạm vi.
- Phạm vi số liệu đi theo cán bộ phụ trách NNT: đổi tổ của cán bộ thì NNT của cán bộ đó chuyển sang tổ mới. Mỗi tổ một lãnh đạo tổ.
- Đợt gửi chung cho cả cơ sở: không tách số liệu đợt theo tổ/cán bộ, chỉ lãnh đạo cơ sở thao tác.
- **Thời gian phản hồi trung bình** = từ lúc tạo thông báo tới khi iHanoi xác nhận đã giao, chỉ tính thông báo đã giao; tách hai chặng Tạo → gửi và Gửi → giao.
- Chưa làm: giao lại NNT giữa cán bộ, tạo/xóa tài khoản, xuất lịch sử hỏi đáp AI (yêu cầu mục 4–5 nhưng ngoài dữ liệu của web này).
- Không đưa cron, biến môi trường, token, tên queue lên form.
- Không có gửi lại hàng loạt hay endpoint simulate. Gửi chủ động có từ 05/11/2026 (xem dưới).

### Phần Notification Center (thêm 05/11/2026, theo `web/doc/Notification Center Service.md`)

Engagement (rà soát nghĩa vụ, tự lập đợt) là hệ thống nghiệp vụ gửi qua Notification Center; ba màn mới thuộc giao diện Notification Center:

- **Gửi thông báo:** chọn người nhận (nhóm NNT theo điều kiện / cả tổ / từng NNT) → kênh → mẫu tin hoặc tự soạn → xem trước (số gửi, số bỏ qua kèm lý do, chia lô 100 NNT) → gửi; theo dõi tiến độ từng kênh, từng người nhận, từng lần thử; hủy phần chưa gửi. Bấm gửi lại dùng cùng khóa, không tạo lần gửi trùng.
- **Mẫu tin:** nháp → xuất bản (bắt buộc lý do); phiên bản đã xuất bản không sửa; lần gửi đã tạo giữ nội dung cũ.
- **Kênh gửi:** Hộp thư, iHanoi đang hoạt động; Email, Zalo chưa kết nối. Lãnh đạo cơ sở tạm dừng / ngắt khẩn cấp (bắt buộc lý do); ngắt khẩn cấp hủy tin đang chờ, không tự chuyển kênh.
- **Quyền:** lãnh đạo cơ sở gửi toàn cơ sở, được tự soạn, sửa mẫu và kênh; lãnh đạo tổ gửi trong tổ mình theo mẫu, chỉ xem mẫu và kênh; cán bộ chỉ xem các lần gửi có NNT mình phụ trách.
- **"Đã tiếp nhận" thay "Đã giao":** iHanoi chưa xác minh có xác nhận tin đã tới máy, nên mức cao nhất là "đã tiếp nhận". Tin "chưa rõ" (hết giờ chờ) không tự gửi lại để tránh gửi trùng.
- Chưa làm: quản lý policy theo loại thông báo (kênh gửi ngay, kênh dự phòng, người dùng được tắt kênh), đối soát thủ công tin "chưa rõ", gửi lại có kiểm soát (DLQ), Email/Zalo thật.
- Đã giao (DELIVERED) là tập con của Đã gửi Noti (SENT); không cộng lẫn lỗi giao vào Gửi thất bại.
- NNT có thông báo trong kỳ ≠ NNT còn nghĩa vụ.

### Phần Quản lý HKD (thêm 06/11/2026, dữ liệu minh họa)

Người dùng yêu cầu 4 nhóm chức năng và đồng ý làm bằng mock trước. Mock nằm ở `web/src/api/hkdApi.ts` (seed cố định); **mọi con số, định nghĩa nhóm và thời gian xử lý đều là giả định, chưa đối chiếu nghiệp vụ hay nguồn dữ liệu thật.**

- **Chỉ tiêu hằng ngày:** tờ khai tiếp nhận, tỷ lệ xử lý thành công, tỷ lệ nộp thuế theo hồ sơ, số hộ đăng ký app nhưng chưa nộp tờ khai; theo 30 ngày, 8 tuần và theo đơn vị. Giả định: "theo cơ quan thuế" = theo đơn vị quản lý (tổ hoặc cán bộ), vì cơ sở chỉ có một cơ quan thuế.
- **Cơ cấu và tuân thủ:** theo địa bàn (5 phường minh họa), doanh thu năm, loại hình kinh doanh; 4 nhóm loại trừ nhau: đã tuân thủ đầy đủ / còn thiếu tờ khai / còn nợ thuế / thiếu tờ khai và nợ thuế. Thêm 3.600 HKD tuân thủ đầy đủ ngoài 6.200 NNT của mục 5 để có nhóm "đủ".
- **Nợ thuế:** số HKD nợ, tổng nợ, nợ quá hạn; xu hướng 12 tháng; báo cáo định kỳ theo tháng tải về dạng Excel (.xlsx). Số tháng trước suy theo xu hướng minh họa.
- **Hỗ trợ HKD:** yêu cầu 30 ngày theo cán bộ, địa bàn, loại; trạng thái mới / đang xử lý / chờ bổ sung / đã giải quyết / từ chối; danh sách chờ HKD bổ sung.
- **Nhắc việc (mục 5, thêm 06/11/2026):** thống kê 4 loại nhắc: sắp đến hạn (nghĩa vụ khai/nộp còn 0–7 ngày), quá hạn chưa làm, việc phải làm (nghĩa vụ đã phát sinh, còn trên 7 ngày tới hạn), sắp đạt ngưỡng doanh thu (doanh thu từ đầu năm đạt mức "gần ngưỡng" trong Thiết lập, mặc định 80%, của mốc 1 / 3 / 50 tỷ). Mỗi loại có HKD đã nhắc, thông báo đã gửi, tỷ lệ đã tiếp nhận, HKD hoàn thành sau nhắc, HKD còn phải nhắc; biểu đồ 30 ngày; bảng theo mốc doanh thu (nút sang Thiết lập) và theo đơn vị. Số HKD theo hạn lấy từ cùng dữ liệu NNT với Thống kê; số thông báo, tỷ lệ tiếp nhận và tỷ lệ hoàn thành là hệ số giả định. Giả định: "phải làm một việc" = nghĩa vụ trong hạn (chưa tới cửa sổ sắp hạn); "hoàn thành sau nhắc" không áp dụng cho ngưỡng doanh thu.
- **Phạm vi:** giống Thống kê (lãnh đạo cơ sở so sánh tổ, lãnh đạo tổ so sánh cán bộ trong tổ, cán bộ cố định NNT mình phụ trách).
- Chưa có: nguồn dữ liệu tờ khai, nợ, yêu cầu hỗ trợ thật; định nghĩa chính thức "xử lý thành công", "nộp thuế theo hồ sơ"; báo cáo định kỳ theo mẫu biểu của cơ quan thuế; lọc theo khoảng thời gian.

## Brand Commitments

- Tên sản phẩm trên UI: **Quản trị thông báo**.
- Logo: biểu trưng Thuế thành phố Hà Nội (`logo/images.jpg`, bản tròn nền trong suốt ở `web/public/logo-thue-ha-noi.png`, favicon `web/public/favicon.png`), kèm dòng "Thuế thành phố Hà Nội" dưới tên sản phẩm.
- Brand theo logo (03/11/2026): đỏ **Pantone 199 C `#D50032`** / hover `#B5002B` / active `#950023` / subtle `#FDF0F3`; vàng **Pantone 108 C `#FEDB00`** chỉ dùng trên nền đỏ đậm (mục đang mở ở sidebar). Mã Pantone là màu gần nhất đo từ ảnh logo, **chưa đối chiếu cẩm nang nhận diện chính thức**; các bậc hover/active/subtle pha từ 199 C. Phần còn lại giữ token 02/11/2026: nền app `#F8FAFC`, card `#FFFFFF`, viền `#E2E8F0` / hover `#94A3B8`; chữ `#0F172A` / `#64748B`; success `#10B981`, warning `#F59E0B`, danger `#7F1D1D`. Chữ trên màu dùng cặp tương phản đã mô tả tại mục “Màu và phản hồi hiện hành” trong DESIGN.md.
- Phong cách corporate theo mẫu cập nhật 02/11/2026: card dashboard bo 12px, bóng nhẹ khi nghỉ; hover viền Slate 400, bóng nổi và nâng 2px. Nút chính chữ trắng, hover Red 700, active Red 800 và scale 0,98. Đây là yêu cầu thay thế quy tắc flat trước đó.
- Sidebar desktop 272px (tăng từ 240px ngày 04/11/2026: logo 40px, tên 16px, mục điều hướng 15px cao 46px kèm icon 18px); nút thu gọn đặt cạnh logo; thu gọn là ẩn hẳn. Khi ẩn, hover-peek từ nút mở trên topbar hoặc mép trái (đè lên nội dung, không đẩy layout). Mobile: bottom nav theo các màn được phép xem (tối đa 7 mục với lãnh đạo cơ sở; từ 6 mục chữ nhỏ 11px, một dòng).
- Hover lift áp cho card dashboard và mục điều hướng sidebar; tắt dịch chuyển khi prefers-reduced-motion.
- Không có công tắc giả lập trạng thái trong giao diện. Lần tải đầu hiện skeleton; đổi bộ lọc thì vùng kết quả giữ số cũ, làm mờ và tạm khóa bấm tới khi có số mới (05/11/2026, để giữ vị trí đọc và cấu trúc ổn định).
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


### Rút gọn theo nghiệp vụ (06/11/2026)

Theo yêu cầu gộp chức năng trùng của người dùng, điều hướng còn 5 mục: Thống kê, Quản lý HKD, Thông báo, Thiết lập, Tài khoản (mục Tài khoản vẫn theo quyền).

- **Thống kê:** chỉ số và xu hướng vận hành gửi; danh sách thông báo. Nút xem đợt mở tab Đợt tự động trong Thông báo; KPI NNT có thông báo mở danh sách nghĩa vụ trong Quản lý HKD, giữ phạm vi và kỳ.
- **Thông báo:** ba tab Gửi chủ động / Đợt tự động / Thư viện mẫu. Gửi chủ động có form tạo và theo dõi kết quả; Đợt tự động giữ duyệt, tạm dừng, tiếp tục, hủy theo quyền; thư viện giữ nháp, xuất bản và lịch sử phiên bản. Chọn mẫu trong form Gửi chủ động; thư viện không có nút gửi. Hai loại gửi giữ trạng thái riêng vì luồng nghiệp vụ khác nhau.
- **Quản lý HKD:** bổ sung Danh sách nghĩa vụ, chuyển cả biểu đồ nghĩa vụ từ Thống kê sang đây. Hiệu quả nhắc việc tập trung số HKD còn việc, đã nhắc, hoàn thành sau nhắc, theo loại/đơn vị/ngưỡng; bỏ biểu đồ và cột kết quả truyền thông báo lặp với Thống kê.
- **Thiết lập:** hai tab Quy tắc nhắc tự động / Kênh gửi; quyền cũ giữ nguyên. Đổi sang Kênh gửi khi có quy tắc chưa lưu phải xác nhận bỏ thay đổi. Nhãn thao tác nêu phạm vi toàn kênh / đợt này / tạo đợt mới.
- Link cũ Mẫu tin, Kênh gửi, Thống kê tab NNT/Đợt gửi vẫn mở nội dung tại vị trí mới, giữ bộ lọc.
- **Đề xuất đã triển khai**, chưa xác nhận bằng thử nghiệm người dùng: kiểm chứng hai nhiệm vụ tìm đợt gửi lỗi và tìm HKD quá hạn chưa hoàn thành; đo chọn đúng nơi bắt đầu, tỷ lệ hoàn thành và thời gian. Không suy diễn dữ liệu nhắc việc minh họa thành số liệu vận hành thực.

### Phân chia giao diện theo view.docx (10/11/2026)

- **Bằng chứng:** `web/doc/view.docx` chia nội dung thành Cán bộ và Lãnh đạo, không yêu cầu thêm mục điều hướng hoặc tab Lãnh đạo.
- **Quyết định triển khai:** dùng các màn nghiệp vụ hiện có và hiển thị theo quyền. Số liệu tổng hợp, so sánh cơ sở và hiệu quả cán bộ nằm trong Thống kê cho lãnh đạo cơ sở; bảng Theo đơn vị nằm trong Quản lý HKD cho lãnh đạo; phân quyền nằm trong Tài khoản. Link `#/lanh-dao` từ bản làm sai mở về Thống kê.
- **Chưa xác nhận:** quyền so sánh 25 Thuế cơ sở, mẫu số tỷ lệ nộp tờ khai và chỉ số đánh giá cán bộ. Số liệu tổng hợp hiện là mock 30 ngày đến 28/10/2026, có phạm vi và kỳ riêng với bộ lọc thông báo.
