# local-rpc-contract

Contract **tRPC v11** dùng chung giữa:
- **OCR_local_host** (server) — chạy standalone tRPC server, expose qua Cloudflare tunnel.
- **domain taodeptrai** (client) — gọi hàm local có kiểu đầy đủ: `local.getInvoice.query(...)`.

Package **source-only** (`.ts`), chỉ phụ thuộc peer `@trpc/server` + `zod`. KHÔNG chứa code local (prisma/lib) —
local tiêm dịch vụ thật qua `LocalServices`. Domain chỉ dùng `type AppRouter` (type-only, không bundle runtime).

## Cài (cả 2 repo) — git dependency (Vercel cài được)

```bash
npm i github:TrinhQuanVN/local-rpc-contract
# cần có sẵn peer deps ở mỗi repo:
npm i @trpc/server zod           # local (server)
npm i @trpc/client @trpc/server zod   # domain (client cần @trpc/server cho type)
```

Ghim commit cho ổn định: `github:TrinhQuanVN/local-rpc-contract#<commit>`.

## Server (OCR_local_host)

```ts
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter, type LocalServices } from "local-rpc-contract";

const services: LocalServices = {
  async getInvoice(input) { /* query full DB local -> InvoiceData */ return { found: false, invoice: null }; },
  async notifyPaymentEdited(input) { /* enqueue pg-boss */ return { enqueued: true }; },
  async ping() { return { ok: true, at: new Date().toISOString() }; },
};

createHTTPServer({
  router: appRouter,
  createContext({ req }) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${process.env.MCP_LINK_SHARED_TOKEN}`) throw new Error("unauthorized");
    return { services };
  },
}).listen(4112);
```

## Client (domain)

```ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "local-rpc-contract";

// url đọc từ Neon `local_endpoint` (local ghi URL tunnel hiện tại lúc boot)
export function makeLocal(url: string) {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url, headers: () => ({ authorization: `Bearer ${process.env.MCP_LINK_SHARED_TOKEN}` }) })],
  });
}

// dùng trong server action / route handler:
const local = makeLocal(await getLocalUrlFromNeon());
const r = await local.getInvoice.query({ invoiceNo: "C26MXX5229" }); // r: GetInvoiceOutput (typed)
await local.notifyPaymentEdited.mutate({ taxCode: "0700756585" });
```

## Ghi chú
- **Domain chỉ import `type AppRouter`** (type-only) → không cần `transpilePackages`. Nếu import zod schema
  (runtime) để validate ở domain, thêm `transpilePackages: ["local-rpc-contract"]` vào `next.config`.
- **getInvoice đồng bộ** → cần local + tunnel SỐNG; domain bắt lỗi "local offline".
- **zod**: contract dùng cú pháp tương thích cả zod 3 và 4.
- Đổi/thêm procedure: sửa `contract.ts` + `router.ts` + `services.ts` ở package, bump version, cả 2 repo `npm i` lại.
