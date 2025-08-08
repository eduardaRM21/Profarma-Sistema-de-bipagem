import { supabase } from './supabase-client'

// Tipos de dados
export interface SessionData {
  area: string
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
  usuarioCustos?: string
}

export interface NotaFiscal {
  id: string
  codigoCompleto: string
  data: string
  numeroNF: string
  volumes: number
  destino: string
  fornecedor: string
  clienteDestino: string
  tipoCarga: string
  timestamp: string
  status: string
  divergencia?: {
    volumesInformados: number
    observacoes: string
  }
}

export interface Carro {
  id: string
  nome: string
  destinoFinal: string
  nfs: NotaFiscal[]
  statusCarro: "aguardando_colagem" | "em_conferencia" | "liberado" | "embalando" | "em_producao"
  dataInicio: string
  ativo: boolean
  sessionId: string
}

export interface Relatorio {
  id: string
  nome: string
  colaboradores: string[]
  data: string
  turno: string
  area: string
  quantidadeNotas: number
  somaVolumes: number
  notas: NotaFiscal[]
  dataFinalizacao: string
  status: string
}

export interface ChatMessage {
  id: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: "colaborador" | "admin"
  destinatarioId: string
  mensagem: string
  timestamp: string
  lida: boolean
}

export interface Conversa {
  id: string
  colaboradores: string[]
  data: string
  turno: string
  ultimaMensagem: string
  ultimoTimestamp: string
  mensagensNaoLidas: number
}

// Serviço de Sessão
export const SessionService = {
  // Salvar sessão
  async saveSession(sessionData: SessionData): Promise<void> {
    try {
      console.log('💾 Tentando salvar sessão no banco...')
      
      const sessionId = `session_${sessionData.colaboradores.join('_')}_${sessionData.data}_${sessionData.turno}`
      console.log('🆔 ID da sessão:', sessionId)
      
      const { error } = await supabase
        .from('sessions')
        .upsert({
          id: sessionId,
          area: sessionData.area,
          colaboradores: sessionData.colaboradores,
          data: sessionData.data,
          turno: sessionData.turno,
          login_time: sessionData.loginTime,
          usuario_custos: sessionData.usuarioCustos,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Erro ao salvar sessão:', error)
        throw error
      }
      
      console.log('✅ Sessão salva com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error)
      throw error
    }
  },

  // Carregar sessão
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      console.log('🔍 Tentando buscar sessão no banco...')
      
      // Buscar a sessão mais recente
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('❌ Erro ao buscar sessão:', error)
        
        // Se não encontrar nenhuma sessão, retornar null
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Nenhuma sessão encontrada no banco')
          return null
        }
        
        // Se for erro de tabela não encontrada, retornar null
        if (error.message?.includes('relation "sessions" does not exist')) {
          console.log('❌ Tabela sessions não existe no banco')
          return null
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Sessão encontrada no banco:', data.id)
        return {
          area: data.area,
          colaboradores: data.colaboradores,
          data: data.data,
          turno: data.turno,
          loginTime: data.login_time,
          usuarioCustos: data.usuario_custos
        }
      }

      return null
    } catch (error) {
      console.error('❌ Erro ao carregar sessão:', error)
      return null
    }
  },

  // Deletar sessão
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      throw error
    }
  }
}

// Serviço de Recebimento
export const RecebimentoService = {
  // Salvar notas de recebimento
  async saveNotas(sessionId: string, notas: NotaFiscal[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar notas de recebimento no banco...')
      console.log('🆔 Session ID:', sessionId)
      console.log('📊 Quantidade de notas:', notas.length)
      
      const { error } = await supabase
        .from('recebimento_notas')
        .upsert({
          session_id: sessionId,
          notas: notas,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Erro ao salvar notas de recebimento:', error)
        throw error
      }
      
      console.log('✅ Notas salvas com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar notas de recebimento:', error)
      throw error
    }
  },

  // Carregar notas de recebimento
  async getNotas(sessionId: string): Promise<NotaFiscal[]> {
    try {
      console.log('🔍 Tentando buscar notas de recebimento no banco...')
      console.log('🆔 Session ID:', sessionId)
      
      const { data, error } = await supabase
        .from('recebimento_notas')
        .select('notas')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao buscar notas de recebimento:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "recebimento_notas" does not exist')) {
          console.log('❌ Tabela recebimento_notas não existe no banco')
          return []
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Notas encontradas no banco:', data.notas?.length || 0, 'notas')
        return data.notas || []
      }

      console.log('ℹ️ Nenhuma nota encontrada para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar notas de recebimento:', error)
      return []
    }
  },

  // Deletar notas de recebimento
  async deleteNotas(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recebimento_notas')
        .delete()
        .eq('session_id', sessionId)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao deletar notas de recebimento:', error)
      throw error
    }
  }
}

// Serviço de Embalagem (Carros)
export const EmbalagemService = {
  // Salvar carros
  async saveCarros(sessionId: string, carros: Carro[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar carros no banco...')
      console.log('🆔 Session ID:', sessionId)
      console.log('📊 Quantidade de carros:', carros.length)
      
      const { error } = await supabase
        .from('embalagem_carros')
        .upsert({
          session_id: sessionId,
          carros: carros,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Erro ao salvar carros:', error)
        throw error
      }
      
      console.log('✅ Carros salvos com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar carros:', error)
      throw error
    }
  },

  // Carregar carros
  async getCarros(sessionId: string): Promise<Carro[]> {
    try {
      console.log('🔍 Tentando buscar carros no banco...')
      console.log('🆔 Session ID:', sessionId)
      
      const { data, error } = await supabase
        .from('embalagem_carros')
        .select('carros')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao buscar carros:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "embalagem_carros" does not exist')) {
          console.log('❌ Tabela embalagem_carros não existe no banco')
          return []
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Carros encontrados no banco:', data.carros?.length || 0, 'carros')
        return data.carros || []
      }

      console.log('ℹ️ Nenhum carro encontrado para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar carros:', error)
      return []
    }
  },

  // Salvar carros finalizados
  async saveCarrosFinalizados(carros: Carro[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('embalagem_carros_finalizados')
        .insert({
          carros: carros,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar carros finalizados:', error)
      throw error
    }
  },

  // Carregar carros finalizados
  async getCarrosFinalizados(): Promise<Carro[]> {
    try {
      const { data, error } = await supabase
        .from('embalagem_carros_finalizados')
        .select('carros')
        .order('created_at', { ascending: false })

      if (error) throw error

      return data?.flatMap(item => item.carros) || []
    } catch (error) {
      console.error('Erro ao carregar carros finalizados:', error)
      return []
    }
  }
}

// Serviço de Relatórios
export const RelatoriosService = {
  // Salvar relatório
  async saveRelatorio(relatorio: Relatorio): Promise<void> {
    try {
      console.log('💾 Tentando salvar relatório no banco...')
      console.log('🆔 Relatório ID:', relatorio.id)
      console.log('📊 Quantidade de notas:', relatorio.notas.length)
      
      const { error } = await supabase
        .from('relatorios')
        .insert({
          id: relatorio.id,
          nome: relatorio.nome,
          colaboradores: relatorio.colaboradores,
          data: relatorio.data,
          turno: relatorio.turno,
          area: relatorio.area,
          quantidade_notas: relatorio.quantidadeNotas,
          soma_volumes: relatorio.somaVolumes,
          notas: relatorio.notas,
          data_finalizacao: relatorio.dataFinalizacao,
          status: relatorio.status,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Erro ao salvar relatório:', error)
        
        // Se for erro de recursos insuficientes, tentar novamente
        if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
          console.log('⚠️ Recursos insuficientes, tentando novamente em 2 segundos...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const { error: retryError } = await supabase
            .from('relatorios')
            .insert({
              id: relatorio.id,
              nome: relatorio.nome,
              colaboradores: relatorio.colaboradores,
              data: relatorio.data,
              turno: relatorio.turno,
              area: relatorio.area,
              quantidade_notas: relatorio.quantidadeNotas,
              soma_volumes: relatorio.somaVolumes,
              notas: relatorio.notas,
              data_finalizacao: relatorio.dataFinalizacao,
              status: relatorio.status,
              created_at: new Date().toISOString()
            })
          
          if (retryError) {
            console.error('❌ Erro na segunda tentativa:', retryError)
            throw retryError
          }
        } else {
          throw error
        }
      }
      
      console.log('✅ Relatório salvo com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      throw error
    }
  },

  // Carregar relatórios
  async getRelatorios(): Promise<Relatorio[]> {
    try {
      console.log('🔍 Tentando buscar relatórios no banco...')
      
      // Limitar a 100 relatórios mais recentes para evitar sobrecarga
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('❌ Erro ao buscar relatórios:', error)
        
        // Se for erro de recursos insuficientes, retornar array vazio
        if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
          console.log('⚠️ Recursos insuficientes no banco, retornando array vazio')
          return []
        }
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "relatorios" does not exist')) {
          console.log('❌ Tabela relatorios não existe no banco')
          return []
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Relatórios encontrados no banco:', data.length, 'relatórios')
        return data.map(item => ({
          id: item.id,
          nome: item.nome,
          colaboradores: item.colaboradores,
          data: item.data,
          turno: item.turno,
          area: item.area,
          quantidadeNotas: item.quantidade_notas,
          somaVolumes: item.soma_volumes,
          notas: item.notas,
          dataFinalizacao: item.data_finalizacao,
          status: item.status
        }))
      }

      return []
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios:', error)
      return []
    }
  }
}

// Serviço de Chat
export const ChatService = {
  // Salvar mensagem
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          id: message.id,
          remetente_id: message.remetenteId,
          remetente_nome: message.remetenteNome,
          remetente_tipo: message.remetenteTipo,
          destinatario_id: message.destinatarioId,
          mensagem: message.mensagem,
          timestamp: message.timestamp,
          lida: message.lida
        })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error)
      throw error
    }
  },

  // Carregar mensagens de uma conversa
  async getMessages(conversaId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('destinatario_id', conversaId)
        .order('timestamp', { ascending: true })

      if (error) throw error

      return data?.map(item => ({
        id: item.id,
        remetenteId: item.remetente_id,
        remetenteNome: item.remetente_nome,
        remetenteTipo: item.remetente_tipo,
        destinatarioId: item.destinatario_id,
        mensagem: item.mensagem,
        timestamp: item.timestamp,
        lida: item.lida
      })) || []
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      return []
    }
  },

  // Marcar mensagens como lidas
  async markAsRead(conversaId: string, remetenteTipo: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ lida: true })
        .eq('destinatario_id', conversaId)
        .eq('remetente_tipo', remetenteTipo)
        .eq('lida', false)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error)
      throw error
    }
  },

  // Contar mensagens não lidas
  async countUnreadMessages(conversaId: string, remetenteTipo: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('destinatario_id', conversaId)
        .eq('remetente_tipo', remetenteTipo)
        .eq('lida', false)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error)
      return 0
    }
  }
}

// Função para migrar dados do localStorage para o banco
export const migrateFromLocalStorage = async () => {
  try {
    console.log('🔄 Iniciando migração do localStorage para o banco...')

    // Migrar sessões
    const sessionData = localStorage.getItem('sistema_session')
    if (sessionData) {
      const session = JSON.parse(sessionData)
      await SessionService.saveSession(session)
      console.log('✅ Sessão migrada')
    }

    // Migrar notas de recebimento
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('recebimento_')) {
        const notas = JSON.parse(localStorage.getItem(key) || '[]')
        if (notas.length > 0) {
          await RecebimentoService.saveNotas(key, notas)
          console.log(`✅ Notas de recebimento migradas: ${key}`)
        }
      }
    }

    // Migrar carros de embalagem
    const carrosData = localStorage.getItem('profarma_carros_embalagem')
    if (carrosData) {
      const carros = JSON.parse(carrosData)
      await EmbalagemService.saveCarrosFinalizados(carros)
      console.log('✅ Carros de embalagem migrados')
    }

    // Migrar relatórios
    const relatoriosData = localStorage.getItem('relatorios_custos')
    if (relatoriosData) {
      const relatorios = JSON.parse(relatoriosData)
      for (const relatorio of relatorios) {
        await RelatoriosService.saveRelatorio(relatorio)
      }
      console.log('✅ Relatórios migrados')
    }

    console.log('✅ Migração concluída com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
  }
}
