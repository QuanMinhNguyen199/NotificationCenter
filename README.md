# Quản trị thông báo

Web quản trị hệ thống thông báo Engagement gửi tới người nộp thuế (NNT) hộ kinh doanh qua iHanoi, dành cho cán bộ Thuế thành phố Hà Nội. Cán bộ dùng web để theo dõi thông báo đã gửi, thiết lập lịch rà soát và khung giờ gửi, và phân quyền tài khoản theo tổ.

**Bản xem thử:** https://quanminhnguyen199.github.io/NotificationCenter/

> Toàn bộ số liệu, tên NNT, mã số thuế, đợt gửi và tài khoản cán bộ là **dữ liệu minh họa** chạy trong trình duyệt (mock API). Chưa nối backend thật.

## Các màn

Hai phần dùng chung một giao diện: **Engagement** tự rà soát nghĩa vụ thuế và lập đợt gửi; **Notification Center** cho gửi chủ động và quản lý mẫu tin, kênh gửi (theo tài liệu thiết kế nội bộ Notification Center Service, không đưa vào repo).

| Màn | Nội dung |
|---|---|
| **Thống kê** | Đợt đang gửi; 7 chỉ số (tổng thông báo, đã gửi, đã tiếp nhận, chờ gửi, gửi thất bại, NNT duy nhất, thời gian phản hồi trung bình); biểu đồ theo ngày và theo loại nghĩa vụ; danh sách thông báo, NNT, đợt gửi kèm chi tiết. |
| **Quản lý HKD** | 4 tab: **Chỉ tiêu hằng ngày** (tờ khai tiếp nhận, tỷ lệ xử lý thành công, tỷ lệ nộp thuế theo hồ sơ, hộ đăng ký app nhưng chưa nộp tờ khai; theo ngày, tuần và đơn vị); **Cơ cấu và tuân thủ** (theo địa bàn, doanh thu năm, loại hình; 4 nhóm đủ / thiếu tờ khai / nợ thuế / cả hai); **Nợ thuế** (12 tháng, theo đơn vị và địa bàn, báo cáo tháng tải CSV); **Hỗ trợ HKD** (yêu cầu theo cán bộ, địa bàn, loại, trạng thái; danh sách chờ HKD bổ sung); **Nhắc việc** (sắp đến hạn, quá hạn chưa làm, việc phải làm, sắp đạt ngưỡng doanh thu 1 / 3 / 50 tỷ; thông báo đã gửi, tỷ lệ hoàn thành sau nhắc, theo mốc và đơn vị). Toàn bộ là dữ liệu minh họa. |
| **Gửi thông báo** | Gửi chủ động: chọn nhóm NNT, cả tổ hoặc từng NNT → kênh → mẫu tin hoặc tự soạn → xem trước → gửi. Theo dõi tiến độ từng kênh, từng người nhận, từng lần thử; hủy phần chưa gửi. |
| **Mẫu tin** | Soạn nháp, xem trước trên iHanoi, xuất bản phiên bản có lý do; lịch sử phiên bản. |
| **Kênh gửi** | Hộp thư, iHanoi, Email, Zalo: trạng thái, khả năng xác nhận; tạm dừng và ngắt khẩn cấp. |
| **Thiết lập** | Lịch rà soát, quét bù, khung giờ gửi, duyệt đợt bất thường, nhắc nghĩa vụ thuế, cảnh báo doanh thu. Lưu có lý do, chọn thời điểm hiệu lực và lịch sử phiên bản. |
| **Tài khoản** | Danh sách cán bộ theo tổ; lãnh đạo cơ sở đổi vai trò, tổ và khóa/mở tài khoản. |

"Đã tiếp nhận" nghĩa là iHanoi đã nhận tin; iHanoi chưa xác minh có xác nhận tin đã tới máy người nhận.

## Phân quyền 3 cấp

Màn **Quản lý HKD** theo cùng phạm vi với Thống kê: lãnh đạo cơ sở so sánh giữa các tổ, lãnh đạo tổ so sánh giữa cán bộ trong tổ, cán bộ chỉ thấy HKD mình phụ trách.

| Cấp | Thống kê | Gửi thông báo | Mẫu tin, Kênh gửi | Thiết lập | Đợt gửi | Tài khoản |
|---|---|---|---|---|---|---|
| Lãnh đạo cơ sở | Toàn cơ sở, lọc theo tổ hoặc cán bộ | Gửi toàn cơ sở, được tự soạn | Sửa | Sửa | Duyệt, tạm dừng, hủy | Sửa |
| Lãnh đạo tổ | Tổ mình, lọc theo cán bộ trong tổ | Gửi trong tổ, theo mẫu tin | Chỉ xem | Chỉ xem | Chỉ xem | Xem tổ mình |
| Cán bộ | NNT mình phụ trách | Xem lần gửi có NNT mình phụ trách | Không có | Chỉ xem | Chỉ xem | Không có |

Đổi tài khoản xem thử bằng nút tên tài khoản ở góc trên phải: **Nguyễn Minh An** (lãnh đạo cơ sở), **Trần Thu Hà** (lãnh đạo tổ, Tổ 1), **Lê Văn Bình** (cán bộ, Tổ 1). Quyền trên giao diện chỉ để ẩn hoặc hiện thao tác; khi có backend, quyền phải được kiểm tra ở backend.

## Chạy trên máy

Cần Node.js 22 trở lên.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy bản phát triển, tự tải lại khi sửa code |
| `npm run build` | Kiểm tra kiểu TypeScript và đóng gói vào `web/dist` |
| `npm run preview` | Chạy thử bản đã đóng gói |
| `npm run lint` | Kiểm tra code bằng Oxlint |

Để chia sẻ qua VS Code port forwarding hoặc Dev Tunnels, dùng `npm run build` rồi `npm run preview -- --port 5173`: bản phát triển có quá nhiều request nhỏ nên tunnel thường không tải hết.

## Triển khai

Mỗi lần push lên nhánh `main`, GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) đóng gói `web/` và đăng lên GitHub Pages. Bản Pages chạy dưới đường dẫn `/NotificationCenter/` (đặt bằng biến `GITHUB_PAGES` trong [web/vite.config.ts](web/vite.config.ts)); điều hướng dùng hash (`#/thong-ke`, `#/thiet-lap`, `#/tai-khoan`) nên tải lại trang không bị lỗi 404.

## Công nghệ

React 19, TypeScript, Vite, shadcn/ui (Radix + Tailwind CSS 4), TanStack Query, Apache ECharts, Motion, Sonner, Lucide.

## Cấu trúc

```text
web/src/
  pages/        StatsPage, SendPage (Gửi thông báo), TemplatesPage (Mẫu tin), ChannelsPage (Kênh gửi),
                ConfigPage (Thiết lập), AccountsPage
  stats/        bộ lọc, chỉ số, biểu đồ, danh sách và chi tiết của màn Thống kê
  config/       form, dải "Một ngày vận hành", hộp thoại lưu, lịch sử, xem trước
  shell/        khung app: sidebar, thanh trên, điều hướng mobile
  demo/         tài khoản xem thử và quyền theo vai trò
  api/mockApi   mock API Engagement: độ trễ, phân trang, phạm vi theo quyền, lưu thiết lập
  api/notifyApi mock API Notification Center: kênh, mẫu tin, lần gửi chủ động (tiến độ mô phỏng theo thời gian thực)
  data/         dữ liệu minh họa, cơ cấu tổ và cán bộ
  theme.ts      màu dùng trong biểu đồ (khớp token trong styles.css)
```

## Tài liệu thiết kế

- [PRODUCT.md](PRODUCT.md): người dùng, phạm vi, ràng buộc, quyết định sản phẩm.
- [DESIGN.md](DESIGN.md): màu, chữ, bố cục, chuyển động và lý do của từng quyết định.
- [web_quan_tri_engagement_views_va_mockup_stitch.md](web_quan_tri_engagement_views_va_mockup_stitch.md): đặc tả gốc.

Màu brand theo biểu trưng Thuế thành phố Hà Nội: đỏ Pantone 199 C `#D50032`, vàng Pantone 108 C `#FEDB00`. Mã Pantone là màu gần nhất đo từ ảnh logo, chưa đối chiếu cẩm nang nhận diện chính thức.


Điều hướng đã rút gọn theo nghiệp vụ (06/11/2026): Thông báo gom gửi chủ động, đợt tự động, thư viện mẫu; Thiết lập gom quy tắc tự động và kênh gửi. Quản lý HKD giữ danh sách nghĩa vụ và hiệu quả sau nhắc; Thống kê giữ vận hành gửi. `NotificationWorkspace.tsx` và `SettingsWorkspace.tsx` là hai màn bao; đường dẫn Mẫu tin/Kênh gửi và tab NNT/Đợt gửi cũ vẫn được ánh xạ. Dữ liệu tiếp tục là mock, quyền thao tác giữ nguyên.
