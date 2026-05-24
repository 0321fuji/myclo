/**
 * シーズンごとのトレンド情報。
 * AIの提案に「いま っぽさ」を注入するためのキュレーションデータ。
 *
 * ⚠️ 更新方法：
 * 1. 新しいシーズンが始まったら、下の TRENDS_2026_SS を参考に同じ構造で追記
 * 2. getCurrentTrends() の判定ロジック（季節 + 性別）を必要に応じて修正
 * 3. lastUpdated を更新
 *
 * 参考ソース：
 * - https://www.net-a-porter.com/en-gr/porter/article-e9e1fd4ba9a6d628/fashion/fashion-memo/ss26-fashion-trends
 * - https://pierrotshop.jp/blog/archives/42209
 * - https://www.beams.co.jp/blog/5915/178158/
 */

export interface SeasonalTrends {
  season: string; // "2026 SS"
  lastUpdated: string; // ISO date
  silhouettes: string[];
  colors: {
    primary: string[]; // メインカラー
    accent: string[]; // アクセントカラー
  };
  vibes: string[]; // 空気感・ムード
  keyItems: string[]; // 注目アイテム
  materials: string[]; // 旬の素材
  outOfStyle: string[]; // 今シーズン古く見えがちな要素
}

// ===== 2026 春夏 ウィメンズ =====
export const TRENDS_2026_SS_WOMEN: SeasonalTrends = {
  season: "2026 春夏",
  lastUpdated: "2026-05-24",
  silhouettes: [
    "バルーン/バブルヘム（ボリューム膨らみ）",
    "コクーンスリーブ（袖の丸み）",
    "ウエストシンチ（くびれ強調）",
    "Iライン回帰（縦長すっきり）",
    "ボックス×ワイドの組み合わせ",
    "パニエ風ボリュームスカート",
  ],
  colors: {
    primary: [
      "バターイエロー",
      "ライトピンク（甘さ控えめ）",
      "クリーンブルー（ミディアム〜ダーク）",
      "ハーブグリーン",
      "モカブラウン",
      "ピュアホワイト",
    ],
    accent: ["シトラスイエロー", "メタリックシルバー", "ボタニカルグリーン"],
  },
  vibes: [
    "クワイエットラグジュアリー（さりげない上質感）",
    "ロマンス＆解放感",
    "ジャパンディ（和×北欧のミニマル）",
    "Y2Kリバイバル（やりすぎない）",
    "グラニーコア（ノスタルジック）",
  ],
  keyItems: [
    "スカルプチュラルデニム（構築的なジーンズ）",
    "レザージャケット（オリーブ/バーガンディ/チョコブラウン）",
    "スリムカプリパンツ",
    "クロシェ/テクスチャー素材のトップス",
    "リゾートショーツ・フレアパンツ",
    "サテンローズの装飾",
  ],
  materials: ["シアー素材", "サテン", "クロシェ", "リネン", "軽量レザー"],
  outOfStyle: [
    "装飾ゼロの完全コンサバ",
    "細すぎるスキニーデニム",
    "やりすぎY2K（露出過多）",
    "重すぎるオーバーサイズ",
  ],
};

// ===== 2026 春夏 メンズ =====
export const TRENDS_2026_SS_MEN: SeasonalTrends = {
  season: "2026 春夏",
  lastUpdated: "2026-05-24",
  silhouettes: [
    "Iライン回帰（縦長すっきり）",
    "ストレートパンツ（脚線をきれいに）",
    "ボックストップス×ワイドボトムス（適度なゆとり）",
    "ショート丈×ワイドの組み合わせ",
    "極端なオーバーサイズから穏やかな適量へ",
  ],
  colors: {
    primary: [
      "水色（淡いブルー）",
      "ミントグリーン",
      "洗いざらしのインディゴ",
      "フェードベージュ",
      "ピュアホワイト",
    ],
    accent: [
      "ビビッドブルー",
      "ビビッドグリーン",
      "サニーレッド（ボリュームと合わせて）",
      "チャコールグレー",
    ],
  },
  vibes: [
    "適度なゆとりで抜け感",
    "洗いざらしの軽やかさ",
    "クワイエットラグジュアリー",
    "Y2K要素を引き算で",
    "クラフト感（手仕事的なディテール）",
  ],
  keyItems: [
    "ストレートテーパードパンツ",
    "ショート丈ボックスシャツ",
    "オープンカラーシャツ",
    "ワイドショーツ",
    "ローファー/メリージェーン",
    "ナイロンライトジャケット",
  ],
  materials: ["リネン", "シアサッカー", "洗いざらしコットン", "ナイロン", "薄手ニット"],
  outOfStyle: [
    "完全な極太ダボダボパンツ",
    "古いスキニーデニム",
    "強いAライン強調（コンパクトトップス×激ボリュームボトム）",
    "ロゴ過多のストリート",
  ],
};

/**
 * 現在のトレンド情報を取得（性別を考慮）
 * 将来的に月で SS/FW を切り替えるならここを変更
 */
export function getCurrentTrends(gender: string | null): SeasonalTrends {
  // TODO: 季節切替（FW、AW等）はここで処理
  // 現在は2026 SS固定
  return gender === "male" ? TRENDS_2026_SS_MEN : TRENDS_2026_SS_WOMEN;
}

/**
 * AIプロンプトに差し込むためのトレンド文字列を生成
 */
export function buildTrendsPromptSnippet(gender: string | null): string {
  const t = getCurrentTrends(gender);
  return `【${t.season} の最新トレンド（${t.lastUpdated}時点）】
- 旬のシルエット: ${t.silhouettes.join("、")}
- 旬のカラー（メイン）: ${t.colors.primary.join("、")}
- 旬のカラー（アクセント）: ${t.colors.accent.join("、")}
- 今シーズンの空気感: ${t.vibes.join("、")}
- 注目アイテム/着こなし: ${t.keyItems.join("、")}
- 旬の素材: ${t.materials.join("、")}
- 今シーズン古く見えがちな要素（避ける）: ${t.outOfStyle.join("、")}

このトレンドを意識し、ユーザーが持っている服から「いまっぽく」着こなせる組み合わせを発見してください。
ただしユーザーのプロフィール（骨格・年齢・好み等）を最優先に。トレンド優先で似合わないものを推すのは避ける。`;
}
