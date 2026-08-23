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

// ---------- ping: kiểm tra local + tunnel còn sống ----------
export const PingOutput = z.object({ ok: z.boolean(), at: z.string() });

// Type suy ra (dùng ở cả 2 đầu)
export type GetInvoiceInput = z.infer<typeof GetInvoiceInput>;
export type InvoiceLine = z.infer<typeof InvoiceLine>;
export type InvoiceData = z.infer<typeof InvoiceData>;
export type GetInvoiceOutput = z.infer<typeof GetInvoiceOutput>;
export type NotifyPaymentEditedInput = z.infer<typeof NotifyPaymentEditedInput>;
export type NotifyPaymentEditedOutput = z.infer<typeof NotifyPaymentEditedOutput>;
export type PingOutput = z.infer<typeof PingOutput>;
