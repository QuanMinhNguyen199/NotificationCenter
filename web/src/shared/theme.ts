// Màu dùng trong ECharts (SVG không đọc biến CSS); giữ khớp với token trong styles.css.
// Token (03/11/2026): brand theo logo Thuế thành phố Hà Nội — đỏ Pantone 199 C #D50032, vàng Pantone 108 C #FEDB00;
// nền #F8FAFC, bề mặt trắng, viền #E2E8F0, chữ #0F172A / #5B6578 (muted tối hơn từ 11/11/2026 để đạt AA trên nền tint).
// Chrome trung tính; màu ngữ nghĩa dành cho trạng thái và dữ liệu cần chú ý.
export const C = {
  brand: '#D50032',
  brandFill: '#D50032',
  brandFillHover: '#B5002B',
  brandInk: '#950023',
  brandGold: '#FEDB00',
  banner: '#D50032',
  link: '#950023',
  highlight: '#F5BFCC',
  tint50: '#FDF0F3',
  tint100: '#FAE0E6',
  tint200: '#F5BFCC',
  ground: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  rule: '#F1F5F9',
  control: '#CBD5E1',
  text: '#0F172A',
  muted: '#5B6578',
  faint: '#5B6578',
  danger: '#7F1D1D',
  warning: '#F59E0B',
  success: '#10B981',
  // Màu dữ liệu biểu đồ
  grid: '#E2E8F0',
  // Màu biểu đồ đã chốt qua công cụ chỉnh màu chung (chart-colors.json, 03/11/2026).
  // Biểu đồ xu hướng: cột tổng phát sinh là tint nhạt của 199 C, đường đã gửi nâu cam đậm (khôi phục 11/11/2026 theo yêu cầu người dùng).
  bar: '#FAE0E6',
  barDim: '#F0F0F0',
  barHover: '#F5BFCC',
  sent: '#9A3412',
  // Đèn giao thông theo mức khẩn: nền đặc, chữ trắng trên đỏ (4,83:1).
  // Vàng sáng không mang được chữ trắng (1,5:1) nên dùng chữ đậm (11,7:1).
  // Xanh lá #5D9C59 với chữ trắng chỉ đạt 3,3:1, dưới mức 4,5:1 cho chữ thường.
  overdue: '#DC2626',
  dueSoon: '#FACC15',
  dueSoonInk: '#0F172A',
  inTerm: '#5D9C59',
  inTermInk: '#0F172A',
  /** Chữ trên nền màu đậm (đoạn đỏ quá hạn). */
  onFill: '#FFFFFF',
  /** Nhắc ngưỡng doanh thu (xanh dương thông tin, khớp --color-info). */
  info: '#2563EB',
  /** Nhóm "Đã tuân thủ đầy đủ": xanh lá đậm hơn inTerm để mang chữ trắng (5,0:1). */
  compliant: '#15803D',
};

