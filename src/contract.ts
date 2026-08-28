import { z } from "zod";

/**
 * CONTRACT tRPC dùng chung (local server ↔ domain client). Chỉ zod schema + type - KHÔNG import code local
 * (prisma/lib). Tiền/số dùng number|null; ngày ISO string; BigInt (invoiceId) truyền dưới dạng string.
 */

// ---------- getInvoice: lấy 1 hoá đơn từ FULL DB local (kể cả HĐ ngoài cửa sổ 2 tháng của Neon) ----------
export const GetInvoiceInput = z
  .object({
    invoiceNo: z.string().optional(), // "C26MXX5229"
    invoiceId: z.string().optional(), // số Viettel (BigInt) dưới dạng chuỗi
    taxCode: z.string().optional(), // thu hẹp theo MST (tuỳ chọn)
  })
  .refine((v) => Boolean(v.invoiceNo || v.invoiceId), { message: "Cần invoiceNo hoặc invoiceId" });

export const InvoiceLine = z.object({
  itemCode: z.string().nullable(),
  itemName: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
  taxRate: z.string().nullable(),
  taxAmount: z.number().nullable(),
});

export const InvoiceData = z.object({
  invoiceNo: z.string().nullable(),
  invoiceSeri: z.string().nullable(),
  invoiceId: z.string().nullable(), // BigInt -> string
  taxCode: z.string(),
  issueDate: z.string().nullable(), // ISO
  adjustmentType: z.string().nullable(), // "1"|"3"|"5"|"7"|"9"
  state: z.string().nullable(),
  buyerName: z.string().nullable(),
  buyerTaxCode: z.string().nullable(),
  buyerIdNo: z.string().nullable(),
  totalBeforeTax: z.number().nullable(),
  taxAmount: z.number().nullable(),
  total: z.number().nullable(),
  mCashAmount: z.number().nullable(),
  mBankTransferAmount: z.number().nullable(),
  mPaymentMethod: z.string().nullable(),
  lines: z.array(InvoiceLine),
});

export const GetInvoiceOutput = z.object({
  found: z.boolean(),
  invoice: InvoiceData.nullable(),
});

// ---------- notifyPaymentEdited: domain báo đã sửa cash/transfer -> local enqueue đồng bộ (fire-and-forget) ----------
export const NotifyPaymentEditedInput = z.object({
  taxCode: z.string().optional(),
  invoiceIds: z.array(z.string()).optional(), // các HĐ vừa sửa (tuỳ chọn - để coalesce)
});
export const NotifyPaymentEditedOutput = z.object({ enqueued: z.boolean() });

// ---------- requestUuidSync: domain vừa phát hành HĐ gốc -> local ghi hàng đợi kéo HĐ theo transactionUuid ----------
// Thay MCP tool `viettel-sync-uuid-request` (gỡ 2026-08-25): cùng bản chất "domain fire-and-forget báo local"
// như notifyPaymentEdited, gom về một kênh tRPC. Token đã kiểm ở tầng transport (Bearer) - KHÔNG nằm trong payload.
export const RequestUuidSyncInput = z.object({
  transactionUuid: z.string().min(10).max(64),
  taxCode: z.union([z.string(), z.number().transform((v) => String(v))]).optional(), // MST bên bán (chọn đúng account local)
  note: z.string().optional(), // ghi chú tự do (vd id draft bên domain)
});
export const RequestUuidSyncOutput = z.object({
  ok: z.boolean(),
  requestId: z.string().nullable(),
  status: z.string().nullable(),
  message: z.string().nullable(),
});

// ---------- Quản lý tài khoản Viettel (admin, scope account:*) ----------
// KHÔNG BAO GIỜ trả password (kể cả che). Domain chỉ cần hasCredentials. syncEnabled TÁCH khỏi có-credentials.
// 2 QUYỀN SYNC tách rời (2026-08-28): syncEnabled = AUTO-WORKFLOW (local tự quét lịch); apiSyncEnabled = domain
// gọi API/outbox syncInvoicesNow được. Domain-admin cấp riêng từng cái.
export const ListViettelAccountsOutput = z.object({
  accounts: z.array(z.object({
    taxCode: z.string(),
    username: z.string(),
    syncEnabled: z.boolean(),        // = autoWorkflowSync (local tự quét lịch)
    apiSyncEnabled: z.boolean(),     // domain gọi API/outbox kéo được
    hasCredentials: z.boolean(),
    invoiceCount: z.number().int(),
  })),
});
export const UpsertViettelAccountInput = z.object({
  taxCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  syncEnabled: z.boolean().default(false),   // autoWorkflowSync
  apiSyncEnabled: z.boolean().default(true),
});
export const UpsertViettelAccountOutput = z.object({ ok: z.boolean(), taxCode: z.string(), created: z.boolean() });
// Chỉnh QUYỀN sync (KHÁC upsert - không đụng credential). Chỉ cập nhật cờ được truyền (bỏ trống = giữ nguyên).
export const SetViettelAccountSyncInput = z.object({
  taxCode: z.string().min(1),
  autoWorkflowSync: z.boolean().optional(),  // local tự quét lịch
  apiSync: z.boolean().optional(),           // domain gọi API kéo
});
export const SetViettelAccountSyncOutput = z.object({ ok: z.boolean(), autoWorkflowSync: z.boolean(), apiSync: z.boolean() });
// XOÁ tài khoản (admin) - cascade SẠCH mọi HĐ/truth/sync-day của MST. KHÔNG đảo được.
export const DeleteViettelAccountInput = z.object({ taxCode: z.string().min(1) });
export const DeleteViettelAccountOutput = z.object({ ok: z.boolean(), deleted: z.boolean(), invoicesDeleted: z.number().int() });

// ---------- getInvoicePdf: PDF HĐ cũ (ngoài cửa sổ Neon) - render/đọc theo yêu cầu ----------
export const GetInvoicePdfInput = z.object({ invoiceNo: z.string().min(1), taxCode: z.string().optional() });
export const GetInvoicePdfOutput = z.object({ found: z.boolean(), mimeType: z.string().nullable(), base64: z.string().nullable() });

// ---------- searchInvoices: tra lịch sử HĐ (rút gọn, phân trang) ----------
export const SearchInvoicesInput = z.object({
  taxCode: z.string().optional(),
  buyerIdNo: z.string().optional(),
  buyerName: z.string().optional(),
  itemCode: z.string().optional(),
  fromDate: z.string().optional(), // ISO date
  toDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export const SearchInvoicesOutput = z.object({
  total: z.number().int(),
  items: z.array(z.object({
    invoiceNo: z.string().nullable(), invoiceSeri: z.string().nullable(), issueDate: z.string().nullable(),
    buyerName: z.string().nullable(), buyerIdNo: z.string().nullable(), total: z.number().nullable(), adjustmentType: z.string().nullable(),
    // +5 trường (2026-08-27) để domain gộp bảng tìm local + Neon: invoiceNumber(số HĐ), templateCode(mẫu số),
    // paymentMethod(PTTT = mPaymentMethod), taxCode(MST của account), invoiceId(khoá ổn định khử trùng - BigInt→string).
    invoiceNumber: z.string().nullable(), templateCode: z.string().nullable(), paymentMethod: z.string().nullable(),
    taxCode: z.string().nullable(), invoiceId: z.string().nullable(),
  })),
});

// ---------- news: bài dịch toàn văn ở local (thay push local_news_articles) ----------
export const NewsItem = z.object({
  id: z.string(), titleVi: z.string().nullable(), summaryVi: z.string().nullable(),
  // excerptVi: đoạn trích ~220 ký tự đầu contentVi (đã bỏ ký hiệu markdown), local cắt sẵn. Domain dùng
  // summaryVi ?? excerptVi ?? "" cho mô tả thẻ bài (summaryVi hiện null toàn bộ). hasContentVi = có bản dịch
  // toàn văn đọc tại chỗ (mời "Đọc bản dịch đầy đủ"). KHÔNG nhồi contentVi vào danh sách (nặng).
  excerptVi: z.string().nullable(), hasContentVi: z.boolean(),
  domainKey: z.string().nullable(), sourceName: z.string().nullable(), country: z.string().nullable(),
  publishedAt: z.string().nullable(), link: z.string().nullable(),
});
export const SearchNewsInput = z.object({
  query: z.string().optional(), domainKey: z.string().optional(), country: z.string().optional(),
  hashtag: z.string().optional(),
  fromDate: z.string().optional(), toDate: z.string().optional(),
  page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // phân trang CURSOR theo id (ổn định khi đẩy bài mới) - ưu tiên hơn page nếu có
});
export const SearchNewsOutput = z.object({ total: z.number().int(), items: z.array(NewsItem), nextCursor: z.string().nullable() });
export const LatestNewsInput = z.object({ domainKey: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) });
export const LatestNewsOutput = z.object({ items: z.array(NewsItem) });

// Thẻ theo miền (1 lời gọi thay N+1) + danh sách miền + hashtag tổng hợp (§3 domain).
// sourceCount = số nguồn RSS khác nhau CÓ bài hiển thị trong miền (đếm distinct sourceId; scmp.com=5, còn lại=1).
export const ListNewsDomainsOutput = z.object({ domains: z.array(z.object({ domainKey: z.string(), domainLabel: z.string(), articleCount: z.number().int(), sourceCount: z.number().int() })) });
export const NewsDomainCardsInput = z.object({ cardSize: z.number().int().min(1).max(20).default(3) });
export const NewsDomainCardsOutput = z.object({ cards: z.array(z.object({ domainKey: z.string(), domainLabel: z.string(), articleCount: z.number().int(), sourceCount: z.number().int(), articles: z.array(NewsItem) })) });
export const TopNewsHashtagsInput = z.object({ domainKey: z.string().min(1), limit: z.number().int().min(1).max(50).default(12) });
export const TopNewsHashtagsOutput = z.object({ tags: z.array(z.object({ tag: z.string(), count: z.number().int() })) });
export const GetNewsArticleInput = z.object({ id: z.string().min(1) });
export const GetNewsArticleOutput = z.object({
  found: z.boolean(),
  // title = tiêu đề GỐC chưa dịch (trang chi tiết in dưới bản dịch để đối chiếu; ẩn khi trùng titleVi).
  article: NewsItem.extend({ title: z.string().nullable(), contentVi: z.string().nullable(), category: z.string().nullable(), hashtags: z.array(z.string()) }).nullable(),
});

// ---------- price: giá crawl ở local (thay push crawled_price_values/price_aggregates) ----------
// direction: "IN" (mua vào) | "OUT" (bán ra) - quy ước local.
export const GetLatestPriceInput = z.object({ productKey: z.string().optional(), sourceKey: z.string().optional(), direction: z.string().optional() });
// sourceKey PHÂN BIỆT NGUỒN: productKey KHÔNG duy nhất giữa các nguồn (vd BẠC 999 ở cả DOJI lẫn PHUQUY) - domain
// phải nhóm theo (sourceKey, productKey) kẻo gộp giá 2 nguồn thành 1 dòng sai. currencyCode/quoteUnit để tách cột.
export const PricePoint = z.object({
  productKey: z.string(), productName: z.string().nullable(),
  sourceKey: z.string(), sourceName: z.string(), currencyCode: z.string(), quoteUnit: z.string(),
  direction: z.string(), value: z.number(), effectiveAt: z.string(),
});
export const GetLatestPriceOutput = z.object({ points: z.array(PricePoint) });
export const GetPriceHistoryInput = z.object({
  productKey: z.string().optional(), productId: z.string().optional(), sourceKey: z.string().optional(), direction: z.string().optional(),
  fromDate: z.string(), toDate: z.string(),
  granularity: z.enum(["raw", "day", "week", "month", "quarter", "year"]).default("raw"),
});
export const GetPriceHistoryOutput = z.object({
  total: z.number().int(),
  points: z.array(z.object({ effectiveAt: z.string(), direction: z.string(), value: z.number(), productKey: z.string().nullable(), sourceKey: z.string().nullable(), currencyCode: z.string().nullable(), quoteUnit: z.string().nullable() })),
});

// ---------- ping: kiểm tra local + tunnel còn sống ----------
// healthy = local SỐNG và LÀM ĐƯỢC VIỆC: ping trả lời (tRPC+tunnel sống) VÀ trình rút hộp thư chạy gần đây
// (Mastra/scheduler sống). Domain CHỈ cần đọc `healthy` - local tự tính, không cần biết chi tiết bên trong.
// ok=true luôn (ping trả được là tRPC sống); healthy=false nghĩa tRPC sống nhưng drain chết (đừng dựa vào local).
export const PingOutput = z.object({ ok: z.boolean(), at: z.string(), healthy: z.boolean() });

// Type suy ra (dùng ở cả 2 đầu)
export type GetInvoiceInput = z.infer<typeof GetInvoiceInput>;
export type InvoiceLine = z.infer<typeof InvoiceLine>;
export type InvoiceData = z.infer<typeof InvoiceData>;
export type GetInvoiceOutput = z.infer<typeof GetInvoiceOutput>;
export type NotifyPaymentEditedInput = z.infer<typeof NotifyPaymentEditedInput>;
export type NotifyPaymentEditedOutput = z.infer<typeof NotifyPaymentEditedOutput>;
export type RequestUuidSyncInput = z.infer<typeof RequestUuidSyncInput>;
export type RequestUuidSyncOutput = z.infer<typeof RequestUuidSyncOutput>;
export type ListViettelAccountsOutput = z.infer<typeof ListViettelAccountsOutput>;
export type UpsertViettelAccountInput = z.infer<typeof UpsertViettelAccountInput>;
export type UpsertViettelAccountOutput = z.infer<typeof UpsertViettelAccountOutput>;
export type SetViettelAccountSyncInput = z.infer<typeof SetViettelAccountSyncInput>;
export type SetViettelAccountSyncOutput = z.infer<typeof SetViettelAccountSyncOutput>;
export type DeleteViettelAccountInput = z.infer<typeof DeleteViettelAccountInput>;
export type DeleteViettelAccountOutput = z.infer<typeof DeleteViettelAccountOutput>;
export type GetInvoicePdfInput = z.infer<typeof GetInvoicePdfInput>;
export type GetInvoicePdfOutput = z.infer<typeof GetInvoicePdfOutput>;
export type SearchInvoicesInput = z.infer<typeof SearchInvoicesInput>;
export type SearchInvoicesOutput = z.infer<typeof SearchInvoicesOutput>;
export type NewsItem = z.infer<typeof NewsItem>;
export type SearchNewsInput = z.infer<typeof SearchNewsInput>;
export type SearchNewsOutput = z.infer<typeof SearchNewsOutput>;
export type LatestNewsInput = z.infer<typeof LatestNewsInput>;
export type LatestNewsOutput = z.infer<typeof LatestNewsOutput>;
export type GetNewsArticleInput = z.infer<typeof GetNewsArticleInput>;
export type GetNewsArticleOutput = z.infer<typeof GetNewsArticleOutput>;
export type ListNewsDomainsOutput = z.infer<typeof ListNewsDomainsOutput>;
export type NewsDomainCardsInput = z.infer<typeof NewsDomainCardsInput>;
export type NewsDomainCardsOutput = z.infer<typeof NewsDomainCardsOutput>;
export type TopNewsHashtagsInput = z.infer<typeof TopNewsHashtagsInput>;
export type TopNewsHashtagsOutput = z.infer<typeof TopNewsHashtagsOutput>;
export type GetLatestPriceInput = z.infer<typeof GetLatestPriceInput>;
export type GetLatestPriceOutput = z.infer<typeof GetLatestPriceOutput>;
export type GetPriceHistoryInput = z.infer<typeof GetPriceHistoryInput>;
export type GetPriceHistoryOutput = z.infer<typeof GetPriceHistoryOutput>;
export type PingOutput = z.infer<typeof PingOutput>;
