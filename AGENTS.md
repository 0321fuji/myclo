<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project: MYCLO

AIパーソナルスタイリストアプリ。Googleログイン認証済みのユーザーが自分のクローゼットを管理し、AIがコーデを提案する。

## Tech Stack

| Category | Tech |
|----------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) via Prisma v7 |
| Auth | NextAuth.js v5 (beta) + Google OAuth |
| AI | OpenAI GPT-4o（タグ付け） / Gemini 2.5 Flash Image（背景削除・無料枠500枚/日） |
| Image Storage | Cloudinary |
| Deploy | Vercel |

## ⚠️ Prisma v7 — 必読

Prisma v7 は破壊的変更あり。以下のルールを必ず守ること。

### schema.prisma
```prisma
generator client {
  provider = "prisma-client"   # "prisma-client-js" は使わない
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  # url は書かない。prisma.config.ts で管理する
}
```

### prisma.config.ts
```typescript
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL! },
});
```

### src/lib/prisma.ts
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- `new PrismaClient()` を直接呼ぶな → 必ず `@prisma/adapter-pg` を使う
- `datasourceUrl` オプションは存在しない
- スキーマ変更後は必ず `npx prisma migrate dev` を実行

## ⚠️ NextAuth.js v5 — 必読

- config は `src/lib/auth.config.ts`（Edge対応）と `src/lib/auth.ts` に分離している
- middleware は `src/lib/auth.config.ts` の設定を使う
- セッションからユーザーIDを取得: `const session = await auth(); session.user.id`

## 環境変数

`.env` はGitに含まれない。Vercelに以下が設定済み：

- `DATABASE_URL` — Supabase PostgreSQL接続文字列
- `OPENAI_API_KEY` — OpenAI APIキー（タグ付け用）
- `GEMINI_API_KEY` — Google Gemini APIキー（背景削除用）
- `AUTH_SECRET` — NextAuth署名キー
- `AUTH_GOOGLE_ID` — Google OAuthクライアントID
- `AUTH_GOOGLE_SECRET` — Google OAuthシークレット
- `AUTH_URL` — `https://myclo.vercel.app`
- `CLOUDINARY_CLOUD_NAME` — Cloudinaryクラウド名
- `CLOUDINARY_API_KEY` — CloudinaryのAPIキー
- `CLOUDINARY_API_SECRET` — CloudinaryのAPIシークレット

## APIルート一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/clothing` | ログインユーザーの服一覧 |
| POST | `/api/clothing` | 服を登録 |
| PATCH | `/api/clothing/[id]` | 服を更新（着用回数など） |
| DELETE | `/api/clothing/[id]` | 服を削除 |
| POST | `/api/clothing/tag` | GPT-4oで画像自動タグ付け |
| POST | `/api/clothing/remove-bg` | Gemini 2.5 Flash Imageで背景削除 |
| POST | `/api/coordinator/chat` | コーディネーター（3キャラ）とチャット |
| POST | `/api/upload` | Cloudinaryに画像アップロード |
| POST | `/api/outfit/suggest` | AIコーデ提案 |
| GET | `/api/weather` | Open-Meteo天気取得 |

## ナレッジモジュール（LEOの専門知識）

LEO（およびゆくゆく他のコーディネーター）には、シキユウスケ氏のファッション知見を `src/lib/shiki/` 配下のナレッジモジュールとして注入している。質問内容に応じて関連モジュールが自動選択される。

- 追加手順：`src/lib/shiki/README.md` 参照
- 汎用設計パターンドキュメント：`docs/knowledge-modules-pattern.md`
  - 他プロジェクト（FAQ Bot、教育AI、ロールプレイ等）にも転用可能
- サポートAI領域向け応用ガイド：`docs/knowledge-modules-for-support-ai.md`
  - 既存システムとの組合せ・移行コスト・エンジニア向けFAQ

## DBスキーマ変更時の手順

```bash
# 1. prisma/schema.prisma を編集
# 2. マイグレーション実行
npx prisma migrate dev --name <変更内容>
# 3. クライアント再生成（buildスクリプトに含まれているので通常不要）
npx prisma generate
```
