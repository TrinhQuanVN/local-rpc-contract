import { initTRPC } from "@trpc/server";
import type { LocalContext } from "./services";
import {
  GetInvoiceInput, GetInvoiceOutput,
  NotifyPaymentEditedInput, NotifyPaymentEditedOutput,
  PingOutput,
} from "./contract";

/**
 * ROUTER tRPC dùng chung. Resolver CHỈ gọi ctx.services.* (interface LocalServices) - không đụng DB trực tiếp
 * ở đây. Local tiêm services thật (prisma/lib) qua createContext; domain chỉ dùng `type AppRouter` cho client.
 */
const t = initTRPC.context<LocalContext>().create();

export const appRouter = t.router({
  // Lấy 1 hoá đơn từ full DB local (kể cả HĐ ngoài cửa sổ Neon). Đồng bộ.
  getInvoice: t.procedure
    .input(GetInvoiceInput)
    .output(GetInvoiceOutput)
    .query(({ input, ctx }) => ctx.services.getInvoice(input)),

  // Domain báo đã sửa cash/transfer -> local enqueue đồng bộ (fire-and-forget).
  notifyPaymentEdited: t.procedure
    .input(NotifyPaymentEditedInput)
    .output(NotifyPaymentEditedOutput)
    .mutation(({ input, ctx }) => ctx.services.notifyPaymentEdited(input)),

  // Kiểm tra local + tunnel còn sống.
  ping: t.procedure
    .output(PingOutput)
    .query(({ ctx }) => ctx.services.ping()),
});

export type AppRouter = typeof appRouter;
