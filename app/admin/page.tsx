"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageCircle,
  Clock,
  Send,
  Shield,
  MessageSquare,
  User,
  CheckCircle2,
  FileText,
  BarChart3,
  Truck,
} from "lucide-react"

import GerenciarCarrosSection from "./components/gerenciar-carros-section"

interface ChatMessage {
  id: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: "colaborador" | "admin"
  destinatarioId: string
  mensagem: string
  timestamp: string
  lida: boolean
}

interface Conversa {
  id: string
  colaboradores: string[]
  data: string
  turno: string
  ultimaMensagem: string
  ultimoTimestamp: string
  mensagensNaoLidas: number
}

export default function AdminPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [novaMensagem, setNovaMensagem] = useState("")
  const [filtro, setFiltro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    carregarConversas()
    // Polling para atualizações em tempo real
    const interval = setInterval(carregarConversas, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (conversaSelecionada) {
      carregarMensagens(conversaSelecionada.id)
      // Polling para mensagens da conversa selecionada
      const interval = setInterval(() => carregarMensagens(conversaSelecionada.id), 1000)
      return () => clearInterval(interval)
    }
  }, [conversaSelecionada])

  const carregarConversas = () => {
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      setConversas(conversasArray)
    }
  }

  const carregarMensagens = (conversaId: string) => {
    const chaveStorage = `profarma_chat_${conversaId}`
    const mensagensSalvas = localStorage.getItem(chaveStorage)

    if (mensagensSalvas) {
      const mensagensArray = JSON.parse(mensagensSalvas)
      setMensagens(mensagensArray)

      // Marcar mensagens dos colaboradores como lidas
      const mensagensAtualizadas = mensagensArray.map((msg: ChatMessage) => {
        if (msg.remetenteTipo === "colaborador" && !msg.lida) {
          return { ...msg, lida: true }
        }
        return msg
      })

      if (JSON.stringify(mensagensArray) !== JSON.stringify(mensagensAtualizadas)) {
        localStorage.setItem(chaveStorage, JSON.stringify(mensagensAtualizadas))
        setMensagens(mensagensAtualizadas)

        // Atualizar contador na lista de conversas
        atualizarContadorConversa(conversaId)
      }
    }
  }

  const atualizarContadorConversa = (conversaId: string) => {
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      const conversaIndex = conversasArray.findIndex((c: Conversa) => c.id === conversaId)

      if (conversaIndex !== -1) {
        conversasArray[conversaIndex].mensagensNaoLidas = 0
        localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))
        setConversas(conversasArray)
      }
    }
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || enviando) return

    setEnviando(true)

    const mensagem: ChatMessage = {
      id: Date.now().toString(),
      remetenteId: "admin",
      remetenteNome: "Administrador",
      remetenteTipo: "admin",
      destinatarioId: conversaSelecionada.id,
      mensagem: novaMensagem.trim(),
      timestamp: new Date().toISOString(),
      lida: false,
    }

    // Adicionar à lista local
    const novasMensagens = [...mensagens, mensagem]
    setMensagens(novasMensagens)

    // Salvar no localStorage
    const chaveStorage = `profarma_chat_${conversaSelecionada.id}`
    localStorage.setItem(chaveStorage, JSON.stringify(novasMensagens))

    // Atualizar lista de conversas
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasSalvas = localStorage.getItem(chaveListaGeral)

    if (conversasSalvas) {
      const conversasArray = JSON.parse(conversasSalvas)
      const conversaIndex = conversasArray.findIndex((c: Conversa) => c.id === conversaSelecionada.id)

      if (conversaIndex !== -1) {
        conversasArray[conversaIndex].ultimaMensagem = mensagem.mensagem
        conversasArray[conversaIndex].ultimoTimestamp = mensagem.timestamp
        localStorage.setItem(chaveListaGeral, JSON.stringify(conversasArray))
        setConversas(conversasArray)
      }
    }

    setNovaMensagem("")
    setEnviando(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const formatarHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatarData = (timestamp: string) => {
    const data = new Date(timestamp)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)

    if (data.toDateString() === hoje.toDateString()) {
      return "Hoje"
    } else if (data.toDateString() === ontem.toDateString()) {
      return "Ontem"
    } else {
      return data.toLocaleDateString("pt-BR")
    }
  }

  const conversasFiltradas = conversas.filter(
    (conversa) =>
      conversa.colaboradores.some((col) => col.toLowerCase().includes(filtro.toLowerCase())) ||
      conversa.data.includes(filtro) ||
      conversa.turno.toLowerCase().includes(filtro.toLowerCase()),
  )

  const totalMensagensNaoLidas = conversas.reduce((total, conversa) => total + conversa.mensagensNaoLidas, 0)

  // Agrupar mensagens por data
  const mensagensAgrupadas = mensagens.reduce((grupos: any, mensagem) => {
    const data = formatarData(mensagem.timestamp)
    if (!grupos[data]) {
      grupos[data] = []
    }
    grupos[data].push(mensagem)
    return grupos
  }, {})

  function ChatSection() {
    // Todo o código atual do chat vai aqui
    return (
      <Card className="lg:col-span-2">
        {conversaSelecionada ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-600" />
                <span>{conversaSelecionada.colaboradores.join(" + ")}</span>
              </CardTitle>
              <div className="text-sm text-gray-600">
                {conversaSelecionada.data} • Turno {conversaSelecionada.turno}
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[500px]">
              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                {Object.keys(mensagensAgrupadas).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma mensagem ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(mensagensAgrupadas).map(([data, mensagensData]: [string, any]) => (
                      <div key={data}>
                        {/* Separador de data */}
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{data}</div>
                        </div>

                        {/* Mensagens do dia */}
                        <div className="space-y-3">
                          {mensagensData.map((mensagem: ChatMessage) => (
                            <div
                              key={mensagem.id}
                              className={`flex ${mensagem.remetenteTipo === "admin" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  mensagem.remetenteTipo === "admin"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {mensagem.remetenteTipo === "colaborador" && (
                                  <div className="flex items-center space-x-1 mb-1">
                                    <User className="h-3 w-3" />
                                    <span className="text-xs font-medium">{mensagem.remetenteNome}</span>
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{mensagem.mensagem}</p>
                                <div
                                  className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
                                    mensagem.remetenteTipo === "admin" ? "text-blue-100" : "text-gray-500"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>{formatarHora(mensagem.timestamp)}</span>
                                  {mensagem.remetenteTipo === "admin" && mensagem.lida && (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Campo de envio */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite sua resposta..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={enviando}
                    className="flex-1"
                  />
                  <Button
                    onClick={enviarMensagem}
                    disabled={!novaMensagem.trim() || enviando}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {enviando ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Pressione Enter para enviar</p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[500px]">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
              <p>Escolha uma conversa da lista ao lado para começar a responder</p>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  function RelatoriosSection() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <span>Relatórios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Relatórios e estatísticas serão implementados aqui.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-500">Sistema de Bipagem Profarma</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge className="bg-blue-100 text-blue-800">
                <MessageCircle className="h-4 w-4 mr-1" />
                {totalMensagensNaoLidas} mensagens não lidas
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeSection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Chat de Suporte */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <MessageSquare className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Chat de Suporte</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Gerenciar conversas e responder colaboradores</p>
                <div className="mb-4">
                  <Badge className="bg-blue-100 text-blue-800">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {totalMensagensNaoLidas} mensagens não lidas
                  </Badge>
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                  onClick={() => setActiveSection("chat")}
                >
                  Acessar Chat
                </Button>
              </CardContent>
            </Card>

            {/* Gerenciar Carros */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Truck className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Gerenciar Carros e Lançamentos</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Visualizar, excluir, gerenciar carros e fazer lançamentos</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                  onClick={() => setActiveSection("gerenciar-carros")}
                >
                  Gerenciar Carros e Lançamentos
                </Button>
              </CardContent>
            </Card>



            {/* Relatórios */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-green-300">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <BarChart3 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Relatórios</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Visualizar relatórios e estatísticas do sistema</p>
                <Button
                  className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                  onClick={() => setActiveSection("relatorios")}
                >
                  Ver Relatórios
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <Button variant="outline" onClick={() => setActiveSection(null)} className="mb-6">
              ← Voltar ao Menu Principal
            </Button>

            {activeSection === "chat" && <ChatSection />}
            {activeSection === "gerenciar-carros" && <GerenciarCarrosSection />}
            {activeSection === "relatorios" && <RelatoriosSection />}
          </div>
        )}
      </main>
    </div>
  )
}
