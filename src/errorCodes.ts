/**
 * KHO MÃ LỖI SỐ dùng chung domain ↔ local (chốt 2026-08-26, spec-log-api-va-ma-loi-chung.md phần B).
 * Đặt ở đây (contract dùng chung) để 1 định nghĩa 2 bên cùng nhập, đổi mã là `tsc` bên domain báo ngay.
 *
 * BA LUẬT BẤT BIẾN:
 *  1. Số ĐÃ CẤP không bao giờ đổi nghĩa. Bỏ mã thì để trống số đó VĨNH VIỄN (đừng dùng lại - làm sai log cũ).
 *  2. Số đi KÈM chuỗi (chuỗi cho người `LOCAL_OFFLINE`, số cho máy đối chiếu/thống kê) - không thay thế.
 *  3. Số ổn định; thông điệp (message) tự do, đổi lúc nào cũng được.
 *
 * Dải: 1000 xác thực/quyền · 1100 đầu vào · 1200 tài nguyên · 2000 HĐ Viettel · 2100 tài khoản Viettel ·
 *      2200 TIN (local) · 2300 GIÁ (local) · 2400 hàng đợi uuid (local) · 3000 liên lạc local↔domain · 9000 khác.
 */
export const ErrorCode = {
  // 1000-1099 Xác thực / phân quyền
  UNAUTHENTICATED: 1001,
  FORBIDDEN: 1002,
  CSRF: 1003,
  INVALID_SERVICE_TOKEN: 1004, // sai/thiếu token dịch vụ (JWT/token tĩnh)
  MISSING_SCOPE: 1005,          // JWT thiếu scope THÔ (vd account:read)

  // 1100-1199 Đầu vào
  VALIDATION_ERROR: 1101,       // zod/định dạng sai
  MISSING_PARAM: 1102,

  // 1200-1299 Tài nguyên
  NOT_FOUND: 1201,
  ALREADY_EXISTS: 1202,
  STATE_CONFLICT: 1203,

  // 2000-2099 Hoá đơn Viettel
  INVOICE_NOT_FOUND: 2001,
  INVOICE_UNNUMBERED: 2002,     // HĐ nháp chưa cấp số (invoiceNumber "-000001")
  VIETTEL_REJECTED: 2003,
  INVOICE_ALREADY_ISSUED: 2004,

  // 2100-2199 Tài khoản Viettel
  VINVOICE_ACCOUNT_NOT_FOUND: 2101,
  VIETTEL_BAD_CREDENTIALS: 2102,

  // 2200-2299 Tin tức (LOCAL)
  NEWS_ARTICLE_NOT_FOUND: 2201,

  // 2300-2399 Giá (LOCAL)
  PRICE_PRODUCT_NOT_FOUND: 2301,

  // 2400-2499 Hàng đợi đồng bộ / uuid (LOCAL)
  UUID_SYNC_ABANDONED: 2401,    // requestUuidSync quá ngưỡng 60ph/20 lần -> FAILED

  // 3000-3099 Liên lạc local ↔ domain
  LOCAL_OFFLINE: 3001,
  LOCAL_TIMEOUT: 3002,
  LOCAL_NOT_CONFIGURED: 3003,

  // 9000-9099 Không lường trước
  INTERNAL_ERROR: 9001,
} as const;

export type ErrorCodeName = keyof typeof ErrorCode;
export type ErrorCodeNumber = (typeof ErrorCode)[ErrorCodeName];
