<script setup lang="ts">
import { deviationToTopPercent, hazardScoreToColor } from '~/utils/score'
import type { ScoreResponse } from '~/types'

const props = defineProps<{
  score: ScoreResponse
  loading: boolean
}>()

function topPercent(dev: number): number {
  return deviationToTopPercent(dev)
}

const HAZARD_LABELS: Record<string, string> = {
  flood: '洪水リスク',
  landslide: '土砂災害警戒区域',
  tsunami: '津波浸水想定区域',
  liquefaction: '液状化リスク',
}

const hazardTotalColor = computed(() =>
  hazardScoreToColor(props.score.hazard.total) ?? 'var(--color-text-sub)',
)

const hazardItems = computed(() => {
  const b = props.score.hazard
  return [
    { key: 'flood', label: HAZARD_LABELS.flood, point: b.flood },
    { key: 'landslide', label: HAZARD_LABELS.landslide, point: b.landslide },
    { key: 'tsunami', label: HAZARD_LABELS.tsunami, point: b.tsunami },
    { key: 'liquefaction', label: HAZARD_LABELS.liquefaction, point: b.liquefaction },
  ].filter((i) => i.point !== 0)
})

function formatDist(meters: number | null, radiusMeters: number): string {
  if (meters === null) {
    const r = radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`
    return `${r}以上`
  }
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${meters}m`
}

const convItems = computed(() => {
  const b = props.score.convenience
  const d = props.score.distances
  return [
    { key: 'station',          label: '最寄り駅',       radius: 2000, point: b.station,          dist: formatDist(d?.stationMeters          ?? null, 2000), name: d?.stationName          ?? null },
    { key: 'hospital',         label: '最寄り病院',     radius: 3000, point: b.hospital,         dist: formatDist(d?.hospitalMeters         ?? null, 3000), name: d?.hospitalName         ?? null },
    { key: 'supermarket',      label: '最寄りスーパー', radius: 1500, point: b.supermarket,      dist: formatDist(d?.supermarketMeters      ?? null, 1500), name: d?.supermarketName      ?? null },
    { key: 'convenienceStore', label: '最寄りコンビニ', radius: 1000, point: b.convenienceStore, dist: formatDist(d?.convenienceStoreMeters ?? null, 1000), name: d?.convenienceStoreName ?? null },
    { key: 'school',           label: '最寄り小学校',   radius: 2000, point: b.school,           dist: formatDist(d?.schoolMeters           ?? null, 2000), name: d?.schoolName           ?? null },
  ]
})
</script>

<template>
  <div class="panel">
    <div v-if="loading" class="loading">
      <div class="spinner-lg" />
      <p>スコアを計算中…</p>
    </div>

    <template v-else>
      <!-- 住所 -->
      <div class="address-row">
        <span class="pin">📍</span>
        <span class="address-text">{{ score.address }}</span>
      </div>

      <!-- ハザードスコア -->
      <section class="section hazard-section">
        <h2 class="section-title">
          <span class="badge badge-hazard">ハザード</span>
          <span class="total-score" :style="{ color: hazardTotalColor }">{{ score.hazard.total }}点</span>
        </h2>

        <ul class="breakdown-list">
          <li v-for="item in hazardItems" :key="item.key" class="breakdown-item">
            <span class="item-label">{{ item.label }}</span>
            <span class="item-point hazard-color">{{ item.point }}点</span>
          </li>
          <li v-if="hazardItems.length === 0" class="no-risk">
            リスク該当なし（0点）
          </li>
        </ul>

        <div v-if="score.deviation.hazard !== null" class="deviation-row">
          <span class="dev-label">{{ score.deviation.municipalityName }}内偏差値</span>
          <span class="dev-score">{{ score.deviation.hazard }}</span>
          <span class="dev-pct">（上位 {{ topPercent(score.deviation.hazard) }}%）</span>
        </div>
      </section>

      <!-- 利便性スコア -->
      <section class="section conv-section">
        <h2 class="section-title">
          <span class="badge badge-conv">利便性</span>
          <span class="total-score conv-color">+{{ score.convenience.total }}点</span>
        </h2>

        <ul class="breakdown-list">
          <li
            v-for="item in convItems"
            :key="item.key"
            :class="['breakdown-item', { 'item-zero': item.point === 0 }]"
          >
            <span class="item-label-group">
              <span class="item-label">{{ item.label }}</span>
              <span v-if="item.name" class="item-name">{{ item.name }}</span>
            </span>
            <span class="item-dist">{{ item.dist }}</span>
            <span :class="['item-point', item.point > 0 ? 'conv-color' : 'zero-color']">
              {{ item.point > 0 ? `+${item.point}点` : '–' }}
            </span>
          </li>
        </ul>

        <div v-if="score.deviation.convenience !== null" class="deviation-row">
          <span class="dev-label">{{ score.deviation.municipalityName }}内偏差値</span>
          <span class="dev-score">{{ score.deviation.convenience }}</span>
          <span class="dev-pct">（上位 {{ topPercent(score.deviation.convenience) }}%）</span>
        </div>
      </section>

      <!-- データ出典 -->
      <footer class="data-footer">
        <p class="source">
          出典：{{ score.sources.hazard }} / {{ score.sources.facilities }}
        </p>
        <p class="source">参照日：{{ score.sources.updatedAt }}</p>
        <p class="disclaimer">
          ※本情報は参考情報であり、安全性を保証するものではありません。
          <NuxtLink to="/logic">計算ロジックを確認</NuxtLink>
        </p>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.panel {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 200px;
  color: var(--color-text-sub);
}

.spinner-lg {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.address-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.pin {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.address-text {
  line-height: 1.5;
}

.section {
  border-radius: var(--radius);
  padding: 16px;
}

.hazard-section {
  background: var(--color-hazard-light);
  border: 1px solid #fecaca;
}

.conv-section {
  background: var(--color-conv-light);
  border: 1px solid #bbf7d0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 15px;
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

.total-score {
  font-size: 22px;
  font-weight: 700;
  margin-left: auto;
}

.hazard-color { color: var(--color-hazard); }
.conv-color { color: var(--color-conv); }

.breakdown-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.breakdown-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}

.item-label-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.item-zero .item-label {
  color: var(--color-text-sub);
}

.item-label {
  color: var(--color-text);
}

.item-name {
  font-size: 11px;
  color: var(--color-text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-dist {
  font-size: 13px;
  color: var(--color-text-sub);
  text-align: right;
  white-space: nowrap;
}

.item-point {
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  min-width: 44px;
}

.zero-color {
  color: var(--color-text-sub);
  font-weight: 400;
}

.no-risk {
  font-size: 14px;
  color: var(--color-text-sub);
}

.deviation-row {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
}

.dev-label {
  color: var(--color-text-sub);
}

.dev-score {
  font-size: 20px;
  font-weight: 700;
}

.dev-pct {
  color: var(--color-text-sub);
}

.data-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.source {
  font-size: 12px;
  color: var(--color-text-sub);
  line-height: 1.8;
}

.disclaimer {
  font-size: 11px;
  color: var(--color-text-sub);
  margin-top: 6px;
  line-height: 1.6;
}
</style>
