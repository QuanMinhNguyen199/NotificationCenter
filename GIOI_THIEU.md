# Giới thiệu web Quản trị thông báo

## Web này để làm gì

Thuế thành phố Hà Nội gửi thông báo nhắc nghĩa vụ thuế tới hộ kinh doanh qua iHanoi. Hệ thống tự rà soát và tự lập đợt gửi, nhưng cán bộ thuế chưa có chỗ để xem hệ thống đang làm gì.

Web này là chỗ đó. Cán bộ mở web để trả lời mấy câu hỏi hằng ngày: nhóm nào đang được nhắc, rà soát chạy lúc nào, tin gửi lúc nào, đợt nào đang gửi hay bị lỗi, và một thay đổi thiết lập bắt đầu có hiệu lực khi nào.

Ngoài việc theo dõi, web cho phép gửi thông báo chủ động, quản lý mẫu tin và kênh gửi, và theo dõi tình hình hộ kinh doanh trên địa bàn.

## Ai dùng

Có ba cấp tài khoản, mỗi cấp thấy và làm được những việc khác nhau.

| Cấp | Thấy gì | Làm được gì |
|---|---|---|
| Lãnh đạo cơ sở | Toàn cơ sở, lọc theo tổ hoặc cán bộ | Sửa thiết lập, duyệt và dừng đợt gửi, gửi toàn cơ sở, quản lý tài khoản |
| Lãnh đạo tổ | Tổ mình, lọc theo cán bộ trong tổ | Gửi thông báo trong tổ theo mẫu có sẵn |
| Cán bộ | Hộ kinh doanh mình phụ trách | Chủ yếu xem |

## Các màn chính

| Màn | Dùng để |
|---|---|
| Thống kê | Xem số thông báo đã gửi, đã tiếp nhận, chờ gửi, thất bại; biểu đồ theo ngày và theo loại nghĩa vụ; tra từng thông báo, từng người nộp thuế, từng đợt |
| Quản lý HKD | Theo dõi chỉ tiêu hằng ngày, tình hình tuân thủ, nợ thuế, yêu cầu hỗ trợ, việc sắp đến hạn và lịch sử hỏi đáp với trợ lý AI |
| Gửi thông báo | Chọn người nhận, chọn kênh, chọn mẫu hoặc tự soạn, xem trước rồi gửi; theo dõi tiến độ tới từng người nhận và hủy phần chưa gửi |
| Mẫu tin | Soạn nháp, xem trước giao diện trên iHanoi, xuất bản phiên bản kèm lý do |
| Kênh gửi | Xem trạng thái Hộp thư, iHanoi, Email, Zalo; tạm dừng hoặc ngắt khẩn cấp một kênh |
| Thiết lập | Đặt lịch rà soát, khung giờ gửi, ngưỡng cảnh báo doanh thu; mỗi lần lưu ghi lý do và thời điểm có hiệu lực |
| Tài khoản | Lãnh đạo cơ sở đổi vai trò, chuyển tổ, khóa hoặc mở tài khoản cán bộ |

## Một vài quy ước cần biết

"Đã tiếp nhận" nghĩa là iHanoi đã nhận tin. iHanoi chưa báo lại được tin đã tới máy người dân hay chưa, nên web không ghi "đã giao".

Tin bị hết giờ chờ được để ở trạng thái "chưa rõ" và không tự gửi lại, để người dân không nhận hai lần.

Mọi thay đổi thiết lập, mẫu tin và kênh gửi đều phải ghi lý do và lưu lịch sử, nên luôn tra lại được ai đổi gì, khi nào.

## Hiện trạng
Toàn bộ số liệu, tên người nộp thuế, mã số thuế và tài khoản cán bộ là dữ liệu minh họa, chưa nối với hệ thống thật. Có thể đổi giữa ba tài khoản mẫu (Nguyễn Minh An, Trần Thu Hà, Lê Văn Bình) ở góc trên bên phải để xem web hiển thị khác nhau theo từng cấp.

Những phần chưa làm: giao lại người nộp thuế giữa các cán bộ, tạo và xóa tài khoản, kết nối Email và Zalo thật, đối soát thủ công các tin "chưa rõ".
