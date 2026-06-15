export interface Injury {
  id: string
  name: string
  icon: string
  description: string
  healthDebuffPerTurn: number
  treatCost: { wood?: number; stone?: number }
}

export interface ActiveInjury {
  injuryId: string
  turnsRemaining: number
  turnsTotal: number
}

export interface GameState {
  health: number
  hunger: number
  thirst: number
  wood: number
  stone: number
  turn: number
  isGameOver: boolean
  logs: LogEntry[]
  injuries: ActiveInjury[]
}

export interface LogEntry {
  id: number
  text: string
  type: 'action' | 'event' | 'system' | 'good' | 'bad' | 'injury'
  turn: number
}

export interface RandomEvent {
  id: string
  text: string
  type: 'good' | 'bad' | 'neutral'
  effects: {
    health?: number
    hunger?: number
    thirst?: number
    wood?: number
    stone?: number
  }
  injuryId?: string
}

export type ActionType = 'gatherWood' | 'gatherStone' | 'hunt' | 'drink'

export interface ActionEffect {
  health?: number
  hunger?: number
  thirst?: number
  wood?: number
  stone?: number
}
