<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveInjury, Injury } from '@/types/game'

interface StatItem {
  label: string
  value: number
  max: number
  icon: string
  color: string
  barColor: string
  isReverse?: boolean
}

interface InjuryItem {
  injuryId: string
  name: string
  icon: string
  description: string
  healthDebuffPerTurn: number
  turnsRemaining: number
  turnsTotal: number
  treatCost: { wood?: number; stone?: number }
  canTreat: boolean
}

interface Props {
  health: number
  hunger: number
  thirst: number
  wood: number
  stone: number
  injuries: InjuryItem[]
  canTreatInjury: (id: string) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  treat: [injuryId: string]
}>()

const stats = computed<StatItem[]>(() => [
  {
    label: '生命值',
    value: props.health,
    max: 100,
    icon: '❤️',
    color: 'text-red-400',
    barColor: 'bg-red-500',
  },
  {
    label: '饥饿值',
    value: props.hunger,
    max: 100,
    icon: '🍖',
    color: 'text-orange-400',
    barColor: 'bg-orange-500',
    isReverse: true,
  },
  {
    label: '口渴值',
    value: props.thirst,
    max: 100,
    icon: '💧',
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    isReverse: true,
  },
  {
    label: '木材',
    value: props.wood,
    max: 100,
    icon: '🪵',
    color: 'text-amber-600',
    barColor: 'bg-amber-600',
  },
  {
    label: '石头',
    value: props.stone,
    max: 100,
    icon: '🪨',
    color: 'text-gray-400',
    barColor: 'bg-gray-400',
  },
])

function getBarWidth(value: number, max: number): string {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return `${percent}%`
}

function isDanger(value: number, max: number, isReverse?: boolean): boolean {
  const percent = (value / max) * 100
  if (isReverse) {
    return percent >= 80
  }
  return percent <= 20
}

function getInjuryProgress(item: InjuryItem): number {
  return Math.round(((item.turnsTotal - item.turnsRemaining) / item.turnsTotal) * 100)
}

function formatTreatCost(cost: { wood?: number; stone?: number }): string {
  const parts: string[] = []
  if (cost.wood) parts.push(`🪵${cost.wood}`)
  if (cost.stone) parts.push(`🪨${cost.stone}`)
  return parts.join(' ')
}
</script>

<template>
  <div class="bg-game-card rounded-2xl p-6 border border-game-border shadow-xl">
    <h2 class="text-xl font-bold text-white mb-5 flex items-center gap-2">
      <span>📊</span>
      <span>生存状态</span>
    </h2>
    <div class="space-y-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ stat.icon }}</span>
            <span :class="[stat.color, 'font-medium text-sm']">{{ stat.label }}</span>
          </div>
          <span
            :class="[
              stat.color,
              'font-bold text-sm tabular-nums',
              isDanger(stat.value, stat.max, stat.isReverse) ? 'animate-pulse-soft' : '',
            ]"
          >
            {{ Math.round(stat.value) }}
          </span>
        </div>
        <div class="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            :class="[stat.barColor, 'h-full rounded-full transition-all duration-300 ease-out']"
            :style="{ width: getBarWidth(stat.value, stat.max) }"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="injuries.length > 0" class="mt-5">
      <div class="border-t border-game-border pt-4">
        <h3 class="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
          <span>🏥</span>
          <span>伤病状态</span>
        </h3>
        <div class="space-y-2.5">
          <div
            v-for="injury in injuries"
            :key="injury.injuryId"
            class="bg-red-950/30 border border-red-900/40 rounded-lg p-3"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-base">{{ injury.icon }}</span>
                <span class="text-red-300 font-semibold text-sm">{{ injury.name }}</span>
              </div>
              <span class="text-red-400/70 text-xs tabular-nums">
                剩余 {{ injury.turnsRemaining }} 回合
              </span>
            </div>
            <p class="text-red-400/60 text-xs mb-2">{{ injury.description }}</p>
            <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                class="h-full bg-red-600/60 rounded-full transition-all duration-300"
                :style="{ width: getInjuryProgress(injury) + '%' }"
              ></div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500 text-xs">
                治疗: {{ formatTreatCost(injury.treatCost) }}
              </span>
              <button
                @click="emit('treat', injury.injuryId)"
                :disabled="!injury.canTreat"
                :class="[
                  'text-xs px-3 py-1 rounded-md font-medium transition-all',
                  injury.canTreat
                    ? 'bg-green-800/50 text-green-300 hover:bg-green-700/60 cursor-pointer active:scale-95'
                    : 'bg-gray-800/50 text-gray-600 cursor-not-allowed',
                ]"
              >
                🏥 治疗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
