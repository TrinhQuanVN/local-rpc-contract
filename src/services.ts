import type {
  GetInvoiceInput, GetInvoiceOutput,
  NotifyPaymentEditedInput, NotifyPaymentEditedOutput,
  RequestUuidSyncInput, RequestUuidSyncOutput,
  ListViettelAccountsOutput,
  UpsertViettelAccountInput, UpsertViettelAccountOutput,
  SetViettelAccountSyncInput, SetViettelAccountSyncOutput,
  DeleteViettelAccountInput, DeleteViettelAccountOutput,
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
 * INTERFACE dịch vụ mà LOCAL cung cấp (qua tRPC context). Package KHÔNG biết prisma/lib - local implement
 * interface này rồi tiêm vào context. Nhờ vậy package sạch (chỉ @trpc/server + zod), domain chỉ cần AppRouter type.
 */
export interface LocalServices {
  getInvoice(input: GetInvoiceInput): Promise<GetInvoiceOutput>;
  notifyPaymentEdited(input: NotifyPaymentEditedInput): Promise<NotifyPaymentEditedOutput>;
  requestUuidSync(input: RequestUuidSyncInput): Promise<RequestUuidSyncOutput>;
  listViettelAccounts(): Promise<ListViettelAccountsOutput>;
  upsertViettelAccount(input: UpsertViettelAccountInput): Promise<UpsertViettelAccountOutput>;
  setViettelAccountSync(input: SetViettelAccountSyncInput): Promise<SetViettelAccountSyncOutput>;
  deleteViettelAccount(input: DeleteViettelAccountInput): Promise<DeleteViettelAccountOutput>;
  getInvoicePdf(input: GetInvoicePdfInput): Promise<GetInvoicePdfOutput>;
  searchInvoices(input: SearchInvoicesInput): Promise<SearchInvoicesOutput>;
  searchNews(input: SearchNewsInput): Promise<SearchNewsOutput>;
  latestNews(input: LatestNewsInput): Promise<LatestNewsOutput>;
  getNewsArticle(input: GetNewsArticleInput): Promise<GetNewsArticleOutput>;
  listNewsDomains(): Promise<ListNewsDomainsOutput>;
  newsDomainCards(input: NewsDomainCardsInput): Promise<NewsDomainCardsOutput>;
  topNewsHashtags(input: TopNewsHashtagsInput): Promise<TopNewsHashtagsOutput>;
  getLatestPrice(input: GetLatestPriceInput): Promise<GetLatestPriceOutput>;
  getPriceHistory(input: GetPriceHistoryInput): Promise<GetPriceHistoryOutput>;
  ping(): Promise<PingOutput>;
}

/** Danh tính client dịch vụ đã xác thực (JWT/token tĩnh) - local tiêm vào context để router gác scope THÔ. */
export type ServiceClaims = { sub: string; scopes: string[] };

export interface LocalContext {
  services: LocalServices;
  claims: ServiceClaims | null;
}
