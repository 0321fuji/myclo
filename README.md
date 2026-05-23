# MYCLO

> 自分のクローゼットからAIがコーデを提案。着る、買う、すべてMYCLOで。

AIパーソナルスタイリストアプリ。クローゼットに服を登録するだけで、天気・気温に合ったコーデをAIが毎日提案します。

## 機能

- **クローゼット管理** — 服の写真を撮って登録。AIが自動でカテゴリ・色・シルエットをタグ付け
- **AIコーデ提案** — カジュアル / ビジネス / モード / トラッド / スポーツのスタイル別に提案
- **脱・マンネリ** — 着用頻度の低い服を優先提案。AIが背中を押してくれる
- **天気連動** — 気温に合わせた重ね着アドバイス（朝開くと今日、夜開くと明日の提案）
- **これにする** — 決定した服の着用記録を残し、同じコーデを繰り返さない

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| データベース | SQLite (Prisma v7 + libsql adapter) |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| 天気データ | Open-Meteo API（無料・APIキー不要）|

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env に OPENAI_API_KEY を入力

# DBマイグレーション
npx prisma migrate dev

# Prismaクライアント生成
npx prisma generate

# 開発サーバー起動
npm run dev
```

http://localhost:3000 で起動します。

## 環境変数

`.env` ファイルを作成し、以下を設定：

```
OPENAI_API_KEY="sk-..."
DATABASE_URL="file:./prisma/dev.db"
```

## ロードマップ

- [ ] 背景透過機能（服の画像をきれいに切り抜き）
- [ ] お気に入り学習（ハートしたコーデを記憶）
- [ ] 過去コーデ履歴
- [ ] EC機能（足りないアイテムをその場で購入）
- [ ] PWA対応（ホーム画面に追加）
