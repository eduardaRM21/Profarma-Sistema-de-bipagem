import { useState, useEffect } from 'react'
import { 
  SessionService, 
  RecebimentoService, 
  EmbalagemService, 
  RelatoriosService, 
  ChatService,
  migrateFromLocalStorage,
  type SessionData,
  type NotaFiscal,
  type Carro,
  type Relatorio,
  type ChatMessage
} from '@/lib/database-service'

export const useDatabase = () => {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)

  // Migração automática quando o sistema inicia
  useEffect(() => {
    const performAutoMigration = async () => {
      // Verificar se há dados no localStorage que precisam ser migrados
      const hasLocalData = localStorage.getItem('sistema_session') || 
                          localStorage.getItem('relatorios_custos') ||
                          localStorage.getItem('profarma_carros_embalagem')
      
      if (hasLocalData) {
        console.log('🔄 Dados encontrados no localStorage, iniciando migração automática...')
        setIsMigrating(true)
        try {
          await migrateFromLocalStorage()
          setMigrationComplete(true)
          console.log('✅ Migração automática concluída!')
        } catch (error) {
          console.error('❌ Erro durante migração automática:', error)
        } finally {
          setIsMigrating(false)
        }
      }
    }

    performAutoMigration()
  }, [])

  return {
    isMigrating,
    migrationComplete
  }
}

// Hook para sessões
export const useSession = () => {
  const saveSession = async (sessionData: SessionData) => {
    await SessionService.saveSession(sessionData)
  }

  const getSession = async (sessionId: string): Promise<SessionData | null> => {
    return await SessionService.getSession(sessionId)
  }

  const deleteSession = async (sessionId: string) => {
    await SessionService.deleteSession(sessionId)
  }

  return {
    saveSession,
    getSession,
    deleteSession
  }
}

// Hook para recebimento
export const useRecebimento = () => {
  const saveNotas = async (sessionId: string, notas: NotaFiscal[]) => {
    await RecebimentoService.saveNotas(sessionId, notas)
  }

  const getNotas = async (sessionId: string): Promise<NotaFiscal[]> => {
    return await RecebimentoService.getNotas(sessionId)
  }

  const deleteNotas = async (sessionId: string) => {
    await RecebimentoService.deleteNotas(sessionId)
  }

  return {
    saveNotas,
    getNotas,
    deleteNotas
  }
}

// Hook para embalagem
export const useEmbalagem = () => {
  const saveCarros = async (sessionId: string, carros: Carro[]) => {
    await EmbalagemService.saveCarros(sessionId, carros)
  }

  const getCarros = async (sessionId: string): Promise<Carro[]> => {
    return await EmbalagemService.getCarros(sessionId)
  }

  const saveCarrosFinalizados = async (carros: Carro[]) => {
    await EmbalagemService.saveCarrosFinalizados(carros)
  }

  const getCarrosFinalizados = async (): Promise<Carro[]> => {
    return await EmbalagemService.getCarrosFinalizados()
  }

  return {
    saveCarros,
    getCarros,
    saveCarrosFinalizados,
    getCarrosFinalizados
  }
}

// Hook para relatórios
export const useRelatorios = () => {
  const saveRelatorio = async (relatorio: Relatorio) => {
    await RelatoriosService.saveRelatorio(relatorio)
  }

  const getRelatorios = async (): Promise<Relatorio[]> => {
    return await RelatoriosService.getRelatorios()
  }

  return {
    saveRelatorio,
    getRelatorios
  }
}

// Hook para chat
export const useChat = () => {
  const saveMessage = async (message: ChatMessage) => {
    await ChatService.saveMessage(message)
  }

  const getMessages = async (conversaId: string): Promise<ChatMessage[]> => {
    return await ChatService.getMessages(conversaId)
  }

  const markAsRead = async (conversaId: string, remetenteTipo: string) => {
    await ChatService.markAsRead(conversaId, remetenteTipo)
  }

  const countUnreadMessages = async (conversaId: string, remetenteTipo: string): Promise<number> => {
    return await ChatService.countUnreadMessages(conversaId, remetenteTipo)
  }

  return {
    saveMessage,
    getMessages,
    markAsRead,
    countUnreadMessages
  }
}
