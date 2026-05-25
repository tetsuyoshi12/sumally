<script setup lang="ts">
useHead({ title: 'SUMALLY（スマリー）' })
</script>

<template>
  <main class="top-page">
    <div class="hero">
      <div class="logo-wrap">
        <h1 class="logo">SUMALLY</h1>
        <p class="logo-sub">スマリー</p>
      </div>
      <p class="tagline">"住む"を"ally（味方）"に。</p>
      <p class="description">
        住所を入力するだけで、ハザードリスクと生活利便性を<br class="br-pc" />
        一画面でわかりやすく確認できます。
      </p>

      <div class="search-area">
        <AddressSearch />
      </div>

      <div class="features">
        <div class="feature-item">
          <span class="feature-icon">🛡️</span>
          <p class="feature-title">ハザードリスク</p>
          <p class="feature-desc">洪水・土砂・津波・液状化の4リスクを分かりやすく</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🏪</span>
          <p class="feature-title">生活利便性</p>
          <p class="feature-desc">駅・病院・スーパー・学校の近さをスコア化</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <p class="feature-title">完全透明なロジック</p>
          <p class="feature-desc">加減点をすべて公開。ブラックボックス評価なし</p>
        </div>
      </div>
    </div>

    <footer class="site-footer">
      <NuxtLink to="/logic">計算ロジック公開</NuxtLink>
      <span class="sep">|</span>
      <span>データ出典：国土交通省・Google Places API</span>
    </footer>
  </main>
</template>

<style scoped>
.top-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.hero {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.logo-wrap {
  text-align: center;
}

.logo {
  font-size: clamp(36px, 8vw, 56px);
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--color-primary);
  line-height: 1;
}

.logo-sub {
  font-size: 14px;
  color: var(--color-text-sub);
  margin-top: 4px;
  letter-spacing: 0.1em;
}

.tagline {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.description {
  font-size: 15px;
  color: var(--color-text-sub);
  text-align: center;
  line-height: 1.8;
}

.br-pc {
  display: none;
}

@media (min-width: 600px) {
  .br-pc {
    display: block;
  }
}

.search-area {
  width: 100%;
  display: flex;
  justify-content: center;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 600px) {
  .features {
    grid-template-columns: 1fr;
  }
}

.feature-item {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 20px 16px;
  text-align: center;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
}

.feature-icon {
  font-size: 28px;
}

.feature-title {
  font-size: 14px;
  font-weight: 700;
  margin-top: 10px;
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 12px;
  color: var(--color-text-sub);
  line-height: 1.6;
}

.site-footer {
  margin-top: auto;
  padding-top: 40px;
  font-size: 12px;
  color: var(--color-text-sub);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.sep {
  color: var(--color-border);
}
</style>
