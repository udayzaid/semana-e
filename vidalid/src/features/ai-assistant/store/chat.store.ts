import { create } from 'zustand'
import type { AiAgent, ChatMessage } from '../types'

interface ChatState {
  conversations: Record<AiAgent, ChatMessage[]>
  pending: Record<AiAgent, boolean>
  add: (agent: AiAgent, message: Omit<ChatMessage, 'id' | 'createdAt'>) => void
  setPending: (agent: AiAgent, pending: boolean) => void
  clear: (agent: AiAgent) => void
}

/** Conversaciones en memoria (se conservan al cambiar de página; se borran al cerrar sesión o recargar). */
export const useChatStore = create<ChatState>()((set) => ({
  conversations: { admin: [], products: [] },
  pending: { admin: false, products: false },
  add: (agent, message) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [agent]: [...state.conversations[agent], { ...message, id: crypto.randomUUID(), createdAt: Date.now() }],
      },
    })),
  setPending: (agent, pending) => set((state) => ({ pending: { ...state.pending, [agent]: pending } })),
  clear: (agent) => set((state) => ({ conversations: { ...state.conversations, [agent]: [] } })),
}))
