# Web quản trị Engagement — đặc tả 2 view responsive và mockup Stitch

## 1. Mục tiêu và phạm vi

Web riêng cho cán bộ thuế, có đúng **hai màn hình chính**:

1. **Cấu hình thông báo:** quản lý loại thông báo, lịch quét, khung gửi, điều kiện và tần suất nhắc.
2. **Tổng hợp, thống kê:** theo dõi số thông báo, kết quả gửi/giao, NNT theo nghĩa vụ và vận hành đợt gửi.

Chi tiết, xem trước, lịch sử và xác nhận mở bằng drawer/modal/overlay ngay trong hai màn; không thêm trang chi tiết, menu job, báo cáo, mẫu, quản trị người dùng hoặc giám sát kỹ thuật riêng. Mẫu chỉ xem trước, không có chức năng soạn–duyệt mẫu trong phạm vi này.

**Đầu ra thiết kế:** 4 mockup chính — cấu hình desktop, cấu hình mobile, thống kê desktop, thống kê mobile — cùng các biến thể tương tác ở mục 8. Một web responsive, cùng nguồn dữ liệu, chức năng và quyền trên mọi thiết bị.

### Người sử dụng và quyền

| Đối tượng | Phạm vi dữ liệu | Cấu hình | Vận hành |
|---|---|---|---|
| Cán bộ đơn vị | NNT và đợt thuộc đơn vị được phân công | Xem cấu hình chung và xem trước; không sửa cấu hình toàn hệ thống | Xem trước, duyệt, tạm dừng, tiếp tục, hủy đợt của đơn vị khi được cấp quyền |
| Quản trị trung tâm | Các đơn vị được phép quản lý, có thể chọn toàn hệ thống | Sửa cấu hình chung, lưu–áp dụng trực tiếp, chọn thời điểm hiệu lực | Theo dõi và vận hành các đợt trong phạm vi được cấp |
| Tài khoản chỉ đọc | Phạm vi được phân công | Chỉ xem | Không có nút ghi/thay đổi trạng thái |

Quyền được kiểm tra ở backend. Cán bộ không được đổi tham số đơn vị để đọc hoặc tác động sang đơn vị khác. Đợt chung phải có phạm vi vận hành theo đơn vị trước khi cho phép thao tác; không dùng danh sách đã lọc để dừng/hủy một đợt toàn hệ thống.

## 2. Quy chuẩn giao diện chung

### Điều hướng và bố cục responsive

| Kích thước | Điều hướng | Bố cục |
|---|---|---|
| Desktop ≥1200 px | Sidebar rộng **240 px**, đúng hai mục **Thống kê / Cấu hình** | Header 64 px, padding nội dung 24 px; form và biểu đồ có thể đặt cạnh nhau |
| Tablet 768–1199 px | Sidebar thu gọn **64 px**, icon có nhãn hỗ trợ | Padding 20 px; form, KPI và biểu đồ tự xuống hàng, không ép giữ bố cục desktop |
| Mobile <768 px | Header gọn 56 px; thanh điều hướng dưới gồm **Thống kê / Cấu hình**, nhãn luôn hiện | Padding 16 px, nội dung một cột; form và danh sách tối ưu cho chạm |

- Mockup chuẩn: desktop **1440 × 1024**, mobile **390 × 844**. Được cuộn dọc; không ép toàn bộ nội dung vào một màn hình vật lý.
- Kiểm tra thêm 360, 768 và 1024 px. Không tràn ngang toàn trang.
- Thanh điều hướng dưới cao tối thiểu 56 px, cộng safe area. Thanh nút cố định đặt **phía trên** điều hướng, có khoảng đệm nội dung đủ lớn để không che phần cuối.
- Khi mở overlay toàn màn hình trên mobile, tạm ẩn điều hướng chính; overlay có header quay lại và thanh thao tác riêng. Đóng overlay trở về đúng tab/bộ lọc/vị trí trước đó.
- Bàn phím, safe area và màn hình xoay không che trường đang nhập/nút xác nhận. Không dùng chiều cao cố định khiến form không cuộn được.

### Design tokens

| Thành phần | Quy định |
|---|---|
| Phong cách | Giao diện nghiệp vụ rõ ràng, nền sáng, mật độ vừa phải; ưu tiên số liệu và thao tác |
| Màu chính | Xanh **`#1677FF`**; nền trang `#F5F7FA`, thẻ trắng; viền `#E5E7EB` |
| Trạng thái | Xanh dương: đang xử lý/thông tin; xanh lá: hoàn tất; vàng: chờ duyệt/cần chú ý; đỏ: lỗi; xám: tắt/chưa có dữ liệu. Luôn kèm chữ/icon, không dùng riêng màu |
| Chữ | Inter hỗ trợ tiếng Việt; tiêu đề trang 24 px desktop/20 px mobile; nội dung 14–16 px; **trường nhập mobile tối thiểu 16 px** |
| Thẻ và khoảng cách | Bo góc 8 px; khoảng cách khối 16–24 px; hạn chế bóng đổ |
| Vùng chạm | Tối thiểu **44 × 44 px** cho nút/icon/toggle; label bấm được với checkbox/switch |
| Số và ngày | Phân tách nghìn kiểu Việt Nam: `10.000`; tiền có đơn vị đồng; ngày `dd/MM/yyyy`, giờ 24h; lịch dùng giờ Việt Nam |
| Tương tác | Focus rõ, dùng được bằng bàn phím; tooltip có cách mở bằng chạm, không phụ thuộc hover |

Tên sản phẩm trên UI: **Quản trị thông báo**. Không đưa cron, tên biến môi trường, URL database, token hoặc tên queue lên form nghiệp vụ.

## 3. View 1 — Cấu hình thông báo

### 3.1. Mục tiêu và bố cục

Người dùng cần trả lời được: nhóm nào đang bật, job chạy lúc nào, thông báo gửi lúc nào, điều kiện/tần suất nhắc là gì và thay đổi sẽ có hiệu lực khi nào.

**Desktop, từ trên xuống:**

1. Header ứng dụng và tài khoản; sidebar chọn **Cấu hình**.
2. Tiêu đề **Cấu hình thông báo**, mô tả ngắn; nhãn **Phạm vi: Toàn hệ thống**, **Phiên bản 12 — Đang áp dụng**; dòng người cập nhật/thời điểm, liên kết **Lịch sử thay đổi**.
3. Vùng hai cột: danh mục cấu hình rộng 240 px bên trái; form chiếm phần còn lại. Mặc định chọn **Cấu hình chung**.
4. Form chia card: **Lịch rà soát**, **Khung giờ gửi**, **Kiểm soát đợt gửi**. Trường ngắn có thể đặt hai cột.
5. Thanh thao tác cố định cuối vùng form: trạng thái **Chưa có thay đổi / Có thay đổi chưa lưu**, nút **Hủy thay đổi**, **Xem trước**, **Lưu và áp dụng**.

**Mobile:** giữ thông tin phiên bản/phạm vi dưới tiêu đề; danh mục bên trái đổi thành dropdown **Nhóm cấu hình**; các card thành accordion một cột. Mở sẵn khối đầu tiên, các khối còn lại có dòng tóm tắt giá trị. Thanh cuối hiển thị **Xem trước / Lưu và áp dụng**; **Hủy thay đổi** là nút chữ trong vùng form. Cán bộ chỉ đọc không có thanh lưu.

### 3.2. Danh mục nhóm

| Mục chọn | Nội dung form |
|---|---|
| **Cấu hình chung — D2** | Quét tự động, lịch quét/quét bù, khung gửi, nhịp điều phối và duyệt đợt bất thường |
| **D1a — Nhắc khai thuế** | Trạng thái sử dụng, cửa sổ nhắc trước hạn, nhắc quá hạn, nguyên tắc gộp và lịch chung đang kế thừa |
| **D1b — Nhắc nộp thuế** | Nhắc phần còn phải nộp, cửa sổ trước hạn/quá hạn, nguyên tắc gộp và lịch chung |
| **D1c — Trạng thái HKD** | Quy tắc theo trạng thái NNT và cách tính mốc nhắc từ ngày hiệu lực; tham số chưa có trong runtime hiển thị **Chưa sử dụng** |
| **D3 — Trả kết quả chuyển tuyến** | Mô tả và tình trạng sử dụng; không tạo giá trị thời gian giả khi chưa có quy tắc/nguồn |
| **D4 — Cảnh báo doanh thu** | Bật/tắt, gần ngưỡng, dự báo, quy tắc gửi lại nội dung liên quan; xem ngưỡng chính sách chỉ đọc |
| **D5 — Thông báo chung** | Mô tả nội dung theo sự kiện và tình trạng sử dụng |
| **D6 — Tiện ích ngân hàng** | Mô tả nội dung/nguồn và tình trạng sử dụng |

Mỗi mục có nhãn **Đang bật / Đang tắt / Chưa sử dụng**. Trong dữ liệu mockup: D1a, D1b, D4 đang bật; D1c, D3, D5, D6 chưa sử dụng. Đây là tình huống giả lập phục vụ thiết kế, không phải xác nhận env đang triển khai.

Nhóm chưa sử dụng vẫn chọn được để đọc mô tả, nhưng không có toggle bật hoặc form cho lưu. Không coi việc chốt nghiệp vụ trong tài liệu là đã có runtime tương ứng.

### 3.3. Trường cấu hình và giá trị ban đầu

Các giá trị dưới đây lấy từ repo ngày đối chiếu. Việc chỉnh trực tiếp trên web là chức năng cần bổ sung; một số giá trị hiện là hằng số hoặc env.

| Khối | Nhãn UI / điều khiển | Giá trị ban đầu / cách thể hiện |
|---|---|---|
| Lịch rà soát | **Quét tự động** — switch | Mặc định true trong code. Tắt chỉ dừng việc tự quét/tạo danh sách; không diễn đạt thành dừng mọi đợt đang gửi |
| Lịch rà soát | **Tần suất rà soát** — select | Hằng ngày; hiển thị **Giờ rà soát 02:00** bằng time picker. Không cho nhập cron tự do trong v1 |
| Lịch rà soát | **Quét bù từ** — time picker | **02:30**; giải thích quét bù khi lượt chính bị lỡ |
| Lịch rà soát | **Các lần chạy tiếp theo** — danh sách chỉ đọc | Ba ngày/giờ tới, tính theo giá trị form đang xem và giờ Việt Nam; trạng thái tắt thì không có lượt tự chạy |
| Khung gửi | **Bắt đầu gửi / Kết thúc gửi** — time picker | **06:00 / 10:00**, trong cùng ngày; kết thúc không bao gồm 10:00 |
| Khung gửi | **Múi giờ** — chỉ đọc | Giờ Việt Nam (`Asia/Ho_Chi_Minh`) |
| Khung gửi | **Kiểm tra đợt đến lượt** — chỉ đọc | Mỗi **5 phút** |
| Kiểm soát đợt | **Giữ đợt tăng bất thường để duyệt** — switch | Mặc định bật |
| Kiểm soát đợt | **Hệ số tăng**; **Lịch sử so sánh**; **Số đợt tối thiểu** — số nguyên | **3 lần / 7 đợt / 3 đợt**. Giải thích: giữ khi lớn hơn 3 lần trung vị tối đa 7 đợt hoàn tất có dữ liệu, khi có ít nhất 3 đợt lịch sử |
| D1a/D1b | **Nhắc trước hạn** — số ngày | **7 ngày**; hiện hai loại dùng chung tham số này. V1 hiển thị cùng giá trị dùng chung, không tạo hai bộ lịch độc lập |
| D1a/D1b | **Tần suất nhắc**; **Nhắc quá hạn**; **Gộp nghĩa vụ** — tóm tắt chỉ đọc | Hằng ngày; tiếp tục xét việc chưa hoàn thành; một thông báo nhắc nghĩa vụ/NNT/ngày |
| D1a/D1b | **Nhắc nghĩa vụ khai và nộp** — switch dùng chung | Hiện cùng được điều khiển bằng một cờ nghiệp vụ; đổi ở một mục phải thể hiện tác động lên cả hai. Không giả lập hai switch độc lập |
| D4 | **Cảnh báo doanh thu** — switch | Mặc định false trong code; mockup chọn bật để thể hiện đầy đủ form |
| D4 | **Gần ngưỡng hóa đơn** — phần trăm | **80%**, lấy tỷ lệ trên ngưỡng chính sách; giá trị hợp lệ lớn hơn 0 và nhỏ hơn 100 |
| D4 | **Biên dự báo ban đầu** — phần trăm | **20%**, giảm theo phần thời gian còn lại của năm |
| D4 | **Số ngày tối thiểu để dự báo** — số ngày | **30** |
| D4 | **Khoảng cách xác nhận**; **Số lần xác nhận** | **7 ngày / 2 lần** |
| D4 | **Chu kỳ nhắc khuyến khích lên doanh nghiệp** — số ngày | **7**; nội dung này theo dõi cùng lượt rà soát nhưng có điều kiện nghiệp vụ riêng |
| D4 | **Ngưỡng chính sách** — bảng chỉ đọc | Mã/ý nghĩa, số tiền, đơn vị, phiên bản và ngày hiệu lực từ Configuration. Số minh họa: 1 tỷ, 3 tỷ, 50 tỷ đồng; không cho chỉnh tại đây |

Không thêm form chỉnh tham số bí mật, địa chỉ hạ tầng hoặc vai process. Ngưỡng pháp lý/chính sách của Configuration và tỷ lệ/nhịp nhắc tại Engagement phải được trình bày riêng.

### 3.4. Hành vi form và lưu cấu hình

- Khi thay đổi, đánh dấu trường đã sửa và hiện **Có thay đổi chưa lưu**. Không mất dữ liệu khi accordion đóng, đổi kích thước hoặc mở xem trước.
- Chuyển nhóm/rời màn khi đang sửa: hỏi **Tiếp tục chỉnh sửa / Bỏ thay đổi**; không tự lưu.
- Lỗi nằm ngay dưới trường; thông báo tổng ở đầu form chỉ xuất hiện khi lưu. Giờ kết thúc phải sau giờ bắt đầu. Trong v1, giờ quét chính trước quét bù và quét bù trước hết khung gửi; nếu tắt quét tự động thì các trường lịch được giữ nhưng không áp lịch tự chạy.
- Số ngày là số nguyên phù hợp; nhắc trước hạn không âm; biên dự báo 0–100%; ngày tối thiểu/số lần xác nhận ≥1, khoảng cách xác nhận ≥0; chu kỳ gửi lại >0. Hiển thị đơn vị bên cạnh số, không bắt nhập kèm chữ.
- **Xem trước** mở kết quả từ bản đang sửa, có nhãn **Bản xem trước — chưa áp dụng**. Bao gồm lịch gần nhất và mẫu thông báo với dữ liệu minh họa. Không tạo thông báo thật.
- **Lưu và áp dụng** mở xác nhận trước–sau, liệt kê nhóm bị ảnh hưởng. Chọn **Áp dụng ngay cho các đợt mới** hoặc **Từ ngày, giờ chỉ định**. Không có bước người thứ hai duyệt cấu hình.
- Khi lưu phải nhập **Lý do thay đổi**; ghi người sửa, thời điểm, phiên bản và hiệu lực. Lưu thành công hiện phiên bản mới hoặc nhãn **Chờ hiệu lực** với ngày cụ thể.
- Đợt đã tạo/đang chạy giữ cấu hình đã ghi nhận. Không sửa ngầm giờ hoặc nội dung của đợt cũ khi lưu cấu hình mới.
- Nếu người khác đã sửa cấu hình, hiển thị **Cấu hình đã được cập nhật** và mở so sánh; không ghi đè âm thầm. Giữ bản nhập để người dùng đối chiếu.
- **Lịch sử thay đổi** là drawer/overlay chỉ đọc: phiên bản, người sửa, lý do, thời điểm, hiệu lực và bảng trước–sau. Không có menu lịch sử riêng.

### 3.5. Bố cục xem trước và xác nhận

| Thành phần | Desktop | Mobile |
|---|---|---|
| Xem trước | Drawer phải 480–560 px, hai tab **Lịch chạy / Nội dung** | Overlay toàn màn hình, header quay lại; cùng hai tab |
| Nội dung | Khung iHanoi nhỏ cho bản đẩy; khối nội dung đầy đủ bên dưới | Hai khối xếp dọc, không thu nhỏ chữ để nhét trong hình điện thoại |
| Xác nhận lưu | Modal rộng khoảng 640 px, bảng Trường/Đang áp dụng/Giá trị mới | Bottom sheet có vùng nội dung cuộn, mỗi thay đổi là một thẻ trước–sau |
| Trường xác nhận | Thời điểm hiệu lực, lý do và mô tả phạm vi | Cùng nội dung, input full-width; footer không bị bàn phím che |

## 4. View 2 — Tổng hợp, thống kê thông báo

### 4.1. Bố cục và bộ lọc

**Desktop:** sidebar chọn **Thống kê**; tiêu đề **Tổng hợp, thống kê thông báo**; bộ lọc ngang; sáu KPI; hai biểu đồ cạnh nhau; bảng chi tiết với ba tab. Hiện **Cập nhật lúc 28/10/2026, 09:15** và nút **Làm mới**. Không thêm menu điều hướng ngoài hai mục chính.

**Mobile:** tiêu đề gọn **Thống kê thông báo**; thẻ khoảng ngày và nút **Bộ lọc (n)**; KPI hai cột × ba hàng; biểu đồ xếp dọc; ba tab **Thông báo / NNT / Đợt gửi**. Danh sách là card, có phân trang, không phải bảng nhiều cột cuộn ngang.

| Bộ lọc | Giá trị/hành vi |
|---|---|
| Đơn vị | Cán bộ một đơn vị: giá trị cố định. Người có nhiều đơn vị: chỉ chọn trong danh sách được cấp. Quản trị có thể chọn toàn hệ thống nếu có quyền |
| Khoảng ngày thông báo | Mặc định **7 ngày**, mockup 22/10–28/10/2026. Preset Hôm nay/7 ngày/30 ngày/Tùy chọn; ngày đầu và cuối tính theo lịch Việt Nam |
| Nhóm thông báo | Tất cả hoặc các nhóm D1a, D1b, D1c, D3, D4, D5, D6. D2 là cấu hình chung, không phải loại thông báo để đếm |
| Chi tiết danh sách | Tìm theo tên/MST; trạng thái gửi/giao; trạng thái đợt chỉ hiện khi mở tab tương ứng |
| Hành động | **Áp dụng bộ lọc**, **Đặt lại**, **Làm mới**. Không gọi lại API liên tục khi đang nhập ngày/tìm kiếm |

Trên mobile, bộ lọc đầy đủ mở bằng bottom sheet; có header, nút đóng, nội dung cuộn và footer **Đặt lại / Áp dụng**. Trên màn chính hiện các chip điều kiện đang áp dụng, có thể bỏ từng chip không bắt buộc. Đơn vị cố định theo quyền không có nút xóa.

### 4.2. Định nghĩa KPI và cách tính

KPI thông báo dùng **cùng một tập thông báo phát sinh trong khoảng ngày đã chọn**, theo ngày tạo thông báo, và hiển thị trạng thái hiện tại tại lần cập nhật. Không trộn “đã gửi trong kỳ” của tập khác vào tổng này. UI có chú thích ngắn: **Thông báo phát sinh trong kỳ, kết quả cập nhật hiện tại**.

| KPI | Định nghĩa | Nhấn vào |
|---|---|---|
| **Tổng thông báo** | Số `notification` duy nhất thuộc tập lọc | Tab Thông báo, bỏ lọc trạng thái |
| **Đã gửi Noti** | Thông báo có kết quả gửi `SENT`; trung tâm đã nhận, chưa khẳng định giao tới người dùng | Tab Thông báo, lọc Đã gửi Noti |
| **Đã giao** | Thông báo có kết quả giao `DELIVERED`, là một phần của tập đã gửi | Tab Thông báo, lọc Đã giao |
| **Chờ gửi** | Thông báo `PENDING` | Tab Thông báo, lọc Chờ gửi |
| **Gửi thất bại** | Thông báo có kết quả gửi `FAILED`; không cộng lẫn lỗi giao sau khi đã gửi | Tab Thông báo, lọc Gửi thất bại |
| **NNT duy nhất** | Số NNT khác nhau trong tập thông báo được lọc, không đếm theo số item | Danh sách NNT thuộc tập thông báo; hiện chip **Có thông báo trong kỳ** |

NNT có thông báo trong kỳ khác NNT đang còn nghĩa vụ. Tab NNT mặc định hiển thị **nghĩa vụ hiện hành tại ngày chốt nguồn**, ghi rõ ngày đó. Khi mở từ KPI NNT duy nhất, dùng thêm tập NNT có thông báo trong kỳ và thể hiện bằng chip; gỡ chip trở về tập nghĩa vụ hiện hành.

Khi chưa có kết quả giao/polling chưa bật, KPI **Đã giao** hiển thị **— / Chưa có dữ liệu giao**, không hiển thị 0 hoặc giả định bằng số gửi. Các trạng thái chưa rõ, hết hạn, bỏ qua vẫn có thể lọc trong danh sách, dù không có KPI riêng.

### 4.3. Hai biểu đồ

**A. Thông báo phát sinh theo ngày:** biểu đồ cột tổng phát sinh theo từng ngày, kèm đường số đã gửi Noti của cùng tập phát sinh ngày đó. Tooltip có ngày, tổng, đã gửi; không gọi đường này là số gửi theo thời điểm gửi. Nhấn cột để lọc đúng ngày; nhấn lần nữa bỏ lựa chọn. Mobile chạm cột để hiện tooltip và nút **Xem danh sách**.

**B. NNT theo loại nghĩa vụ:** hai thanh cho **Khai thuế / Nộp thuế**, chia **Quá hạn / Sắp hạn / Còn trong hạn**. Mỗi NNT được đếm một lần trong từng loại; nếu có nhiều nghĩa vụ thì lấy mức ưu tiên cao nhất: quá hạn → sắp hạn trong 0–7 ngày → còn trong hạn. Thiếu hạn thì hiển thị nhóm **Chưa rõ hạn** nếu có, không tự xếp trong hạn.

Ghi dưới biểu đồ B: **Ngày chốt nghĩa vụ: 28/10/2026, 02:05. Một NNT có thể thuộc cả khai và nộp; không cộng hai thanh thành tổng NNT.** Nhấn đoạn thanh mở tab NNT cùng điều kiện và ưu tiên tương ứng. Bộ lọc nhóm thông báo không áp vào biểu đồ này; khi nhóm D4/D6 được chọn vẫn giữ nhãn rõ **Nghĩa vụ hiện hành của đơn vị**, tránh hiểu đây là nghĩa vụ của riêng nhóm cảnh báo đó. Đơn vị áp dụng cho cả hai biểu đồ.

### 4.4. Vùng chi tiết — cùng một màn, ba tab

| Tab | Desktop | Mobile |
|---|---|---|
| **Thông báo** | Cột: thời điểm tạo, NNT/MST, nhóm, tiêu đề, kết quả gửi, kết quả giao, xem chi tiết. Tiêu đề hai dòng, phần còn lại mở khi xem | Card: tên/MST, nhóm và ngày, tiêu đề, hai dòng trạng thái **Gửi / Giao**, nút **Xem chi tiết** |
| **NNT** | Cột: tên/MST, trạng thái HKD, số hồ sơ khai còn thiếu, số khoản còn phải nộp, ưu tiên hạn, ngày cập nhật; có liên kết số lượng | Card: tên/MST, trạng thái; hai ô nhỏ Khai/Nộp; ưu tiên và nút **Xem nghĩa vụ** |
| **Đợt gửi** | Cột: mã/ngày, đơn vị, khung giờ, số thông báo/NNT, đã gửi/tổng, trạng thái, xem chi tiết. Có lọc trạng thái đợt | Card: mã/ngày và trạng thái, phạm vi, số lượng, tiến độ có nhãn rõ, nút **Xem đợt gửi** |

Phân trang mặc định 20 dòng/trang; desktop chọn 20/50/100. Mobile giữ 20 và nút **Trước / Sau**, hiển thị vị trí và tổng số; không dùng infinite scroll. Đổi tab giữ bộ lọc chung, đặt lại trang 1 và giữ bộ lọc đặc thù của từng tab khi quay lại.

Nếu một thông báo gộp item khai và nộp, có thể có nhiều nhãn nhóm; lọc D1a hoặc D1b đều tìm thấy nhưng tổng vẫn đếm một notification duy nhất. Khi lọc nhóm chưa vận hành, hiển thị thông tin tình trạng nhóm cùng kết quả rỗng phù hợp, không tự tạo chỉ số hoạt động.

### 4.5. Chi tiết và điều khiển đợt

Desktop dùng drawer khoảng 640 px; mobile dùng overlay toàn màn hình. Mở chi tiết không làm mất bộ lọc/tab/vị trí danh sách.

| Nội dung chi tiết | Các khối cần có |
|---|---|
| Thông báo | Người nhận, đơn vị, nhóm; bản đẩy/nội dung đầy đủ; các nghĩa vụ hoặc căn cứ doanh thu liên quan; trạng thái gửi và giao tách riêng; timeline và đợt liên quan |
| NNT | Thông tin hộ/trạng thái; tab con **Nghĩa vụ / Thông báo** trong overlay; nguồn và ngày cập nhật. Không biến thành trang hồ sơ độc lập |
| Đợt gửi | Mã/ngày/đơn vị; khung gửi, phiên bản cấu hình đã dùng; tổng thông báo và NNT; tiến độ đã gửi; số lỗi, chưa rõ, hết hạn, bỏ qua; lý do giữ/dừng; người duyệt và timeline |

Trên mobile, chỉ cố định tối đa hai hành động thường dùng; hành động bổ sung đặt trong menu **Thao tác**. Nút Hủy đợt có màu nguy hiểm, không đặt sát nút duyệt mà thiếu xác nhận.

| Trạng thái đợt | Nhãn UI | Hành động được thể hiện khi có quyền |
|---|---|---|
| `PLANNED` | Đang lập danh sách | Xem trước, Duyệt khi danh sách sẵn sàng, Hủy |
| `HOLD` | Chờ duyệt | Xem trước, Duyệt, Hủy |
| `APPROVED` | Đã duyệt | Tạm dừng, Hủy |
| `SENDING` | Đang gửi | Tạm dừng, Hủy |
| `PAUSED` | Tạm dừng | Tiếp tục, Hủy |
| `DONE` | Hoàn tất | Chỉ xem |
| `CANCELLED` | Đã hủy | Chỉ xem |

Backend là nguồn xác nhận hành động hợp lệ; nếu đợt đổi trạng thái khi người dùng đang xem, tải lại chi tiết và báo ngắn gọn, không tiếp tục thao tác từ dữ liệu cũ. Không có nút **Gửi ngay**, gửi lại hàng loạt hoặc gọi API giả lập dev/test từ màn production này.

**Modal/bottom sheet xác nhận:** ghi mã đợt, đơn vị, số bản chờ bị tác động và lý do. Tạm dừng/Hủy bắt buộc lý do; duyệt/tiếp tục có lý do tùy chọn. Ví dụ tạm dừng: **Tạm dừng 600 thông báo đang chờ của Đơn vị Thuế A. Các lượt đang gửi có thể hoàn tất.** Hủy chỉ bỏ các bản còn chờ; không xóa lịch sử đã gửi. Thành công cập nhật drawer, bảng và số liệu theo cùng phạm vi.

## 5. Dữ liệu minh họa thống nhất cho các mockup

### 5.1. Bối cảnh chung

- Quản trị trung tâm tên giả **Nguyễn Minh An**; thống kê đang lọc **Đơn vị Thuế A**, 22/10–28/10/2026, tất cả nhóm.
- Cấu hình phạm vi **Toàn hệ thống**, **Phiên bản 12 — Đang áp dụng**, cập nhật 27/10/2026 lúc 15:30. Không đồng nhất phạm vi cấu hình với bộ lọc dữ liệu thống kê.
- Nhắc nghĩa vụ và doanh thu được bật trong bối cảnh mock; các giá trị giờ/ngày/tỷ lệ như mục 3.3. Đây là lựa chọn minh họa, không đổi giá trị mặc định trong repo.
- Thống kê cập nhật 28/10/2026 lúc 09:15; nghĩa vụ chốt 28/10/2026 lúc 02:05. Có ghi chú nhỏ **Dữ liệu minh họa** trong sản phẩm thiết kế.

### 5.2. Bộ số liệu đối chiếu

| Chỉ số | Số liệu |
|---|---:|
| Tổng thông báo trong kỳ | 10.000 |
| Đã gửi Noti | 8.500 |
| Chờ gửi | 600 |
| Gửi thất bại | 400 |
| Chưa rõ kết quả gửi | 100 |
| Hết hạn gửi | 300 |
| Bỏ qua | 100 |
| NNT duy nhất có thông báo trong kỳ | 5.800 |

Tổng trạng thái gửi: **8.500 + 600 + 400 + 100 + 300 + 100 = 10.000**. Trong 8.500 đã gửi, kết quả giao gồm **7.000 đã giao + 800 được iHanoi tiếp nhận + 300 giao thất bại + 400 chưa có kết quả cuối**. KPI Đã giao là 7.000; KPI Gửi thất bại là 400, không cộng thêm 300 lỗi giao.

| Ngày phát sinh | Tổng thông báo | Đã gửi Noti của tập ngày đó |
|---|---:|---:|
| 22/10 | 1.000 | 900 |
| 23/10 | 1.200 | 1.100 |
| 24/10 | 1.300 | 1.200 |
| 25/10 | 1.400 | 1.300 |
| 26/10 | 1.600 | 1.450 |
| 27/10 | 1.800 | 1.600 |
| 28/10 | 1.700 | 950 |

| Loại nghĩa vụ | NNT quá hạn | NNT sắp hạn | NNT còn trong hạn | Tổng NNT theo loại |
|---|---:|---:|---:|---:|
| Khai thuế | 1.700 | 1.800 | 600 | 4.100 |
| Nộp thuế | 1.400 | 1.600 | 500 | 3.500 |

Có **1.400 NNT thuộc cả hai loại**, nên tổng NNT còn nghĩa vụ là **6.200**, khác số **5.800 NNT có thông báo trong kỳ**. Trong từng loại, phân loại theo ưu tiên cao nhất như mục 4.3; mẫu không có nhóm chưa rõ hạn. Ví dụ số nghĩa vụ tương ứng là **5.200 hồ sơ khai / 4.700 khoản nộp**, không dùng hai số này làm số NNT.

### 5.3. Dòng minh họa cho bảng/card

| NNT giả / MST giả | Nhóm, nội dung | Gửi | Giao |
|---|---|---|---|
| Hộ kinh doanh An Bình / 9990000001 | Khai thuế — Nhắc nộp hồ sơ khai thuế quý III/2026 | Đã gửi Noti | Đã giao |
| Nguyễn Minh Phương / 9990000002 | Nộp thuế — Nhắc khoản tiền thuế còn phải nộp | Đã gửi Noti | Đã giao |
| Trần Văn Hòa / 9990000003 | Doanh thu — Doanh thu đang gần ngưỡng sử dụng hóa đơn | Đã gửi Noti | iHanoi đã tiếp nhận |
| Phạm Thị Lan / 9990000004 | Khai thuế — Nhắc hồ sơ còn thiếu | Gửi thất bại | Chưa áp dụng |
| Lê Quốc Hưng / 9990000005 | Nộp thuế — Nhắc khoản sắp đến hạn | Chờ gửi | Chưa áp dụng |

Mỗi dòng có thời điểm tạo trong kỳ và nút xem chi tiết. Không thêm số điện thoại/CCCD thật. Nội dung đầy đủ có thể chứa số tiền; bản đẩy chỉ nêu việc cần làm.

**Đợt minh họa:** `DG-20261028-A`, ngày 28/10, Đơn vị Thuế A, khung 06:00–10:00, **Đang gửi**; 1.700 thông báo, 1.500 NNT; đã gửi 950, chờ 600, gửi lỗi 60, chưa rõ 20, hết hạn 50, bỏ qua 20. Tiến độ ghi **Đã gửi Noti 950/1.700 — 55,9%**, không gọi là tỷ lệ đã giao. Số liệu đợt cộng đúng 1.700.

## 6. Trạng thái giao diện cần thiết kế

| Trạng thái | Cách thể hiện |
|---|---|
| Đang tải | Skeleton giữ vị trí card/form/bảng; nút tải có trạng thái bận, tránh bấm lặp |
| Rỗng theo bộ lọc | “Không có thông báo phù hợp” và **Đặt lại bộ lọc**; các số 0 chỉ dùng khi nguồn xác nhận tập rỗng |
| Chưa sử dụng nhóm | Hiện tình trạng và mô tả; không dựng số liệu hoạt động hoặc cho bật chức năng chưa có |
| Lỗi tải | Lỗi tại khối bị ảnh hưởng, nút **Thử lại**; không xóa các khối vẫn có dữ liệu |
| Dữ liệu cũ | Banner **Dữ liệu chưa cập nhật**, ghi lần cập nhật cuối; số cũ có nhãn, không giả làm mới |
| Thiếu dữ liệu giao | Dấu **—** và chú thích; không thay bằng tỷ lệ 0% |
| Chỉ đọc/thiếu quyền | Nhãn **Chỉ xem**; không hiển thị nút ghi. Nếu hết quyền khi đang thao tác, dừng và báo rõ, không chỉ disable một cách không giải thích |
| Form lỗi | Viền/lỗi ngay dưới trường, focus lỗi đầu khi lưu; vẫn giữ giá trị đang nhập |
| Lưu/thao tác thành công | Thông báo ngắn, phiên bản/trạng thái mới và dữ liệu đã đồng bộ |
| Xung đột cập nhật | Báo cấu hình/đợt đã thay đổi; cho xem dữ liệu mới, giữ phần nhập có thể đối chiếu |

Đổi kích thước không làm đổi dữ liệu được chọn. Nhấn Back/đóng overlay phải trở về cùng trạng thái màn gốc; thông báo lỗi/thành công đọc được cả trên mobile và desktop.

## 7. Công nghệ và khả năng backend cần có

### Công nghệ đề xuất

| Lớp | Công nghệ | Cách sử dụng |
|---|---|---|
| Web | React + TypeScript + Vite | Một ứng dụng responsive riêng, đúng hai route chính |
| UI | [Ant Design](https://ant.design/components/overview/) + CSS responsive | Form, table, select, drawer, modal; dùng card/bottom sheet theo breakpoint, không giữ nguyên bảng desktop trên điện thoại |
| Dữ liệu API | [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) | Tải/cache/refetch dữ liệu, xử lý trạng thái mutation; sau thao tác cập nhật đúng các truy vấn bị ảnh hưởng |
| Biểu đồ | [Apache ECharts](https://echarts.apache.org/handbook/en/get-started/) | Hai biểu đồ responsive, tooltip bằng chạm; có số liệu bằng chữ đi kèm |
| Đăng nhập | [Keycloak/OIDC](https://www.keycloak.org/securing-apps/oidc-layers) | Đăng nhập cán bộ; backend kiểm quyền thao tác và phạm vi đơn vị |
| Backend | NestJS + PostgreSQL + Redis/BullMQ hiện có | Bổ sung API quản trị, cấu hình có phiên bản/hiệu lực và thống kê theo đơn vị |

Bộ lọc/tab/phân trang phản ánh trên URL để tải lại/chia sẻ giữ ngữ cảnh; không đưa thông tin người nhận nhạy cảm hoặc nội dung form chưa lưu vào URL. Draft form giữ trong phiên, được bảo toàn khi đổi breakpoint. Số liệu đang gửi có thể làm mới mỗi 30 giây khi tab Thống kê đang hoạt động; không tự ghi đè form đang sửa.

### Đối chiếu khả năng hiện tại và phần cần bổ sung

| Khả năng | Căn cứ hiện có / việc cần bổ sung |
|---|---|
| Xem, duyệt, dừng, tiếp tục, hủy đợt | Có API `/api/v1/engagement/send-runs`; cần bổ sung/kiểm chứng phân quyền, phạm vi đơn vị và dữ liệu người dùng cán bộ trước khi dùng cho web |
| Xem trước nhắc nghĩa vụ | Có `/reminders/preview`; cần mở rộng hợp đồng phù hợp bộ lọc/preview form, không suy đã hỗ trợ preview mọi nhóm hoặc cấu hình chưa lưu |
| Dashboard, danh sách thông báo/NNT | Cần API tổng hợp theo định nghĩa mục 4; phân trang phía server, khử trùng theo notification/NNT và cấp thông tin độ mới dữ liệu |
| NNT theo đơn vị/loại nghĩa vụ | Kết hợp nguồn quản lý NNT Taxpayer và nghĩa vụ hiện hành Tax Obligation; không suy chỉ từ các notification đã tạo |
| Cấu hình động | Cần lưu phiên bản/ngày hiệu lực và áp dụng lịch job tương ứng. Một số giá trị hiện nằm trong code/env; không thiết kế web ghi trực tiếp `.env` |
| Lịch sử | Có nền audit nhưng cần API đọc phục vụ drawer; ghi đầy đủ actor, đơn vị, lý do, trước–sau và kết quả thao tác |
| Phạm vi đợt | Dữ liệu hiện tại không được mặc định đã tách đợt theo đơn vị; cần có ranh giới đợt/tác động của đơn vị trước khi cho cán bộ vận hành |

Phần này là căn cứ để triển khai sau mockup, không đưa tên bảng/field nội bộ vào màn cho cán bộ. Không dùng endpoint simulate chỉ dành dev/test để gửi thử từ production.

## 8. Prompt cho Stitch

### Cách sử dụng

Tạo cùng một bộ thiết kế. Dùng 4 prompt chính dưới đây, giữ nguyên tên sản phẩm, màu, typography, dữ liệu và đơn vị giữa các màn. Các prompt yêu cầu vẽ UI, không phải triển khai backend. Sau 4 màn chính, tạo các biến thể tương tác trong cùng view theo mục 8.5; không thêm mục điều hướng.

### 8.1. Prompt — Cấu hình desktop (CFG-D)

```text
Thiết kế mockup high-fidelity web “Quản trị thông báo” cho cán bộ thuế Việt Nam, desktop 1440×1024, cuộn dọc được. Chỉ có hai màn chính Thống kê và Cấu hình. Đây là màn Cấu hình; tài khoản Nguyễn Minh An, Quản trị trung tâm. Toàn bộ nhãn tiếng Việt đúng dấu.

Phong cách nghiệp vụ sáng, rõ và gọn: Inter, primary #1677FF, nền #F5F7FA, card trắng, viền #E5E7EB, bo 8px. Sidebar 240px với tên ứng dụng và đúng hai mục Thống kê/Cấu hình, Cấu hình đang chọn. Header 64px; content padding 24px. Không tạo menu quản trị người dùng, mẫu, job, lịch sử hay trang báo cáo riêng.

Tiêu đề “Cấu hình thông báo”; nhãn “Phạm vi: Toàn hệ thống”, “Phiên bản 12 — Đang áp dụng”; dòng “Nguyễn Minh An cập nhật 27/10/2026, 15:30”, liên kết “Lịch sử thay đổi”. Vùng dưới có danh mục nhóm 240px và form: Cấu hình chung — D2 (đang chọn), D1a Nhắc khai thuế, D1b Nhắc nộp thuế, D1c Trạng thái HKD, D3 Trả kết quả chuyển tuyến, D4 Cảnh báo doanh thu, D5 Thông báo chung, D6 Tiện ích ngân hàng. D1a/D1b/D4 bật; D1c/D3/D5/D6 ghi Chưa sử dụng.

Form Cấu hình chung gồm 3 card. Lịch rà soát: switch Quét tự động đang bật; Tần suất Hằng ngày; Giờ rà soát 02:00; Quét bù từ 02:30; ba lần chạy kế tiếp 29/10, 30/10, 31/10 lúc 02:00. Khung giờ gửi: Bắt đầu 06:00, Kết thúc 10:00; chỉ đọc Giờ Việt Nam và Kiểm tra đợt đến lượt mỗi 5 phút. Kiểm soát đợt gửi: switch Giữ đợt tăng bất thường để duyệt bật; hệ số 3 lần, lịch sử 7 đợt, tối thiểu 3 đợt. Có giải thích ngắn cạnh nhóm trường, không hiển thị cron hay tên biến môi trường.

Thanh thao tác cố định dưới vùng form: trạng thái Có thay đổi chưa lưu, Hủy thay đổi, Xem trước, Lưu và áp dụng. Chừa khoảng đệm không che nội dung. Liên kết lịch sử và xem trước mở drawer, không mở trang mới. Ghi chú nhỏ Dữ liệu minh họa. Vẽ layout thực tế, không dùng ảnh trang trí, không nhồi nhiều cửa sổ modal vào mockup nền.
```

### 8.2. Prompt — Cấu hình mobile (CFG-M)

```text
Vẽ phiên bản mobile responsive của cùng web “Quản trị thông báo”, frame 390×844, cùng ngôn ngữ tiếng Việt, Inter, màu #1677FF, nền #F5F7FA và dữ liệu như màn cấu hình desktop. Đây là web chạy trên điện thoại, không phải một ứng dụng khác.

Header gọn 56px có tên sản phẩm/tài khoản. Content padding 16px, một cột, cuộn dọc tự nhiên; không sidebar, không tràn ngang. Thanh điều hướng dưới cố định có hai mục Thống kê và Cấu hình, cả icon lẫn chữ; Cấu hình đang chọn, có safe area.

Đầu trang: Cấu hình thông báo; Phạm vi Toàn hệ thống; Phiên bản 12 — Đang áp dụng; thông tin cập nhật rút gọn và Lịch sử thay đổi. Dropdown Nhóm cấu hình đang chọn Cấu hình chung — D2, thay cho danh mục desktop. Các khối form dùng accordion, mở Lịch rà soát; nhãn nằm trên input, input ít nhất 16px, vùng chạm ít nhất 44px. Hiện Quét tự động bật, Hằng ngày, Giờ rà soát 02:00, Quét bù từ 02:30 và lịch chạy kế tiếp. Hai accordion sau có summary: Khung gửi 06:00–10:00, Giờ Việt Nam; Kiểm soát đợt: Giữ để duyệt khi tăng trên 3 lần. Cho thấy người dùng có thể mở để sửa đầy đủ, không mất chức năng trên mobile.

Thanh Xem trước / Lưu và áp dụng nằm ngay phía trên thanh điều hướng dưới, không chồng lên nhau hoặc che form. Hủy thay đổi là nút chữ trong form. Chừa padding cuối và safe area. Ghi chú nhỏ Dữ liệu minh họa. Lịch sử/xem trước mở overlay toàn màn hình có quay lại; xác nhận lưu dùng bottom sheet, không thêm màn điều hướng chính. Không co bảng desktop hay dùng chữ nhỏ để vừa điện thoại.
```

### 8.3. Prompt — Thống kê desktop (STAT-D)

```text
Thiết kế màn “Tổng hợp, thống kê thông báo” của cùng web Quản trị thông báo, desktop 1440×1024, cuộn dọc. Dùng Inter, #1677FF, nền sáng #F5F7FA, card trắng, viền nhẹ, bo 8px; sidebar 240px chỉ có Thống kê/Cấu hình, đang chọn Thống kê; header 64px, padding 24px. Tài khoản Nguyễn Minh An — Quản trị trung tâm.

Thanh lọc ngang: Đơn vị Thuế A, 22/10–28/10/2026, Tất cả nhóm, Áp dụng bộ lọc, Đặt lại. Góc tiêu đề có Làm mới và Cập nhật lúc 28/10/2026, 09:15. Dòng chú thích: Thông báo phát sinh trong kỳ, kết quả cập nhật hiện tại.

Một hàng 6 KPI: Tổng thông báo 10.000; Đã gửi Noti 8.500; Đã giao 7.000; Chờ gửi 600; Gửi thất bại 400; NNT duy nhất 5.800. Thẻ nhấn được để lọc bảng. Phân biệt rõ đã gửi trung tâm với đã giao, không ghi đã đọc. Không dùng tổng các KPI như các phần cộng được của một biểu đồ vì đã giao nằm trong đã gửi.

Hai biểu đồ cạnh nhau. Biểu đồ trái cột Tổng phát sinh và đường Đã gửi Noti của cùng tập ngày đó: 22/10 1000/900; 23/10 1200/1100; 24/10 1300/1200; 25/10 1400/1300; 26/10 1600/1450; 27/10 1800/1600; 28/10 1700/950. Biểu đồ phải hai thanh Khai thuế 4100 NNT và Nộp thuế 3500 NNT, chia Quá hạn/Sắp hạn/Còn trong hạn: khai 1700/1800/600, nộp 1400/1600/500. Chú thích ngày chốt 28/10/2026, 02:05; một NNT có thể thuộc cả hai nhóm, tổng duy nhất còn nghĩa vụ là 6200, không cộng thành 7600. Mỗi NNT/loại được xếp mức ưu tiên cao nhất.

Dưới biểu đồ là một bảng có ba tab Thông báo / NNT / Đợt gửi, mặc định Thông báo. Có tìm tên/MST và lọc trạng thái. Cột: Thời điểm, NNT/MST, Nhóm, Tiêu đề, Gửi, Giao, Xem chi tiết. Minh họa 5 NNT: Hộ kinh doanh An Bình 9990000001 khai thuế đã giao; Nguyễn Minh Phương 9990000002 nộp thuế đã giao; Trần Văn Hòa 9990000003 doanh thu gửi Noti nhưng iHanoi mới tiếp nhận; Phạm Thị Lan 9990000004 khai thuế gửi thất bại; Lê Quốc Hưng 9990000005 nộp thuế chờ gửi. Hai trạng thái gửi/giao tách riêng. Có phân trang và tổng số. Chi tiết mở drawer; không tạo trang phụ. Ghi chú Dữ liệu minh họa. Ưu tiên khả năng đọc số liệu, không thêm menu hoặc widget ngoài phạm vi.
```

### 8.4. Prompt — Thống kê mobile (STAT-M)

```text
Thiết kế mobile responsive 390×844 cho màn Thống kê thông báo của cùng web Quản trị thông báo. Giữ Inter, xanh #1677FF, nền #F5F7FA, card trắng, tiếng Việt đầy đủ dấu. Một cột cuộn dọc, padding 16px, không tràn ngang. Header 56px; bottom navigation có đúng Thống kê/Cấu hình, chọn Thống kê và hỗ trợ safe area.

Đầu màn có Thống kê thông báo, Đơn vị Thuế A, khoảng 22/10–28/10/2026, nút Bộ lọc có badge điều kiện, Làm mới, dòng Cập nhật 28/10/2026, 09:15. Bộ lọc đầy đủ mở bottom sheet, không chèn cả một hàng desktop bị co nhỏ.

6 KPI thành lưới 2 cột × 3 hàng: Tổng thông báo 10.000; Đã gửi Noti 8.500; Đã giao 7.000; Chờ gửi 600; Gửi thất bại 400; NNT duy nhất 5.800. Nhãn không cắt, số dễ đọc, vùng chạm tối thiểu 44px. Có chú thích ngắn: Thông báo phát sinh trong kỳ, kết quả cập nhật hiện tại.

Hai chart xếp dọc. Chart xu hướng 7 ngày 22–28/10 có cột tổng 1000,1200,1300,1400,1600,1800,1700 và đường đã gửi của cùng tập ngày 900,1100,1200,1300,1450,1600,950. Chart NNT theo nghĩa vụ có Khai 4100, Nộp 3500 và phân đoạn quá hạn/sắp hạn/trong hạn như desktop: 1700/1800/600 và 1400/1600/500. Chú thích tổng NNT còn nghĩa vụ 6200 do có giao nhau, khác NNT có thông báo 5800; chốt 28/10 lúc 02:05. Tooltip dùng chạm. Không thu nhỏ chữ để nhét biểu đồ.

Tiếp theo có ba tab Thông báo / NNT / Đợt gửi. Tab Thông báo là danh sách card, không dùng bảng cuộn ngang: tên/MST, nhóm và ngày, tiêu đề, hai dòng Gửi/Giao, Xem chi tiết. Dùng tên giả An Bình, Nguyễn Minh Phương, Trần Văn Hòa với trạng thái nhất quán desktop; có phân trang Trước/Sau. Chi tiết mở overlay toàn màn hình có quay lại, giữ bộ lọc và vị trí. Thao tác đợt được đặt trong chi tiết, không thêm một màn chính khác. Ghi chú Dữ liệu minh họa.

Frame được phép cuộn dọc: chỉ cần phần đầu và phần tiếp nối hợp lý ở dưới fold, không ép toàn bộ dashboard vào 844px chiều cao. Chừa khoảng cuối để navigation không che card cuối.
```

### 8.5. Biến thể bổ sung trong cùng hai view

| Mã | Nội dung Stitch cần thể hiện | Yêu cầu cụ thể |
|---|---|---|
| CFG-D4 | Chọn nhóm D4 trên form desktop/mobile đã có | Bật cảnh báo; gần ngưỡng 80%; biên dự báo 20%; tối thiểu 30 ngày; cách xác nhận 7 ngày, 2 lần; chu kỳ giới thiệu doanh nghiệp 7 ngày; bảng ngưỡng Configuration chỉ đọc |
| CFG-SAVE | Modal desktop và bottom sheet mobile xác nhận lưu | Ví dụ đổi giờ rà soát 02:00 → 03:00 và quét bù 02:30 → 03:30; bảng/thẻ trước–sau; chọn hiệu lực; lý do; thông tin chỉ áp đợt mới; Hủy/Lưu và áp dụng |
| CFG-PREVIEW | Drawer/overlay xem trước | Tab Lịch chạy/Nội dung; phản ánh giờ đang sửa, nhãn Chưa áp dụng; bản đẩy và nội dung đầy đủ tách riêng |
| CFG-READ | Cán bộ đơn vị mở cấu hình | Nhãn Chỉ xem; các giá trị đọc được, không có Lưu và áp dụng; vẫn mở xem trước/lịch sử được theo quyền |
| STAT-FILTER | Bottom sheet lọc | Đơn vị theo quyền, khoảng ngày, nhóm; vùng cuộn; footer Đặt lại/Áp dụng; badge/chip cập nhật sau khi áp |
| STAT-RUN | Drawer desktop/overlay mobile chi tiết đợt | DG-20261028-A, Đang gửi, Đơn vị Thuế A, 1700 thông báo/1500 NNT, đã gửi 950, chờ 600; nút Tạm dừng và menu Hủy, lý do và timeline |
| STAT-CONFIRM | Xác nhận tạm dừng/hủy đợt | Số 600 đang chờ, phạm vi Đơn vị Thuế A, lý do bắt buộc, thông tin các lượt đang gửi có thể hoàn tất; nút hành động phân biệt |
| COMMON-STATES | Loading/rỗng/lỗi/thiếu dữ liệu/quyền | Biến thể của các màn hiện có, không bổ sung menu hoặc page mới |

Khi tạo biến thể, dùng lại layout của 4 mockup chính; không bắt đầu một design system mới cho mỗi popup. Hộp xác nhận nhắc rõ tác động thực tế, không chỉ hỏi “Bạn có chắc chắn?”.

## 9. Tiêu chí nghiệm thu tài liệu/mockup

- [ ] Có đúng hai view chính và bốn bản desktop/mobile; các thông tin chi tiết là overlay trong view.
- [ ] Desktop 1440, mobile 390 có cùng chức năng/quyền; đọc được ở 360, 768, 1024; không tràn ngang toàn trang.
- [ ] Mobile không dùng bảng desktop thu nhỏ; input ≥16px, vùng chạm ≥44px, tooltip bằng chạm và không có chức năng chỉ xuất hiện khi hover.
- [ ] Thanh thao tác, điều hướng dưới, bàn phím và safe area không che nội dung; overlay có quay lại.
- [ ] Form giữ bản sửa khi đổi kích thước/mở preview; chuyển nhóm/rời màn có xác nhận nếu chưa lưu.
- [ ] Lưu có so sánh trước–sau, hiệu lực, lý do; thể hiện rõ đợt đang chạy không bị thay đổi ngầm.
- [ ] Dashboard tách số thông báo, nghĩa vụ và NNT; gửi/giao riêng; mọi số minh họa khớp mục 5.
- [ ] Biểu đồ và bảng thể hiện đúng ngữ cảnh thời gian, ngày chốt, đơn vị và các điều kiện đang lọc.
- [ ] Cán bộ không có thao tác trên đợt toàn hệ thống; chỉ đọc không có nút ghi; nhóm chưa sử dụng không cho bật giả.
- [ ] Có trạng thái loading/rỗng/lỗi/dữ liệu cũ/thiếu dữ liệu giao và xung đột cập nhật.
- [ ] Không có form sửa policy thuế, secret/hạ tầng, soạn mẫu hoặc gửi thử production ngoài phạm vi.
- [ ] Tài liệu chỉ rõ khả năng API hiện có và cần bổ sung, không tuyên bố đã triển khai web hoặc đã tạo mockup Stitch.

## 10. Căn cứ đối chiếu trong workspace

- [Cấu hình Engagement](../src/config/configuration.ts), [env mẫu](../.env.example), [mặc định scheduler](../src/scheduler/scheduler.constants.ts).
- [API điều khiển đợt gửi](../src/modules/send-runs/send-runs.controller.ts), [DTO và số liệu đợt](../src/modules/send-runs/dto/send-run.dto.ts).
- [API xem trước nhắc nghĩa vụ](../src/modules/reminders/reminders.controller.ts), [DTO xem trước](../src/modules/reminders/dto/reminder-preview.dto.ts).
- [Nghiệp vụ và nguồn thông báo](../Engagement-export.markdown/danh-muc-thong-bao-va-nguon-du-lieu.md), [D1c](d1c-trang-thai-hkd-va-nguon-du-lieu.md), [D4](d4-thong-bao-vuot-muc-doanh-thu-va-nguon-du-lieu.md).

Không chỉnh mã nguồn, config runtime hoặc gửi thông báo thật trong phạm vi tạo tài liệu thiết kế này.
