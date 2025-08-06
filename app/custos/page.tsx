"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  LogOut,
  FileText,
  User,
  Calendar,
  Package,
  Eye,
  Copy,
  CheckCircle,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";

interface SessionData {
  colaborador?: string;
  colaboradores?: string[];
  data: string;
  turno: string;
  area: string;
  loginTime: string;
  usuarioCustos?: string;
}

interface NotaFiscal {
  id: string;
  codigoCompleto: string;
  data: string;
  numeroNF: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  clienteDestino: string;
  tipoCarga: string;
  timestamp: string;
  status: "ok" | "divergencia";
  divergencia?: {
    tipo: string;
    descricao: string;
    volumesInformados: number;
  };
}

interface Relatorio {
  id: string;
  nome: string;
  colaboradores: string;
  data: string;
  turno: string;
  area: string;
  quantidadeNotas: number;
  somaVolumes: number;
  notas: NotaFiscal[];
  dataFinalizacao: string;
  status: string;
}

const copiarDadosParaSAP = (dados: string, tipo: string) => {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(dados)
      .then(() => {
        alert(
          `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
        );
      })
      .catch(() => {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = dados;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
        );
      });
  } else {
    // Fallback para navegadores antigos
    const textArea = document.createElement("textarea");
    textArea.value = dados;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert(
      `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
    );
  }
};

export default function CustosPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const router = useRouter();

  // Estados para filtros e ordenação
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroColaborador, setFiltroColaborador] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("data_desc");
  const [notasFiltradas, setNotasFiltradas] = useState<NotaFiscal[]>([]);
  const [relatorioSelecionado, setRelatorioSelecionado] =
    useState<Relatorio | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("sistema_session");
    if (!session) {
      router.push("/");
      return;
    }

    const sessionObj = JSON.parse(session);
    if (sessionObj.area !== "custos") {
      router.push("/");
      return;
    }

    setSessionData(sessionObj);
    carregarRelatorios();

    // Polling para atualizações
    const interval = setInterval(carregarRelatorios, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const carregarRelatorios = () => {
    const chaveRelatorios = "relatorios_custos";
    const relatoriosSalvos = localStorage.getItem(chaveRelatorios);
    if (relatoriosSalvos) {
      setRelatorios(JSON.parse(relatoriosSalvos));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sistema_session");
    router.push("/");
  };

  const copiarNFs = (notas: NotaFiscal[]) => {
    const nfsTexto = notas.map((nota) => nota.numeroNF).join("\n");
    copiarDadosParaSAP(nfsTexto, `${notas.length} NFs`);
  };

  const copiarVolumes = (notas: NotaFiscal[]) => {
    const volumesTexto = notas
      .map((nota) => nota.divergencia?.volumesInformados || nota.volumes)
      .join("\n");
    copiarDadosParaSAP(volumesTexto, `${notas.length} volumes`);
  };

  const copiarDivergencias = (notas: NotaFiscal[]) => {
    const divergencias = notas.filter((nota) => nota.status === "divergencia");
    const divergenciasTexto = divergencias
      .map(
        (nota) =>
          `${nota.numeroNF}|${nota.divergencia?.tipo}|${nota.divergencia?.descricao}|${nota.divergencia?.volumesInformados}`
      )
      .join("\n");
    copiarDadosParaSAP(
      divergenciasTexto,
      `${divergencias.length} divergências`
    );
  };

  const copiarRelatorioCompleto = (relatorio: Relatorio) => {
    const cabecalho = `RELATÓRIO: ${relatorio.nome}
COLABORADOR: ${relatorio.colaboradores}
DATA: ${relatorio.data} - TURNO: ${relatorio.turno}
TOTAL NOTAS: ${relatorio.quantidadeNotas}
TOTAL VOLUMES: ${relatorio.somaVolumes}
FINALIZADO EM: ${new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}

DETALHAMENTO:
NF|VOLUMES|DESTINO|FORNECEDOR|STATUS|DIVERGÊNCIA
`;

    const detalhes = relatorio.notas
      .map((nota) => {
        const volumes = nota.divergencia?.volumesInformados || nota.volumes;
        const status = nota.status === "ok" ? "OK" : "DIVERGÊNCIA";
        const divergencia = nota.divergencia
          ? `${nota.divergencia.tipo} - ${nota.divergencia.descricao}`
          : "";

        return `${nota.numeroNF}|${volumes}|${nota.destino}|${nota.fornecedor}|${status}|${divergencia}`;
      })
      .join("\n");

    const relatorioCompleto = cabecalho + detalhes;
    copiarDadosParaSAP(relatorioCompleto, "Relatório completo");
  };

  // Função para filtrar e ordenar notas
  const filtrarEOrdenarNotas = (notas: NotaFiscal[]) => {
    let notasProcessadas = [...notas];

    // Aplicar filtro de texto
    if (filtroTexto) {
      notasProcessadas = notasProcessadas.filter(
        (nota) =>
          nota.numeroNF.toLowerCase().includes(filtroTexto.toLowerCase()) ||
          nota.fornecedor.toLowerCase().includes(filtroTexto.toLowerCase()) ||
          nota.destino.toLowerCase().includes(filtroTexto.toLowerCase()) ||
          nota.clienteDestino.toLowerCase().includes(filtroTexto.toLowerCase())
      );
    }

    // Aplicar filtro de status
    if (filtroStatus !== "todos") {
      notasProcessadas = notasProcessadas.filter(
        (nota) => nota.status === filtroStatus
      );
    }

    // Aplicar ordenação
    switch (ordenacao) {
      case "nf_asc":
        notasProcessadas.sort((a, b) => a.numeroNF.localeCompare(b.numeroNF));
        break;
      case "nf_desc":
        notasProcessadas.sort((a, b) => b.numeroNF.localeCompare(a.numeroNF));
        break;
      case "volumes_asc":
        notasProcessadas.sort(
          (a, b) =>
            (a.divergencia?.volumesInformados || a.volumes) -
            (b.divergencia?.volumesInformados || b.volumes)
        );
        break;
      case "volumes_desc":
        notasProcessadas.sort(
          (a, b) =>
            (b.divergencia?.volumesInformados || b.volumes) -
            (a.divergencia?.volumesInformados || a.volumes)
        );
        break;
      case "fornecedor_asc":
        notasProcessadas.sort((a, b) =>
          a.fornecedor.localeCompare(b.fornecedor)
        );
        break;
      case "fornecedor_desc":
        notasProcessadas.sort((a, b) =>
          b.fornecedor.localeCompare(a.fornecedor)
        );
        break;
      case "destino_asc":
        notasProcessadas.sort((a, b) => a.destino.localeCompare(b.destino));
        break;
      case "destino_desc":
        notasProcessadas.sort((a, b) => b.destino.localeCompare(a.destino));
        break;
      case "status_asc":
        notasProcessadas.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "status_desc":
        notasProcessadas.sort((a, b) => b.status.localeCompare(a.status));
        break;
      default:
        // Manter ordem original
        break;
    }

    return notasProcessadas;
  };

  // Atualizar useEffect para aplicar filtros
  useEffect(() => {
    if (relatorioSelecionado) {
      const notas = filtrarEOrdenarNotas(relatorioSelecionado.notas);
      setNotasFiltradas(notas);
    }
  }, [relatorioSelecionado, filtroTexto, filtroStatus, ordenacao]);

  // Obter lista de colaboradores únicos para filtro
  const colaboradoresUnicos = [
    ...new Set(relatorios.map((rel) => rel.colaboradores)),
  ];

  // Filtrar relatórios por colaborador
  const relatoriosFiltrados =
    filtroColaborador === "todos"
      ? relatorios
      : relatorios.filter((rel) => rel.colaboradores === filtroColaborador);

  const alterarStatusRelatorio = (relatorioId: string, novoStatus: string) => {
    const relatoriosAtualizados = relatorios.map((rel) =>
      rel.id === relatorioId ? { ...rel, status: novoStatus } : rel
    );

    setRelatorios(relatoriosAtualizados);
    localStorage.setItem(
      "relatorios_custos",
      JSON.stringify(relatoriosAtualizados)
    );
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Calculator className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">
                  💰 Custos
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block">
                  Relatórios e Análise de Custos
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 sm:flex-none">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  <span className="font-medium truncate text-xs sm:text-sm">
                    {sessionData.usuarioCustos || sessionData.colaborador || (sessionData.colaboradores && sessionData.colaboradores[0]) || "Usuário"}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{sessionData.data}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent hover:bg-orange-50 border-orange-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <Card className="border-orange-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {relatorios.length}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Relatórios
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                {relatorios.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Notas
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {relatorios.reduce((sum, rel) => sum + rel.somaVolumes, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Volumes
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                {relatorios.reduce(
                  (sum, rel) =>
                    sum +
                    rel.notas.filter((n) => n.status === "divergencia").length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Divergências
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Relatórios Finalizados
          </h2>

          {/* Filtro de colaborador */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                Filtrar por colaborador:
              </span>
            </div>
            <Select
              value={filtroColaborador}
              onValueChange={setFiltroColaborador}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Colaboradores</SelectItem>
                {colaboradoresUnicos.map((colaborador) => (
                  <SelectItem key={colaborador} value={colaborador}>
                    {colaborador}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {relatorios.length === 0 ? (
            <Card className="border-orange-200">
              <CardContent className="text-center py-12 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum relatório disponível
                </h3>
                <p>
                  Os relatórios finalizados aparecerão aqui automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {relatoriosFiltrados.map((relatorio) => (
                <Card
                  key={relatorio.id}
                  className="border-orange-200 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-gray-900">
                          {relatorio.nome}
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${
                          relatorio.status === "lancado"
                            ? "bg-green-100 text-green-800"
                            : relatorio.status === "em_lancamento"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {relatorio.status === "lancado"
                          ? "Lançado"
                          : relatorio.status === "em_lancamento"
                          ? "Em Lançamento"
                          : "Finalizado"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Colaborador</div>
                        <div className="font-medium">
                          {relatorio.colaboradores}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Data/Turno</div>
                        <div className="font-medium">
                          {relatorio.data} - {relatorio.turno}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {relatorio.quantidadeNotas}
                        </div>
                        <div className="text-xs text-gray-500">Notas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {relatorio.somaVolumes}
                        </div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {
                            relatorio.notas.filter(
                              (n) => n.status === "divergencia"
                            ).length
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          Divergências
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Finalizado em:{" "}
                      {new Date(relatorio.dataFinalizacao).toLocaleString(
                        "pt-BR"
                      )}
                    </div>

                    <div className="flex justify-center items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 bg-transparent"
                            size="sm"
                            onClick={() => {
                              setRelatorioSelecionado(relatorio);
                              setNotasFiltradas(relatorio.notas);
                              setFiltroTexto("");
                              setFiltroStatus("todos");
                              setOrdenacao("data_desc");
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-orange-600" />
                              <span>{relatorio.nome}</span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Resumo do Relatório */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg">
                              <div>
                                <div className="text-sm text-gray-600">
                                  Transportadora
                                </div>
                                <div className="font-medium">
                                  {relatorio.nome}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Colaborador
                                </div>
                                <div className="font-medium">
                                  {relatorio.colaboradores}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Data/Turno
                                </div>
                                <div className="font-medium">
                                  {relatorio.data} - {relatorio.turno}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Finalizado em
                                </div>
                                <div className="font-medium text-xs">
                                  {new Date(
                                    relatorio.dataFinalizacao
                                  ).toLocaleString("pt-BR")}
                                </div>
                              </div>
                            </div>

                            {/* Botões de Cópia */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() => copiarNFs(notasFiltradas)}
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar NFs ({notasFiltradas.length})
                              </Button>
                              <Button
                                onClick={() => copiarVolumes(notasFiltradas)}
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Volumes (
                                {notasFiltradas.reduce(
                                  (sum, nota) =>
                                    sum +
                                    (nota.divergencia?.volumesInformados ||
                                      nota.volumes),
                                  0
                                )}
                                )
                              </Button>
                              {notasFiltradas.some(
                                (n) => n.status === "divergencia"
                              ) && (
                                <Button
                                  onClick={() =>
                                    copiarDivergencias(notasFiltradas)
                                  }
                                  variant="outline"
                                  className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                  size="sm"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Divergências (
                                  {
                                    notasFiltradas.filter(
                                      (n) => n.status === "divergencia"
                                    ).length
                                  }
                                  )
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  copiarRelatorioCompleto(relatorio)
                                }
                                variant="outline"
                                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Relatório Completo
                              </Button>
                            </div>

                            {/* Filtros e Ordenação */}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-700">
                                  Filtros e Ordenação
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm">Buscar</Label>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="NF, fornecedor, destino..."
                                      value={filtroTexto}
                                      onChange={(e) =>
                                        setFiltroTexto(e.target.value)
                                      }
                                      className="pl-10"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm">Status</Label>
                                  <Select
                                    value={filtroStatus}
                                    onValueChange={setFiltroStatus}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todos">
                                        Todos os Status
                                      </SelectItem>
                                      <SelectItem value="ok">
                                        ✅ Apenas OK
                                      </SelectItem>
                                      <SelectItem value="divergencia">
                                        ⚠️ Apenas Divergências
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-sm">Ordenar por</Label>
                                  <Select
                                    value={ordenacao}
                                    onValueChange={setOrdenacao}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="data_desc">
                                        Ordem Original
                                      </SelectItem>
                                      <SelectItem value="nf_asc">
                                        NF (A-Z)
                                      </SelectItem>
                                      <SelectItem value="nf_desc">
                                        NF (Z-A)
                                      </SelectItem>
                                      <SelectItem value="volumes_asc">
                                        Volumes (Menor-Maior)
                                      </SelectItem>
                                      <SelectItem value="volumes_desc">
                                        Volumes (Maior-Menor)
                                      </SelectItem>
                                      <SelectItem value="fornecedor_asc">
                                        Fornecedor (A-Z)
                                      </SelectItem>
                                      <SelectItem value="fornecedor_desc">
                                        Fornecedor (Z-A)
                                      </SelectItem>
                                      <SelectItem value="destino_asc">
                                        Destino (A-Z)
                                      </SelectItem>
                                      <SelectItem value="destino_desc">
                                        Destino (Z-A)
                                      </SelectItem>
                                      <SelectItem value="status_asc">
                                        Status (OK primeiro)
                                      </SelectItem>
                                      <SelectItem value="status_desc">
                                        Status (Divergência primeiro)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                Mostrando {notasFiltradas.length} de{" "}
                                {relatorio.notas.length} notas
                              </div>
                            </div>

                            {/* Tabela de Notas com dados filtrados */}
                            <ScrollArea className="max-h-96 overflow-y-auto overflow-x-hidden ">
                              <div className="min-w-max">
                                {/* Cabeçalho fixo */}
                                <div className="grid grid-cols-7 gap-4 bg-gray-100 px-4 py-2 sticky top-0 z-10 text-sm font-semibold text-gray-700 border-b border-gray-300">
                                  <div>NF</div>
                                  <div>Volumes</div>
                                  <div>Destino</div>
                                  <div>Fornecedor</div>
                                  <div>Cliente</div>
                                  <div>Status</div>
                                  <div>Divergência</div>
                                </div>
                                {notasFiltradas.map((nota, index) => (
                                  <div
                                    key={nota.id}
                                    className={`px-4 py-2 grid grid-cols-8 gap-4 text-sm ${
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50"
                                    }`}
                                  >
                                    <div className="font-medium">
                                      {nota.numeroNF}
                                    </div>
                                    <div className="text-center">
                                      {nota.divergencia?.volumesInformados ||
                                        nota.volumes}
                                      {nota.divergencia?.volumesInformados !==
                                        nota.volumes && (
                                        <span className="text-orange-600 text-xs ml-1">
                                          (era {nota.volumes})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs">
                                      {nota.destino}
                                    </div>
                                    <div
                                      className="text-xs truncate"
                                      title={nota.fornecedor}
                                    >
                                      {nota.fornecedor}
                                    </div>
                                    <div
                                      className="text-xs truncate"
                                      title={nota.clienteDestino}
                                    >
                                      {nota.clienteDestino}
                                    </div>
                                    <div className="text-xs">
                                      {nota.tipoCarga}
                                    </div>
                                    <div className="flex items-center">
                                      {nota.status === "ok" ? (
                                        <div className="flex items-center text-green-600">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">OK</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-orange-600">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Div.</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs">
                                      {nota.divergencia && (
                                        <span
                                          className="text-orange-600"
                                          title={`${nota.divergencia.tipo} - ${nota.divergencia.descricao}`}
                                        >
                                          {nota.divergencia.tipo} -{" "}
                                          {nota.divergencia.descricao}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="bg-orange-50 px-4 py-2 grid grid-cols-8 gap-4 text-sm font-bold text-orange-800">
                                  <div className="col-span-1">Total:</div>
                                  <div className="text-center">
                                    {notasFiltradas.reduce(
                                      (sum, nota) =>
                                        sum +
                                        (nota.divergencia?.volumesInformados ||
                                          nota.volumes),
                                      0
                                    )} volumes
                                  </div>
                                  <div className="col-span-2 text-center text-xs">
                                    ({notasFiltradas.length} notas)
                                  </div>
                                  <div className="col-span-4"></div>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Adicionar botões de status */}
                      <Button
                        onClick={() =>
                          alterarStatusRelatorio(relatorio.id, "em_lancamento")
                        }
                        disabled={
                          relatorio.status === "em_lancamento" ||
                          relatorio.status === "lancado"
                        }
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        Em Lançamento
                      </Button>

                      <Button
                        onClick={() =>
                          alterarStatusRelatorio(relatorio.id, "lancado")
                        }
                        disabled={relatorio.status === "lancado"}
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                        size="sm"
                      >
                        Lançado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
