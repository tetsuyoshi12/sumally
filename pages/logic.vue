<script setup lang="ts">
useHead({ title: '計算ロジック公開 | SUMALLY' })

const hazardRules = [
  { condition: '洪水リスク：高（浸水深 5m以上）', point: -30 },
  { condition: '洪水リスク：中（浸水深 0.5〜5m）', point: -15 },
  { condition: '土砂災害警戒区域に該当', point: -20 },
  { condition: '津波浸水想定区域に該当', point: -25 },
  { condition: '液状化リスク：高', point: -15 },
  { condition: '液状化リスク：中', point: -8 },
]

const convRules = [
  { condition: '最寄り駅まで 300m 以内', point: +20 },
  { condition: '最寄り駅まで 1km 以内（300m超）', point: +10 },
  { condition: '病院まで 1km 以内', point: +15 },
  { condition: 'スーパーまで 500m 以内', point: +10 },
  { condition: '学校まで 1km 以内', point: +10 },
]
</script>

<template>
  <div class="logic-page">
    <header class="page-header">
      <NuxtLink to="/" class="back-link">← トップへ</NuxtLink>
      <h1>計算ロジック公開</h1>
    </header>

    <div class="content">
      <section class="section">
        <h2>設計方針</h2>
        <ul class="policy-list">
          <li>ハザードスコアと利便性スコアは<strong>分離して表示</strong>（合計・総合評価はしない）</li>
          <li>すべての加減点を<strong>項目ごとに公開</strong>し、ブラックボックス評価を排除</li>
          <li>市区町村内の<strong>偏差値で相対位置を補完</strong>（都市・地方間の不公平を防ぐ）</li>
          <li>スコアはあくまで参考情報。<strong>最終判断はユーザー自身</strong>が行う</li>
        </ul>
      </section>

      <section class="section">
        <h2>
          <span class="badge badge-hazard">ハザードスコア</span>
          減点方式（基準値 0 点）
        </h2>
        <p class="section-desc">
          国土交通省 不動産情報ライブラリ API のデータを使用。複数リスクが重なる場合は加算（例：洪水高＋土砂 = -50点）。
        </p>
        <table class="rule-table">
          <thead>
            <tr>
              <th>条件</th>
              <th>点数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in hazardRules" :key="r.condition">
              <td>{{ r.condition }}</td>
              <td class="point hazard-color">{{ r.point }}点</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2>
          <span class="badge badge-conv">利便性スコア</span>
          加点方式（基準値 0 点）
        </h2>
        <p class="section-desc">
          Google Places API (New) のデータを使用。駅は 300m 以内と 1km 以内で排他適用（両方は加算しない）。
        </p>
        <table class="rule-table">
          <thead>
            <tr>
              <th>条件</th>
              <th>点数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in convRules" :key="r.condition">
              <td>{{ r.condition }}</td>
              <td class="point conv-color">+{{ r.point }}点</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2>偏差値（相対評価）</h2>
        <p class="section-desc">
          各スコアを市区町村内の平均・標準偏差で正規化し、偏差値として表示します。
          都市・地方間の絶対的なスコア差による不公平を防ぎます。
        </p>
        <div class="formula-box">
          <code>偏差値 = 50 + 10 × (スコア − 市区町村平均) ÷ 標準偏差</code>
        </div>
        <p class="section-desc">
          市区町村統計は 300m グリッドで全国スコアを計算し、毎週日曜深夜にバッチ更新します。
        </p>
      </section>

      <section class="section">
        <h2>データソース</h2>
        <table class="rule-table">
          <thead>
            <tr>
              <th>種別</th>
              <th>提供元</th>
              <th>更新頻度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ハザードデータ</td>
              <td>国土交通省 不動産情報ライブラリ</td>
              <td>随時（当サービスは週次）</td>
            </tr>
            <tr>
              <td>施設データ</td>
              <td>Google Places API</td>
              <td>随時</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section disclaimer-section">
        <h2>免責事項</h2>
        <p>
          本サービスが提供するスコアおよびデータはすべて参考情報です。実際の安全性・利便性を保証するものではありません。
          居住・購入等の重要な意思決定を行う際は、各自治体が公開する正式なハザードマップや現地確認を併せてご活用ください。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.logic-page {
  min-height: 100dvh;
  background: var(--color-bg);
}

.page-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 700;
}

.back-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.section {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 28px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
}

.section h2 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.section-desc {
  font-size: 14px;
  color: var(--color-text-sub);
  margin-bottom: 16px;
  line-height: 1.7;
}

.badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}

.badge-hazard {
  background: var(--color-hazard);
  color: #fff;
}

.badge-conv {
  background: var(--color-conv);
  color: #fff;
}

.policy-list {
  list-style: disc;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.7;
}

.rule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.rule-table th,
.rule-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.rule-table th {
  font-weight: 700;
  color: var(--color-text-sub);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-bg);
}

.point {
  font-weight: 700;
  white-space: nowrap;
}

.hazard-color { color: var(--color-hazard); }
.conv-color { color: var(--color-conv); }

.formula-box {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  overflow-x: auto;
}

code {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 14px;
  white-space: nowrap;
}

.disclaimer-section {
  border-color: #fecaca;
  background: var(--color-hazard-light);
}

.disclaimer-section p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text-sub);
}
</style>
