import { initTRPC, TRPCError } from "@trpc/server";
import type { LocalContext } from "./services";
import { ErrorCode } from "./errorCodes";
import {
  GetInvoiceInput, GetInvoiceOutput,
  NotifyPaymentEditedInput, NotifyPaymentEditedOutput,
  RequestUuidSyncInput, RequestUuidSyncOutput,
  ListViettelAccountsOutput,
  UpsertViettelAccountInput, UpsertViettelAccountOutput,
  SetViettelAccountSyncInput, SetViettelAccountSyncOutput,
  GetInvoicePdfInput, GetInvoicePdfOutput,
  SearchInvoicesInput, SearchInvoicesOutput,
  SearchNewsInput, SearchNewsOutput,
  LatestNewsInput, LatestNewsOutput,
  GetNewsArticleInput, GetNewsArticleOutput,
  ListNewsDomainsOutput,
  NewsDomainCardsInput, NewsDomainCardsOutput,
  TopNewsHashtagsInput, TopNewsHashtagsOutput,
  GetLatestPriceInput, GetLatestPriceOutput,
  GetPriceHistoryInput, GetPriceHistoryOutput,
  PingOutput,
} from "./contract";

/**
 * ROUTER tRPC dùng chung. Resolver CHỈ gọi ctx.services.* (interface LocalServices). Local tiêm services thật +
 * claims (danh tính client dịch vụ) qua createContext; domain chỉ dùng `type AppRouter` cho client.
 *
 * SCOPE THÔ (2026-08-26): giới hạn DOMAIN-SERVICE làm được gì ở local (KHÔNG phải phân quyền người dùng - việc
 * đó domain tự lo bằng RBAC của nó). scopes=["*"] (token tĩnh) qua hết. errorFormatter cắt stack (không rò).
 */
// Map mã tRPC -> mã SỐ chung (errorCodes). Gắn codeNumber vào error.data để domain đối chiếu (spec B4).
const TRPC_TO_NUMBER: Record<string, number> = {
  UNAUTHORIZED: ErrorCode.INVALID_SERVICE_TOKEN,
  FORBIDDEN: ErrorCode.MISSING_SCOPE,
  BAD_REQUEST: ErrorCode.VALIDATION_ERROR,
  PARSE_ERROR: ErrorCode.VALIDATION_ERROR,
  NOT_FOUND: ErrorCode.NOT_FOUND,
  INTERNAL_SERVER_ERROR: ErrorCode.INTERNAL_ERROR,
};
const t = initTRPC.context<LocalContext>().create({
  errorFormatter({ shape }) {
    const codeNumber = TRPC_TO_NUMBER[shape.data?.code as string] ?? ErrorCode.INTERNAL_ERROR;
    return { ...shape, data: { ...shape.data, stack: undefined, codeNumber } };
  },
});

const requireScope = (scope: string) =>
  t.middleware(({ ctx, next }) => {
    const scopes = ctx.claims?.scopes ?? [];
    if (!scopes.includes("*") && !scopes.includes(scope)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Thiếu scope: ${scope}` });
    }
    return next();
  });

const invoiceRead = t.procedure.use(requireScope("invoice:read"));
const invoiceWrite = t.procedure.use(requireScope("invoice:write"));
const accountRead = t.procedure.use(requireScope("account:read"));
const accountWrite = t.procedure.use(requireScope("account:write"));
const newsRead = t.procedure.use(requireScope("news:read"));
const priceRead = t.procedure.use(requireScope("price:read"));

export const appRouter = t.router({
  // Lấy 1 hoá đơn từ full DB local (kể cả HĐ ngoài cửa sổ Neon). Đồng bộ.
  getInvoice: invoiceRead.input(GetInvoiceInput).output(GetInvoiceOutput)
    .query(({ input, ctx }) => ctx.services.getInvoice(input)),

  // Domain báo đã sửa cash/transfer -> local enqueue đồng bộ (fire-and-forget).
  notifyPaymentEdited: invoiceWrite.input(NotifyPaymentEditedInput).output(NotifyPaymentEditedOutput)
    .mutation(({ input, ctx }) => ctx.services.notifyPaymentEdited(input)),

  // Domain vừa phát hành HĐ gốc -> local ghi hàng đợi kéo HĐ theo transactionUuid (fire-and-forget).
  requestUuidSync: invoiceWrite.input(RequestUuidSyncInput).output(RequestUuidSyncOutput)
    .mutation(({ input, ctx }) => ctx.services.requestUuidSync(input)),

  // Quản lý tài khoản Viettel của local (thay trang admin domain đã gỡ). Scope account:* riêng (nhạy cảm).
  listViettelAccounts: accountRead.output(ListViettelAccountsOutput)
    .query(({ ctx }) => ctx.services.listViettelAccounts()),
  upsertViettelAccount: accountWrite.input(UpsertViettelAccountInput).output(UpsertViettelAccountOutput)
    .mutation(({ input, ctx }) => ctx.services.upsertViettelAccount(input)),
  setViettelAccountSync: accountWrite.input(SetViettelAccountSyncInput).output(SetViettelAccountSyncOutput)
    .mutation(({ input, ctx }) => ctx.services.setViettelAccountSync(input)),

  // PDF HĐ cũ (ngoài cửa sổ Neon) + tra lịch sử HĐ.
  getInvoicePdf: invoiceRead.input(GetInvoicePdfInput).output(GetInvoicePdfOutput)
    .query(({ input, ctx }) => ctx.services.getInvoicePdf(input)),
  searchInvoices: invoiceRead.input(SearchInvoicesInput).output(SearchInvoicesOutput)
    .query(({ input, ctx }) => ctx.services.searchInvoices(input)),

  // Tin tức (thay push local_news_articles).
  searchNews: newsRead.input(SearchNewsInput).output(SearchNewsOutput)
    .query(({ input, ctx }) => ctx.services.searchNews(input)),
  latestNews: newsRead.input(LatestNewsInput).output(LatestNewsOutput)
    .query(({ input, ctx }) => ctx.services.latestNews(input)),
  getNewsArticle: newsRead.input(GetNewsArticleInput).output(GetNewsArticleOutput)
    .query(({ input, ctx }) => ctx.services.getNewsArticle(input)),
  listNewsDomains: newsRead.output(ListNewsDomainsOutput)
    .query(({ ctx }) => ctx.services.listNewsDomains()),
  newsDomainCards: newsRead.input(NewsDomainCardsInput).output(NewsDomainCardsOutput)
    .query(({ input, ctx }) => ctx.services.newsDomainCards(input)),
  topNewsHashtags: newsRead.input(TopNewsHashtagsInput).output(TopNewsHashtagsOutput)
    .query(({ input, ctx }) => ctx.services.topNewsHashtags(input)),

  // Giá (thay push crawled_price_values/price_aggregates).
  getLatestPrice: priceRead.input(GetLatestPriceInput).output(GetLatestPriceOutput)
    .query(({ input, ctx }) => ctx.services.getLatestPrice(input)),
  getPriceHistory: priceRead.input(GetPriceHistoryInput).output(GetPriceHistoryOutput)
    .query(({ input, ctx }) => ctx.services.getPriceHistory(input)),

  // Kiểm tra local + tunnel còn sống (không cần scope).
  ping: t.procedure.output(PingOutput).query(({ ctx }) => ctx.services.ping()),
});

export type AppRouter = typeof appRouter;
