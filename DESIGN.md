---
name: Quản trị thông báo
description: Bảng vận hành thông báo thuế cho quản trị trung tâm và cán bộ đơn vị; thời điểm và trạng thái đi trước, trang trí đi sau.
colors:
  brand: "#B91C1C"
  brand-fill: "#B91C1C"
  brand-fill-hover: "#991B1B"
  brand-ink: "#991B1B"
  link: "#B91C1C"
  tint-50: "#FFFBEB"
  tint-100: "#FEF3C7"
  tint-200: "#FDE68A"
  ground: "#FFFBF2"
  surface: "#FFFFFF"
  border: "#EBD9C6"
  rule: "#F3E8DA"
  control: "#D9C3A8"
  well: "#F2F4F7"
  text: "#2B1A12"
  muted: "#6B4A3E"
  faint: "#6B4A3E"
  danger: "#991B1B"
  warning-ink: "#854D0E"
  warning-bg: "#FFF3D6"
  success-ink: "#166534"
  success-bg: "#E2F5E9"
  danger-bg: "#FDE8E8"
  data-overdue: "#B91C1C"
  data-due-soon: "#FACC15"
  data-in-term: "#EBD9C6"
typography:
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  kpi-value:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum'"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
  caption:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  sheet: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-fill}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brand-fill-hover}"
  button-primary-active:
    backgroundColor: "{colors.brand-ink}"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "36px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px 20px 20px"
  kpi-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "104px"
  kpi-card-selected:
    backgroundColor: "{colors.tint-50}"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 10px"
  nav-item-active:
    backgroundColor: "{colors.tint-100}"
    textColor: "{colors.brand-ink}"
  pill-info:
    backgroundColor: "{colors.tint-100}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 9px"
  pill-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.pill}"
    height: "24px"
  pill-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.pill}"
    height: "24px"
  chip-filter:
    backgroundColor: "{colors.tint-50}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    height: "32px"
---

# Design System: Quản trị thông báo


> **Bộ màu thương hiệu (cập nhật 02/11/2026, theo yêu cầu người dùng, thay token xanh #1677FF của đặc tả):** Main red #B91C1C (nút chính, link, tab, switch, focus, đường dữ liệu chính, "Quá hạn"), Banner red #C8102E (logo), Yellow #FACC15 (khung gửi trên dải 24h, "Sắp hạn"), Pale yellow #FEF3C7 (trạng thái chọn: nav, KPI, chip), White #FFFFFF (thẻ, topbar, ô nhập), Cream #FFFBF2 (nền trang), Main text #2B1A12, Secondary text #6B4A3E, Borders #EBD9C6. KPI đang chọn: nền #FEF3C7, viền #A16207 (không dùng đỏ để tránh đọc nhầm là lỗi). Xanh lá #166534 và xanh dương #1E40AF/#E6EEFB chỉ còn trong pill trạng thái (Đã giao/Hoàn tất, Đã gửi/Đang gửi) theo quy ước đặc tả.

## Overview

**Creative North Star: "Lịch trực ban"**

Giao diện đọc như một lịch trực ban của trung tâm vận hành thông báo thuế: thời điểm, phạm vi và trạng thái đi trước, trang trí đi sau. Nền xám lạnh (#FFFBF2) trải liền từ sidebar sang vùng nội dung, chỉ ngăn bằng một đường mảnh; thẻ trắng viền mảnh, phẳng khi nghỉ. Màu thương hiệu #B91C1C do đặc tả chốt và được dùng như mực đánh dấu, không phải mảng nền.

Mật độ trung bình–cao, kiểu công cụ: chữ 14px, bảng có số căn cột (tabular), chỉ những con số cần ngữ cảnh mới có dòng giải thích ngắn. Thứ được nhấn là dữ liệu cốt lõi (hàng 6 KPI bấm để lọc, biểu đồ, dải 24h), không phải hiệu ứng. Hướng đã từ chối trong direction contract: icon tròn trên KPI, gradient area chart, sidebar tối.

Hệ dựng trên Ant Design 5 (theme trong `web/src/theme.ts`) cộng một lớp CSS custom properties (`web/src/styles.css`) cho shell và các khối riêng. Hai nguồn cùng giá trị cho mọi token màu chính.

**Key Characteristics:**
- Nền liền một mặt phẳng; thẻ trắng viền #EBD9C6, bo 8px, không bóng khi nghỉ.
- Xanh thương hiệu đặc chỉ ở nút chính, chuỗi dữ liệu chính, viền focus.
- Icon chỉ dùng khi là cách duy nhất để thao tác (nút thu/mở thanh bên, quay lại, bỏ chip, điều hướng dưới trên mobile). Không icon trang trí trên nút, pill, nhãn.
- Trạng thái luôn là pill nhạt có chữ, không chỉ màu.
- Chuyển động chỉ trả lời thao tác: nâng 2px khi hover vào KPI và mục điều hướng, sidebar trượt ra khi trỏ tới.
- Ba breakpoint theo đặc tả: desktop ≥1200, tablet 768–1199, mobile <768.

## Colors

Một sắc xanh thương hiệu chia thành bậc theo vai trò (đặc / đậm / mực / ba bậc tint) trên nền trung tính lạnh; màu ngữ nghĩa chỉ xuất hiện trong pill và dữ liệu.

### Primary
- **Xanh Thương hiệu** (brand): màu đặc tả chốt. Dùng cho chuỗi dữ liệu chính trên biểu đồ (đường 2.5px), viền focus 2px, viền KPI đang chọn, chấm "đã sửa", thanh tiến độ, dấu trên dải 24h. Không dùng làm nền cho chữ trắng cỡ 14px (≈4,1:1).
- **Xanh Nút** (brand-fill): bản đậm hơn cùng sắc, là nền nút chính và switch, để chữ trắng đạt ≈5,2:1. Hover là brand-fill-hover, active là brand-ink.
- **Mực Xanh** (brand-ink): chữ trên nền tint (nav active, pill info, chip, tab chọn, giá trị KPI "Tổng"), giá trị mới trong bảng so sánh.
- **Xanh Liên kết** (link): chữ liên kết và các ô số bấm được trong chú giải biểu đồ (≈6,4:1).
- **Tint 50 / 100 / 200**: tint-50 cho hover hàng bảng, KPI đang chọn, chip lọc, dải chọn ngày; tint-100 cho nav active, pill info, avatar, nhãn "Đã sửa"; tint-200 cho cột biểu đồ, khung gửi trên dải 24h, viền chip, vùng bôi chọn.

### Neutral
- **Nền Trực ban** (ground): nền trang, sidebar và top bar dùng chung.
- **Giấy** (surface): thẻ, bảng, drawer, thanh lưu.
- **Viền** (border): viền thẻ, hairline sidebar/top bar. **Kẻ** (rule) cho đường chia trong thẻ, hàng bảng, lưới biểu đồ. **Viền điều khiển** (control) cho input và khối rỗng/lỗi viền đứt.
- **Giếng** (well): nền ô chỉ đọc, giá trị cố định trong bộ lọc, đường ray dải 24h, group tag.
- **Chữ** (text), **Chữ phụ** (muted) cho nhãn và mô tả, **Chữ mờ** (faint) cho chú thích, mốc giờ, mã. Cả ba đạt ≥4,5:1 trên ground và surface.

### Semantic
- **Đỏ Lỗi** (danger) cho lỗi trường; pill danger dùng nền danger-bg chữ #A51D22.
- **Pill trạng thái**: success-ink trên success-bg, warning-ink trên warning-bg; neutral là #464E5A trên rule.
- **Dữ liệu nghĩa vụ**: data-overdue / data-due-soon / data-in-term là thang ưu tiên cho thanh xếp chồng "Quá hạn / Sắp hạn / Còn trong hạn", có viền trắng 2px giữa đoạn.

### Named Rules
**The Mực Đánh Dấu Rule.** #B91C1C đặc không bao giờ là nền của một mảng lớn hay nền cho chữ trắng 14px. Mảng chọn dùng tint, chữ trên tint dùng brand-ink, nền nút dùng brand-fill.

**The Một Mặt Nền Rule.** Sidebar, top bar và canvas cùng một nền ground; phân vùng bằng hairline 1px border, không bằng khác màu nền hay sidebar tối.

## Typography

**Body Font:** Inter Variable (gói `@fontsource-variable/inter`), dự phòng system-ui, Segoe UI.

**Character:** Một họ chữ duy nhất, phân cấp bằng cỡ và độ đậm trung gian (500, 600, 650). Bật `cv11`, `ss01` toàn trang; mọi số liệu dùng `tabular-nums`.

### Hierarchy
- **Headline** (650, 24px, 1.25, −0.015em): tiêu đề trang; 20px trên mobile.
- **KPI value** (600, 28px, 1.1, −0.02em, tabular): con số KPI; 24px trên mobile.
- **Title** (600, 16px): tiêu đề thẻ/panel, tiêu đề Card của AntD; tiêu đề Modal 18px, tab 15px.
- **Body** (400, 14px, 1.5): nội dung, bảng, form; input lên 16px trên mobile để tránh zoom.
- **Label** (500, 13px): nhãn bộ lọc, nhãn KPI, nhãn trường (14px trong form cấu hình).
- **Caption** (400, 12.5–13px, faint): dòng phụ, chú thích biểu đồ, mã số thuế, mốc giờ. Mô tả dài giới hạn 70ch.

### Named Rules
**The Số Đứng Thẳng Rule.** Mọi giá trị số (KPI, bảng, mốc giờ, timeline, dải 24h) dùng `tabular-nums` để cột số thẳng hàng.

**The Không Chữ In Hoa Rule.** Hệ không có nhãn in hoa giãn chữ; phân cấp bằng cỡ, độ đậm và màu muted/faint.

## Layout

Khung open-plane: sidebar trái cố định, top bar dính 64px, canvas padding 24px, tối đa 1680px. Nhịp khoảng cách 4/8/12/16/20/24; khoảng giữa các khối lớn 16px, giữa KPI 12px.

- **Desktop ≥1200:** sidebar mặc định thu gọn 64px, ghim được mở 240px (lưu localStorage). KPI 6 cột (3 cột dưới 1400px), hai biểu đồ 1.25fr / 1fr. Cấu hình: danh mục 240px + form, khoảng 24px.
- **Tablet 768–1199:** thanh bên ẩn, nút mở cạnh logo trên topbar mở dạng phủ (chạm ngoài để đóng); danh mục cấu hình 216px; biểu đồ xếp một cột; lưới trường 2 cột.
- **Mobile <768:** header 56px, bottom nav 2 mục cao 56px + safe-area; canvas padding 16px; KPI 2 cột; bảng chuyển thành danh sách thẻ; bộ lọc mở trong bottom sheet (bo trên 14px); cấu hình thành accordion; thanh lưu cố định ngay trên bottom nav, hai nút chia đôi.
- Vùng chạm tối thiểu 44px trên mobile (controlHeight 44); 36px trên desktop.

## Elevation & Depth

Phẳng khi nghỉ. Độ sâu chỉ có ở lớp nổi (sidebar peek, popover, drawer, modal). Hover đổi viền hoặc nền, không đổ bóng.

### Shadow Vocabulary
- **Nổi** (`0 12px 32px rgba(16,24,40,.12), 0 2px 8px rgba(16,24,40,.06)`): skip link khi focus, lớp nổi riêng.
- **Popover AntD** (`0 8px 24px rgba(16,24,40,.10), 0 2px 6px rgba(16,24,40,.06)`): dropdown, popover, tooltip.
- **Sidebar peek** (`4px 0 16px rgba(16,24,40,.08)`), scrim `rgba(16,24,40,.16)` khi mở bằng chạm.

### Named Rules
**The Phẳng Khi Nghỉ Rule.** Thẻ, panel, nút không có bóng ở trạng thái nghỉ (AntD primaryShadow/defaultShadow = none). Bóng là phản hồi, không phải trang trí.

## Shapes

Góc mềm vừa phải, theo bậc: 4px cho tag, skeleton, swatch; 6px cho nút, input, ô chỉ đọc, đường ray dải 24h; 8px cho thẻ, panel, nav item, KPI, thông báo; 14px chỉ cho mép trên bottom sheet; 999px cho pill, chip, thanh tiến độ. Viền 1px liền cho khối có nội dung; viền 1px đứt (control) dành riêng cho trạng thái rỗng, lỗi khối và nút "Bản demo".

## Components

### Buttons
- **Shape:** bo 6px, cao 36px (44px mobile), chữ 500, không bóng.
- **Primary:** nền brand-fill chữ trắng; hover brand-fill-hover; active brand-ink. Mỗi vùng hành động có tối đa một nút chính.
- **Default:** nền trắng viền control. Nút chưa khả dụng dùng trạng thái disabled của AntD.
- **Focus:** viền 2px brand, cách 2px.

### Chips và Pills
- **Pill trạng thái:** cao 24px, bo tròn, nền nhạt + chữ đậm cùng sắc, không icon, bo 4px, cao 22px; 5 biến thể info/success/warning/danger/neutral.
- **Chip lọc đang áp dụng:** cao 32px, tint-50 viền tint-200 chữ brand-ink, nút xóa tròn 28px; chip cố định dùng well.

### Cards / Containers
- **Panel:** surface, viền border, bo 8px, đầu 16px 20px, thân 12px 20px 20px (14/16 trên mobile).
- **Khối rỗng / lỗi:** viền đứt control, chữ muted, có hành động phục hồi cùng dòng.
- **Ô số phụ:** nền #F6F7F9, bo 6px, nhãn 12px faint trên số 16px tabular.

### Inputs / Fields
- **Style:** viền control, bo 6px, cao 36px; chữ 16px trên mobile.
- **Focus:** viền brand + vòng `0 0 0 3px rgba(22,119,255,.18)`.
- **Đã sửa:** nhãn kèm thẻ "Đã sửa" (tint-100, brand-ink, 11.5px), viền trường đổi sang brand.
- **Lỗi:** chữ danger 13px dưới trường.

### Navigation
- **Sidebar:** 272px (04/11/2026). Khối đầu: logo 40px viền vàng 2px, tên sản phẩm 16px/700, dòng "Thuế thành phố Hà Nội" 13px, nút thu gọn; ngăn với danh sách bằng đường trắng 16%. Mục điều hướng cao 46px, bo 8px, 15px, icon 18px. Màu xem ghi chú "Quyết định triển khai" bên dưới.
- **Thu gọn = ẩn hẳn, mở bằng hover-peek:** nút thu gọn cạnh logo đưa thanh bên ra khỏi màn; logo và nút mở chuyển lên topbar. Trỏ vào nút mở hoặc mép trái màn hình (10px) sau 120ms thì thanh bên trượt ra (translateX) đè lên nội dung, rời đi 260ms thì thu lại; Escape đóng và trả focus về nút mở. Bấm nút mở trên desktop là ghim lại; tablet không ghim được nên bấm là mở dạng phủ.
- **Top bar:** breadcrumb faint với trang hiện tại text 500; tài khoản và nút "Bản demo" bên phải.
- **Mobile:** bottom nav 2 mục có icon và chữ, active brand-ink 600.

### KPI Card (signature)
Nút bấm toàn khối để lọc: nhãn 13px muted, giá trị 28px, dòng giải thích 12.5px faint. Hover: viền #D9C3A8, nhấc −2px (spring 480/30), không bóng. Đang chọn: viền brand, nền tint-50 (khác vòng focus 2px). Chỉ giữ dòng giải thích khi con số cần ngữ cảnh. Thiếu dữ liệu hiện "—" màu faint kèm lý do.

### Dải "Một ngày vận hành" (signature)
Đường ray 24h cao 44px nền well, vạch giờ mảnh, mốc 00:00–24:00 cách 3 giờ (11.5px tabular). Khung gửi là dải tint-200; lượt rà soát là chấm brand đặc 14px, quét bù là chấm rỗng; giá trị so sánh dùng viền đứt #8AA8D6; trạng thái tắt là xám #9AA3AF. Dải cập nhật ngay theo giá trị đang sửa (chuyển 0.3s ease-out). Dùng lại trong form Cấu hình và drawer vận hành đợt gửi, luôn có chú giải bên dưới.

### Thanh lưu dính đáy
Surface viền border bo 8px, không bóng; trái là trạng thái (chấm xám "Chưa có thay đổi" / chấm brand chữ brand-ink khi có sửa), phải là Hủy thay đổi, Xem trước, Lưu và áp dụng.

## Do's and Don'ts

### Do:
- **Do** dùng brand-fill cho nền nút chính và brand-ink cho chữ trên tint; giữ #B91C1C cho dữ liệu, icon active và focus.
- **Do** đặt mọi nội dung trên thẻ trắng viền 1px border, bo 8px, không bóng khi nghỉ.
- **Do** đặt dòng phát hiện ngay dưới tiêu đề Thống kê (đợt đang vận hành, số đã gửi/tổng, số còn chờ) kèm liên kết "Xem đợt gửi" một lần bấm.
- **Do** dùng chữ số tabular cho toàn trang; mã định danh (mã đợt, MST) dùng chữ số thường để dấu gạch không giãn.
- **Do** tách khối trong thẻ bằng khoảng cách 20px, không dùng đường kẻ.
- **Do** giữ bộ lọc Thống kê thành một dòng dính dưới topbar (desktop/tablet), áp dụng ngay khi chọn: select "Đơn vị: …", segmented khoảng ngày (Hôm nay / 7 ngày / 30 ngày / Tùy chọn, "Tùy chọn" mở ô chọn ngày cạnh bên), chip nhóm (Tất cả, Khai thuế, Nộp thuế, Doanh thu, "Nhóm khác ▾" cho nhóm chưa sử dụng). Kỳ đang xem in đậm ở dòng chú thích bên dưới. Mobile: bottom sheet với chip xuống dòng và nút Áp dụng.
- **Do** dùng thang chữ 12 / 14 / 16 / 24 / 28 (20 cho tiêu đề mobile): 12 cho meta, pill, trục biểu đồ; 14 cho nội dung, mô tả, chú thích; 16 cho tiêu đề khối và dòng phát hiện; 24 tiêu đề trang; 28 số KPI.
- **Do** dùng một màu xám phụ duy nhất #6B4A3E cho chữ phụ và meta.
- **Do** cho link thao tác nối liền câu nó phục vụ (ví dụ "Xem đợt gửi" ngay sau câu phát hiện); "Làm mới" là link nhỏ trong dòng thời điểm cập nhật.
- **Do** cho cả dòng bảng mở chi tiết khi bấm; nút "Xem" vẫn giữ cho bàn phím.
- **Do** dùng control cao 44px trên mọi thiết bị chạm (mobile và tablet); desktop 36px.
- **Do** kèm bảng `sr-only` cho mỗi biểu đồ; SVG biểu đồ đặt `aria-hidden`.
- **Do** biểu diễn trạng thái bằng pill nhạt có chữ, không chỉ bằng chấm màu.
- **Do** kèm mỗi con số một dòng giải thích ngắn và dùng tabular-nums.
- **Do** giới hạn hiệu ứng nhấc −2px cho thứ bấm được (KPI card, nav item) và tắt nó khi `prefers-reduced-motion`.
- **Do** dùng lại dải "Một ngày vận hành" khi màn hình cần nói về lịch trong ngày.
- **Do** dùng viền đứt chỉ cho khối rỗng, lỗi khối và giá trị so sánh/ghost.

### Don't:
- **Don't** đặt chữ trắng 14px lên #B91C1C đặc (≈4,1:1).
- **Don't** dùng sidebar tối, icon tròn trang trí trên KPI hay gradient area chart.
- **Don't** thêm bóng cho thẻ ở trạng thái nghỉ hoặc hover, hay hiệu ứng nhấc cho khối không bấm được.
- **Don't** thêm icon trang trí vào nút, pill, nhãn; không lặp một con số ở hai nơi (ví dụ bảng chú giải lặp số trên thanh).
- **Don't** dùng nhãn in hoa giãn chữ làm tiêu đề phụ hay kicker trên tiêu đề.
- **Don't** thêm hiệu ứng xuất hiện lặp lại cho từng khối khi tải trang.


## Tỉ lệ màu 60-30-10 (02/11/2026)

- **60% kem #FFFBF2:** nền trang, sidebar, topbar, thẻ KPI, bảng chi tiết (nằm thẳng trên nền).
- **30% trắng #FFFFFF:** thẻ biểu đồ, hàng cài đặt, ô nhập, drawer.
- **10% nhấn đỏ + vàng:** nút chính, tab đang chọn, switch, cột biểu đồ vàng #FDE68A với đường đỏ, dòng phát hiện nền vàng nhạt, dải 24h, trạng thái chọn.
- Đo trên màn hình đầu (1440×900): Thống kê 56 / 29 / 11; Cấu hình 62 / 30 / 4 (form nên ít nhấn, không thêm trang trí để đủ 10%). Phần còn lại là chữ, đường kẻ, pill trạng thái.
- KPI chỉ tô vàng khi đang lọc thật; mặc định không tô.

## Cấu hình: bốn mục, không hiện mã nhóm

- Tab: Lịch chạy · Nhắc nghĩa vụ thuế · Cảnh báo doanh thu · Chưa sử dụng (kèm badge trạng thái: "Bật" nền xanh lá nhạt, "Tắt" và số nhóm chưa sử dụng nền xám; cao 20px, chữ 12px).
- Nhắc khai và nhắc nộp gộp một mục vì dùng chung một cờ và một cửa sổ nhắc. Bốn nhóm chưa sử dụng gộp một mục chỉ đọc.
- Mỗi mục là hàng cài đặt: tên + mô tả bên trái (280px), thẻ trắng điều khiển bên phải; dưới 1024px xếp chồng.
- Mã D1a/D1b/D2/D3… không xuất hiện trên giao diện; chỉ còn trong URL và dữ liệu nội bộ.
- Đổi tab không hỏi bỏ thay đổi vì bản nháp chung cho cả bốn mục; lưu khi có lỗi sẽ chuyển tới mục chứa lỗi đầu tiên.


## Bảng màu hiện hành và 60-30-10 (cập nhật lần 2, 02/11/2026)

Thay cho bộ đỏ/vàng/kem ở trên.

| Vai trò | Màu |
|---|---|
| Nền trang, topbar, KPI hover, thẻ biểu đồ, ô nhập (60%) | Trắng #FFFFFF |
| Sidebar, thẻ KPI, thẻ cài đặt (30%) | Soft linen #F3EEE4 |
| Nút chính, link, focus, tab, switch, đường dữ liệu, "Quá hạn" | #B91C1C |
| Logo | Flag red #C41C1C |
| Viền KPI đang chọn | Lobster pink #D0514E |
| Khung gửi trên dải 24h, "Sắp hạn" | Light coral #DC8580 |
| Cột "Tổng phát sinh", "Còn trong hạn", viền chip chọn | Cotton rose #E7BAB2 |
| Nền trạng thái chọn / dòng phát hiện | #F6DCD7 / #FBF1EF (bậc nhạt của cotton rose) |
| Viền / đường kẻ / viền ô nhập | #E5DCCD / #EFE9DF / #D6CBB8 |

Biểu đồ nghĩa vụ dùng một dải đỏ theo mức khẩn: Quá hạn #B91C1C → Sắp hạn #DC8580 → Còn trong hạn #E7BAB2.

Đo trên màn hình đầu: Thống kê desktop 60 / 25 / 11, mobile 53 / 30 / 10; Cấu hình 56 / 39 / 3 (form nên ít nhấn).


## Màu và phản hồi hiện hành (02/11/2026)

Thay các bảng màu trước trong file này. **Bằng chứng:** người dùng cung cấp trực tiếp bộ token Bright Red dưới đây.

| Vai trò | Token | Giá trị |
|---|---|---|
| Brand | color-brand-primary / hover / active / subtle | #EF4444 / #DC2626 / #B91C1C / #FEF2F2 |
| Bề mặt | color-bg-app / card / card-hover | #F8FAFC / #FFFFFF / #FAFAFA |
| Viền | color-border-card / card-hover | #E2E8F0 / #CBD5E1 |
| Chữ | color-text-main / muted | #0F172A / #64748B |
| Trạng thái | color-success / warning / danger | #10B981 / #F59E0B / #991B1B |

**Quyết định triển khai:** token CSS giữ đúng tên và giá trị người dùng cung cấp. Các biến app và shadcn trỏ vào chúng; theme Ant Design và ECharts cùng giá trị. Giữ chrome trung tính, badge gọn và thông báo nền trắng; màu ngữ nghĩa ở trạng thái và dữ liệu.

**Tương phản:** chữ trắng trên Red 500 chỉ đạt khoảng 3,76:1. Nút chính dùng chữ #0F172A trên #EF4444, hover/active dùng chữ trắng trên #DC2626/#B91C1C. Link và chữ brand dùng #B91C1C. Badge success dùng chữ #047857 trên #ECFDF5; warning #92400E trên #FFFBEB; danger #991B1B trên #FEF2F2. Màu fill success/warning vẫn giữ nguyên token đã chốt. Không dùng riêng màu để truyền trạng thái.

**Biểu đồ:** đường đã gửi #EF4444, cột tổng phát sinh #CBD5E1; nghĩa vụ quá hạn #991B1B, sắp hạn #F59E0B, còn trong hạn #CBD5E1, có nhãn chữ và chú giải.

**Chưa xác nhận:** chưa có thử nghiệm người dùng. Kiểm chứng tiếp bằng nhiệm vụ tìm đợt lỗi, phân biệt chờ gửi với gửi thất bại, và lưu cấu hình; quan sát độ chính xác và thời gian hoàn thành.

## Component hiện hành: hoàn tất chuyển sang shadcn/ui (02/11/2026)

**Bằng chứng:** yêu cầu trước đó trong phiên Claude là tách sidebar khỏi nền và chuyển component sang shadcn/ui. Shell đã chuyển; các màn form/bảng/hộp thoại còn dùng Ant Design trước lần hoàn thiện này.

**Quyết định triển khai:** dùng shadcn/ui cho Button, Select, Switch, Tabs, ToggleGroup, Badge, Alert, Dialog, Sheet, Calendar, Input, Textarea, Table; Sonner cho phản hồi thao tác, Lucide cho icon. Đã bỏ Ant Design và icon Ant khỏi dependency. Màu giữ đúng bộ Bright Red đã chốt phía trên. Sidebar nền `#B5002B` (Pantone 199 C pha 15% đen; chữ trắng 7,0:1) để tách khỏi nội dung, mục thường chữ trắng 85% kèm icon 16px (5,3:1), mục đang mở là ô trắng đặc chữ và icon `#950023` (9,1:1); không dùng vàng trong chữ sidebar (người dùng thấy đỏ đậm + vàng khó nhìn, 04/11/2026); vàng Pantone 108 C chỉ có trong logo và viền 2px quanh logo; logo biểu trưng Thuế thành phố Hà Nội có viền trắng 2px (03/11/2026 theo yêu cầu người dùng; nền `#EF4444` đã thử và bị loại vì chữ trắng chỉ 3,8:1). Nút chính nền Pantone 199 C `#D50032` (chữ trắng 5,4:1). Theo token brand trong PRODUCT.md, không theo bảng màu cũ ở đầu file này. Canvas Slate 50.

Các khối ghép dùng chung tại `web/src/components/Controls.tsx` và `DataTable.tsx`. Giờ chọn theo hệ 24h; giờ và phút có nhãn riêng cho trình đọc màn hình. Bảng giữ phân trang phía API, số liệu căn phải; thông báo rỗng/lỗi vẫn có hành động phục hồi. Mobile dùng Sheet cho bộ lọc/xác nhận và giữ bản nháp qua các tab; panel chi tiết dùng Sheet bên phải, đóng trở về vị trí danh sách cũ.

**Chưa xác nhận:** chưa có thử nghiệm người dùng. Kiểm chứng tiếp bằng nhiệm vụ lọc thông báo, đổi giờ gửi rồi lưu, và tạm dừng/tiếp tục đợt gửi với đúng vai trò.

## Cập nhật ưu tiên: tương tác nút/card (02/11/2026)

**Bằng chứng:** người dùng cung cấp CSS cụ thể cho nút và card; phần này thay các quy tắc màu/shadow/chữ nút mâu thuẫn phía trên.

- Brand idle #EF4444, hover #B91C1C, active #991B1B, subtle #FEF2F2; danger #7F1D1D. Viền card idle #E2E8F0, hover #94A3B8. Token nền/chữ/success/warning giữ nguyên.
- Primary Button chữ trắng, bo 8px, padding 10px 16px, weight 600; hover đổi nền 0,2s, active scale 0,98 trong 0,1s.
- Card dashboard (KPI, khối biểu đồ và component Card) bo 12px, padding 20px; shadow idle `0 1px 3px 0 rgba(0,0,0,.04), 0 1px 2px -1px rgba(0,0,0,.04)`; hover `0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -4px rgba(0,0,0,.08)`, nâng 2px. Panel biểu đồ chia padding cho header/body để giữ khoảng trong 20px. Hiệu ứng hover chỉ áp khi con trỏ hỗ trợ hover; reduced-motion bỏ dịch chuyển.
- **Ngoại lệ đã nêu:** chữ trắng trên #EF4444 đạt khoảng 3,76:1, dưới mức 4,5:1. Giữ theo mẫu người dùng mới nhất; hover/active đạt mức tương phản cao hơn.
- **Chưa xác nhận:** chưa có kiểm chứng với người dùng; thử nhiệm vụ tìm chỉ số, mở bảng tương ứng và lưu thay đổi để đánh giá phản hồi hover/active.

## Sửa sau critique 02/11/2026 (27/40)

- Nút chính nền #B91C1C (bậc đậm của brand), cao 36px desktop / 44px chạm; #EF4444 chỉ cho điểm nhấn không phải chữ. "Tạm dừng"/"Tiếp tục" là nút viền.
- Pill trạng thái là `span.pill.pill--{tone}`, không qua Badge (utility `bg-secondary` từng đè mất màu).
- Hover nhấc −2px chỉ còn ở KPI và mục điều hướng (yêu cầu ban đầu); thẻ biểu đồ/khối không bấm được dùng `dashboard-card--static`.
- Một kiểu focus: viền đặc 2px màu `--ring` cho mọi `[data-slot]`, chip, liên kết, KPI.
- `.link-btn` là kiểu liên kết thao tác (màu `--link`, gạch chân); tiêu đề cột bảng 12px/500 màu chữ phụ; số KPI 24px; chú thích tối đa 75ch; chữ ECharts dùng Inter.
- Bảng `sr-only` của biểu đồ phải nằm trong `div.sr-only` (thẻ table bỏ qua width:1px và làm tràn ngang).
- Lưu ý kỹ thuật: phần CSS cuối file nằm trong `@layer components`, nên utility Tailwind trên component shadcn thắng quy tắc trong file; cần kiểu riêng thì dùng phần tử/lớp không mang utility tương ứng.

## Phối màu theo nghĩa (02/11/2026, sau critique)

Mỗi sắc một nghĩa, dùng nhất quán ở pill, KPI, biểu đồ và dải 24h:

| Sắc | Nghĩa | Nơi dùng |
|---|---|---|
| Đỏ brand (#EF4444, chữ #991B1B / nền nút #B91C1C) | Thao tác chính, đang chọn, lỗi, quá hạn | Nút chính, nav/chip/tab đang chọn (nền #FEF2F2), "Gửi thất bại", "Quá hạn" (#DC2626) |
| Xanh dương #2563EB (chữ #1D4ED8, nền #EFF6FF) | Đã gửi / đang xử lý | Đường "Đã gửi Noti", pill "Đã gửi Noti"/"Đang gửi", dòng phát hiện, thanh tiến độ, khung gửi trên dải 24h (#BFDBFE) |
| Xanh lá (#047857 trên #ECFDF5; biểu đồ #15803D, chữ trắng) | Hoàn tất / ổn | "Đã giao", "Hoàn tất", "Còn trong hạn", badge "Bật" |
| Hổ phách (#92400E chữ; biểu đồ vàng sáng #FACC15, chữ #0F172A vì chữ trắng chỉ đạt 1,5:1) | Cần chú ý | "Chờ gửi", "Sắp hạn" |

- Cột "Tổng phát sinh" dùng hồng nhạt #FECACA của brand.
- Số KPI mang màu theo nghĩa; Tổng và NNT giữ màu chữ chính.
- Trục Y biểu đồ nghĩa vụ: tên loại 13px/600, tổng 12px màu chữ phụ (rich text ECharts, font Inter).
- Đã bỏ: chú thích dưới biểu đồ xu hướng, câu giải thích tiến độ trong drawer, "kiểm tra đợt mỗi 5 phút" ở chú giải dải 24h, mô tả "Một ngày vận hành", gợi ý "Lượt cuối bắt đầu trước…"; tiêu đề trang rút thành "Thống kê thông báo".
- Lưu ý: khi thêm quy tắc vào cuối styles.css, đặt ngoài mọi `@media`; một khối từng bị chèn nhầm vào `@media (max-width: 1199px)` nên chỉ chạy trên tablet/mobile.

## Bộ lọc, nhịp chữ và bố cục (02/11/2026)

- **Chiều cao control** dùng biến `--ctl`: 36px desktop, 44px dưới 1200px. Áp cho ô chọn đơn vị, segmented control và nút menu Nhóm để cả hàng lọc cao bằng nhau.
- **Khoảng ngày** là segmented control (`OptionGroup`): rãnh nền #F1F5F9, các mục rộng bằng nhau, mục chọn nền trắng có viền mảnh; dùng `block` để phủ ngang trong bottom sheet.
- **Bộ lọc Nhóm** là menu thả xuống dạng cây: Tất cả nhóm · Nhắc nghĩa vụ (nhóm cha "Nhắc nghĩa vụ thuế" lọc cả khai và nộp; con: Khai thuế, Nộp thuế) · Cảnh báo (Doanh thu) · Khác (Trạng thái HKD, Chuyển tuyến, Thông báo chung, Ngân hàng). Không ghi chú "chưa sử dụng" trên các mục.
- **Trong bottom sheet** không lặp tiền tố "Đơn vị:" / "Nhóm:" vì đã có nhãn trường.
- **Không để một chữ đứng riêng một dòng:** `text-wrap: pretty` cho body, `balance` cho tiêu đề và đoạn ngắn (mô tả, ghi chú, tiêu đề ô bảng); `nowrap` cho chú giải, pill, trạng thái thanh lưu.
- **KPI** dùng lưới nhãn / số / ghi chú để số thẳng hàng giữa các thẻ.
- **Ô số liệu trong drawer:** 3 ô chính trên, 4 ô chi tiết dưới (lưới 12 cột), lấp kín chiều ngang.
- **Mobile:** link trong dòng phát hiện xuống dòng riêng (vùng chạm 44px); khoảng đệm 140px + safe area dưới form Cấu hình cho thanh lưu cố định.

## Bớt dấu hiệu template (02/11/2026)

- Tiêu đề trang (h1) chỉ dành cho trình đọc màn hình; tên màn hình đã hiện ở sidebar. Mốc "Cập nhật …" và nút làm mới dạng icon (RefreshCw, có aria-label) nằm cuối thanh lọc; trên mobile nằm trong thẻ khoảng ngày.
- Khối nằm yên không có bóng, chỉ viền 1px. Bóng chỉ dùng cho menu, dialog và ô KPI khi hover.
- KPI là một khối chia vạch 1px (không còn 6 thẻ rời). Mỗi ô nhấc 2px khi hover; ô đang lọc có viền trong 2px màu brand. Số KPI màu chữ thường, chỉ "Gửi thất bại" màu đỏ.
- Hai thẻ biểu đồ giữ chiều cao nội dung (`align-items: start`).
- Control cao 40px trên desktop, 44px dưới 1200px. Mục đang chọn của segmented đậm 600.
- Bỏ helper text lặp ý: dòng "Kỳ …", định nghĩa dưới KPI, phụ đề biểu đồ nghĩa vụ, mô tả công tắc trùng mô tả mục.
- Cột ngày giờ và MST trong bảng giữ căn trái (là mã nhận diện, không phải đại lượng); cột số lượng căn phải.

## Không dùng chữ gạch chân; khoảng đệm trong component (02/11/2026)

- **Không dùng chữ gạch chân làm liên kết hay thao tác.** Thao tác phụ là badge bấm được (`.link-btn`: nền tint-50, chữ brand-ink 13px/500, cao 28px, bo 6px, icon 14px đứng trước hoặc sau chữ), ví dụ "Xem đợt gửi" (mũi tên), "Lịch sử thay đổi" (icon History), "Xem trước" (icon Eye), "Lịch chạy chung" (icon CalendarClock). Vùng chạm mở rộng bằng `::after` để đạt 44px trên thiết bị chạm.
- Mở một dòng trong bảng: nút icon mũi tên (`.row-open`, 32px, 44px dưới 1200px), có aria-label, không dùng chữ "Xem".
- Số đếm bấm được trong bảng: badge trung tính (`.count-chip`), không dùng màu đỏ để khỏi nhầm với pill "Quá hạn".
- "Đặt lại" bộ lọc: nút ghost có icon; "Hủy thay đổi" trên mobile: nút viền. Variant `link` của shadcn không gạch chân.
- **Khoảng đệm trong tối thiểu:** núm switch cách mép rãnh 3px (rãnh 40×24, núm 18px); mục segmented cách mép rãnh 3px và cao hết rãnh; nút ✕ trên chip cách mép 4px; chữ và mũi tên trong ô chọn cách mép 12px; nội dung cách mép thẻ 16–20px.
- Ngày giờ trong ô bảng và khung giờ trong câu (06:00–10:00) không xuống dòng giữa chừng.
- Biểu đồ xu hướng: một họ xanh dương, cột tổng phát sinh #DBEAFE (ngày không chọn #EFF6FF, hover #BFDBFE), đường đã gửi xanh #1D4ED8 cùng màu chữ pill "Đã gửi Noti". Không dùng đỏ cho dữ liệu bình thường vì đỏ dành cho "Gửi thất bại" và "Quá hạn".
- Danh sách chi tiết: nút icon ↺ "Đặt lại bộ lọc danh sách" nằm cuối hàng ô lọc, chỉ hiện khi có ô lọc khác mặc định; đặt lại tìm kiếm, ô chọn và điều kiện chip của tab đang xem (không đụng bộ lọc chung ở trên).
- Dòng phát hiện (đợt đang gửi) phải nổi bật: nền #FEF2F2, viền #FECACA, nút "Xem đợt gửi" đỏ đặc #B91C1C chữ trắng (6,5:1). Đây là khối duy nhất trên trang dùng nền đỏ nhạt.
- Khung gửi trên dải 24 giờ (và ô chú giải) dùng đỏ nhạt #FECACA, cùng họ với chấm rà soát và logo.
- Chữ trong bảng: nội dung chính (tên NNT, tiêu đề, trạng thái HKD, ngày, số) màu #0F172A; nhãn nhóm và tiến độ #475569; chỉ MST, giờ phụ và số 0 dùng chữ phụ #64748B.
- Bộ lọc đơn vị mặc định theo quyền: quản trị trung tâm mặc định "Toàn hệ thống"; tài khoản đơn vị khóa đơn vị của mình; vai trò chỉ xem (không chọn được toàn hệ thống) mặc định đơn vị A. "Đặt lại" và chip bỏ điều kiện đưa về giá trị mặc định này.

## Chuyển động (cập nhật 05/11/2026)

Nguyên tắc: chuyển động chỉ để phản hồi thao tác, đổi trạng thái hoặc nối hai vùng; số liệu đọc được ngay, không chờ animation; không nảy, không lặp, không đếm số, không cho card xuất hiện tuần tự; không chạy lại hiệu ứng xuất hiện sau mỗi lần lọc. Chỉ transform, opacity và màu. Tắt khi người dùng chọn giảm chuyển động (motion/react `MotionConfig reducedMotion="user"`, `@media (prefers-reduced-motion: reduce)` và `animation: false` cho ECharts).

**Token** (CSS `--dur-*` trong `styles.css`, JS trong `src/lib/motion.ts`; giá trị khởi đầu để thử, chưa kiểm chứng với người dùng): phản hồi nhỏ `--dur-fast` 120ms; chuyển trạng thái `--dur-state` 180ms; drawer/modal `--dur-overlay` 240ms; easing `--ease-out` cubic-bezier(0.22, 1, 0.36, 1).

| Thao tác | Chuyển động | Token |
|---|---|---|
| Hover, nhấn nút | Đổi màu; nhấn thu 2% | fast |
| Bật/tắt switch | Nền đổi màu, núm trượt | state |
| Đổi mục sidebar | Ô trắng mục đang chọn trượt sang mục mới (layoutId `nav-pill`) | state |
| Đổi tab | Gạch chân trượt; nội dung mới hiện dần, không trượt | state |
| Đổi màn | Nội dung hiện dần, chỉ độ mờ | state |
| Mở/đóng drawer, modal | Trượt/hiện của Radix; khóa focus, Esc đóng, trả focus về nút đã mở | overlay |
| Bung/thu chi tiết người nhận | Chiều cao + độ mờ; chỉ cắt nội dung trong lúc chuyển động | state |
| Đổi bộ lọc | Vùng kết quả (KPI, biểu đồ, danh sách) giữ số cũ, mờ 50% và tạm khóa bấm tới khi có số mới; lần tải đầu vẫn là skeleton | state |
| Biểu đồ cập nhật | ECharts chuyển từ số cũ sang số mới, không vẽ lại từ đầu; lần vẽ đầu 300ms, cập nhật 240ms | — |
| Lưu thiết lập | Nút trong hộp thoại hiện đang lưu; thành công: thanh lưu hiện "Đã lưu…" màu xanh 4 giây; lỗi: thông báo trong hộp thoại | state |
| Cảnh báo mới | Hiện dần và dịch 4px một lần | state |
| Có thay đổi mới (nút Lịch sử) | Chấm đỏ hiện một lần, không phóng quá cỡ | state |

Đã bỏ (05/11/2026): số KPI chạy từ số cũ sang số mới, thân bảng hiện từ trong suốt, chấm phóng to 125% rồi co lại, kiểu lò xo ở sidebar và tab.

## Đổ bóng và focus ô nhập (05/11/2026)

- **Đổ bóng theo yêu cầu người dùng**, thay quy tắc "phẳng khi nghỉ" ở trên: thẻ, khối KPI, thẻ thiết lập, hàng danh sách có bóng nhẹ khi nghỉ (`--shadow-card`); thứ bấm được có bóng rõ hơn khi rê chuột (`--shadow-card-hover`); ô nhập, nút viền, bộ chọn có bóng rất nhẹ (`--shadow-control`); thanh trên, thanh bên và thanh lưu cố định có bóng mềm tách khỏi nội dung cuộn.
- **Focus ô nhập:** một chỉ báo duy nhất là viền brand cộng quầng mờ 3px (18% brand; ô lỗi dùng màu lỗi). Bỏ đường viền ngoài 2px của quy tắc focus chung để không còn hai viền. Nút và mục điều hướng vẫn dùng viền ngoài 2px.
- **Không lộ cú pháp biến:** giao diện hiện tên trường ("Tên NNT", "Kỳ khai"), không hiện `{ten_nnt}`; chèn trường tự điền bằng nút. Ô soạn nội dung mẫu tin vẫn hiện cú pháp vì đó là nơi viết mẫu.


## Tổ chức theo nghiệp vụ (06/11/2026)

Điều hướng chính rút từ 7 còn 5 mục: Thống kê / Quản lý HKD / Thông báo / Thiết lập / Tài khoản. Thông báo dùng tab Gửi chủ động, Đợt tự động, Thư viện mẫu (ẩn theo quyền); Thiết lập dùng tab Quy tắc nhắc tự động, Kênh gửi (ẩn theo quyền). Giữ token thương hiệu và component hiện có.

Mỗi nội dung chi tiết có một nơi chính: thông báo đã gửi ở Thống kê; đợt tự động ở Thông báo; danh sách và biểu đồ nghĩa vụ ở Quản lý HKD. Các nút từ màn khác dẫn tới đúng nơi, giữ phạm vi liên quan. Thư viện mẫu dùng để quản lý nội dung; chọn mẫu trong form Gửi chủ động. Xuất bản không đồng nghĩa gửi. Nhắc việc ưu tiên kết quả nghiệp vụ của HKD, bỏ biểu đồ truyền tin và các cột gửi/tiếp nhận bị lặp.

Đây là phương án theo yêu cầu rút gọn, chưa có bằng chứng thử nghiệm với người dùng. Kiểm chứng bằng tìm đợt lỗi và tìm HKD quá hạn; không dùng chỉ số minh họa làm kết quả kiểm chứng.
