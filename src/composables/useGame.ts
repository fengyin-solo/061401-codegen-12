import { ref, computed } from 'vue'
import type { GameState, LogEntry, RandomEvent, ActionType, ActionEffect, Injury, ActiveInjury } from '@/types/game'
import { randomEvents, injuryDefinitions } from '@/data/events'

const STORAGE_KEY_HIGH_SCORE = 'survival_game_high_score'
const MAX_STAT = 100
const INJURY_DURATION_MAP: Record<string, number> = {
  fracture: 8,
  bleeding: 5,
  infection: 6,
  sprain: 4,
}

const actionEffects: Record<ActionType, ActionEffect> = {
  gatherWood: {
    health: -5, hunger: 5, thirst: 3, wood: 10, stone: 0 },
  gatherStone: {
    health: -8, hunger: 6, thirst: 4, wood: 0, stone: 8 },
  hunt: {
    health: 15, hunger: -20, thirst: 5, wood: -5, stone: 0 },
  drink: {
    health: 0, hunger: 2, thirst: -25, wood: -3, stone: 0 },
}

const actionNames: Record<ActionType, string> = {
  gatherWood: '采集木头',
  gatherStone: '采集石头',
  hunt: '打猎',
  drink: '喝水',
}

function getInjuryById(id: string): Injury | undefined {
  return injuryDefinitions.find(i => i.id === id)
}

export function useGame() {
  const state = ref<GameState>({
    health: 80,
    hunger: 30,
    thirst: 30,
    wood: 10,
    stone: 5,
    turn: 0,
    isGameOver: false,
    logs: [],
    injuries: [],
  })

  const highScore = ref<number>(0)
  let logIdCounter = 0

  const canAct = computed(() => !state.value.isGameOver)

  const activeInjuries = computed(() => {
    return state.value.injuries.map(ai => {
      const def = getInjuryById(ai.injuryId)
      return {
        ...ai,
        definition: def!,
      }
    }).filter(ai => ai.definition)
  })

  const treatableInjuries = computed(() => {
    return activeInjuries.value.filter(ai => {
      const cost = ai.definition.treatCost
      const woodOk = !cost.wood || state.value.wood >= cost.wood
      const stoneOk = !cost.stone || state.value.stone >= cost.stone
      return woodOk && stoneOk
    })
  })

  function loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10) || 0
      }
    } catch (e) {
      highScore.value = 0
    }
  }

  function saveHighScore() {
    if (state.value.turn > highScore.value) {
      highScore.value = state.value.turn
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore.value))
      } catch (e) {
        // ignore
      }
    }
  }

  function addLog(text: string, type: LogEntry['type'] = 'action') {
    state.value.logs.unshift({
      id: ++logIdCounter,
      text,
      type,
      turn: state.value.turn,
    })
    if (state.value.logs.length > 50) {
      state.value.logs.pop()
    }
  }

  function clampStat(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function applyEffects(effects: ActionEffect) {
    if (effects.health !== undefined) {
      state.value.health = clampStat(state.value.health + effects.health, 0, MAX_STAT)
    }
    if (effects.hunger !== undefined) {
      state.value.hunger = clampStat(state.value.hunger + effects.hunger, 0, MAX_STAT)
    }
    if (effects.thirst !== undefined) {
      state.value.thirst = clampStat(state.value.thirst + effects.thirst, 0, MAX_STAT)
    }
    if (effects.wood !== undefined) {
      state.value.wood = Math.max(0, state.value.wood + effects.wood)
    }
    if (effects.stone !== undefined) {
      state.value.stone = Math.max(0, state.value.stone + effects.stone)
    }
  }

  function applyInjuryDebuffs() {
    for (const ai of state.value.injuries) {
      const def = getInjuryById(ai.injuryId)
      if (def) {
        state.value.health = clampStat(state.value.health - def.healthDebuffPerTurn, 0, MAX_STAT)
      }
    }
  }

  function tickInjuries() {
    state.value.injuries = state.value.injuries.filter(ai => {
      ai.turnsRemaining--
      if (ai.turnsRemaining <= 0) {
        const def = getInjuryById(ai.injuryId)
        if (def) {
          addLog(`${def.icon} ${def.name}已自然恢复！`, 'good')
        }
        return false
      }
      return true
    })
  }

  function addInjury(injuryId: string) {
    const existing = state.value.injuries.find(ai => ai.injuryId === injuryId)
    if (existing) {
      existing.turnsRemaining = INJURY_DURATION_MAP[injuryId] ?? 5
      existing.turnsTotal = existing.turnsRemaining
      const def = getInjuryById(injuryId)
      if (def) {
        addLog(`${def.icon} ${def.name}加重了！持续${existing.turnsRemaining}回合`, 'injury')
      }
      return
    }
    const duration = INJURY_DURATION_MAP[injuryId] ?? 5
    state.value.injuries.push({
      injuryId,
      turnsRemaining: duration,
      turnsTotal: duration,
    })
    const def = getInjuryById(injuryId)
    if (def) {
      addLog(`${def.icon} 你受到了${def.name}！${def.description}，持续${duration}回合`, 'injury')
    }
  }

  function canTreatInjury(injuryId: string): boolean {
    if (state.value.isGameOver) return false
    const ai = state.value.injuries.find(a => a.injuryId === injuryId)
    if (!ai) return false
    const def = getInjuryById(injuryId)
    if (!def) return false
    const cost = def.treatCost
    if (cost.wood && state.value.wood < cost.wood) return false
    if (cost.stone && state.value.stone < cost.stone) return false
    return true
  }

  function treatInjury(injuryId: string) {
    if (!canTreatInjury(injuryId)) return
    const def = getInjuryById(injuryId)
    if (!def) return
    const cost = def.treatCost
    if (cost.wood) state.value.wood -= cost.wood
    if (cost.stone) state.value.stone -= cost.stone
    state.value.injuries = state.value.injuries.filter(ai => ai.injuryId !== injuryId)
    const costText = []
    if (cost.wood) costText.push(`木材×${cost.wood}`)
    if (cost.stone) costText.push(`石头×${cost.stone}`)
    addLog(`🏥 你消耗了${costText.join('、')}治疗了${def.name}！`, 'good')
  }

  function getRandomEvent(): RandomEvent {
    const index = Math.floor(Math.random() * randomEvents.length)
    return randomEvents[index]
  }

  function checkGameOver() {
    if (state.value.health <= 0 || state.value.hunger >= MAX_STAT || state.value.thirst >= MAX_STAT) {
      state.value.isGameOver = true
      saveHighScore()
      addLog('你没能在荒野中生存下来...', 'system')
    }
  }

  function canPerformAction(action: ActionType): boolean {
    if (state.value.isGameOver) return false
    const effects = actionEffects[action]
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function performAction(action: ActionType) {
    if (!canPerformAction(action)) return

    const effects = actionEffects[action]
    applyEffects(effects)
    state.value.turn++

    addLog(`第 ${state.value.turn} 回合：${actionNames[action]}`, 'action')

    applyInjuryDebuffs()

    const event = getRandomEvent()
    applyEffects(event.effects)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    if (event.injuryId) {
      addInjury(event.injuryId)
    }

    tickInjuries()

    checkGameOver()
  }

  function gatherWood() {
    performAction('gatherWood')
  }

  function gatherStone() {
    performAction('gatherStone')
  }

  function hunt() {
    performAction('hunt')
  }

  function drink() {
    performAction('drink')
  }

  function restart() {
    state.value = {
      health: 80,
      hunger: 30,
      thirst: 30,
      wood: 10,
      stone: 5,
      turn: 0,
      isGameOver: false,
      logs: [],
      injuries: [],
    }
    logIdCounter = 0
    addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')
  }

  loadHighScore()
  addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')

  return {
    state,
    highScore,
    canAct,
    canPerformAction,
    canTreatInjury,
    treatInjury,
    activeInjuries,
    treatableInjuries,
    injuryDefinitions,
    getInjuryById,
    gatherWood,
    gatherStone,
    hunt,
    drink,
    restart,
  }
}
