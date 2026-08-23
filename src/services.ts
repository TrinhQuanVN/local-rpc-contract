import type {
  GetInvoiceInput, GetInvoiceOutput,
  NotifyPaymentEditedInput, NotifyPaymentEditedOutput,
  PingOutput,
} from "./contract";

/**
 * INTERFACE dịch vụ mà LOCAL cung cấp (qua tRPC context). Package KHÔNG biết prisma/lib - local implement
 * interface này rồi tiêm vào context. Nhờ vậy package sạch (chỉ @trpc/server + zod), domain chỉ cần AppRouter type.
 */
export interface LocalServices {
  getInvoice(input: GetInvoiceInput): Promise<GetInvoiceOutput>;
  notifyPaymentEdited(input: NotifyPaymentEditedInput): Promise<NotifyPaymentEditedOutput>;
  ping(): Promise<PingOutput>;
}

export interface LocalContext {
  services: LocalServices;
}
