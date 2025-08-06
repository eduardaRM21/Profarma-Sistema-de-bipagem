"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const codeReaderRef = useRef<any>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const addDiagnostic = (message: string) => {
    setDiagnostics(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startCamera = async () => {
    try {
      setError(null)
      setIsLoading(true)
      setIsScanning(false)
      setDiagnostics([])
      addDiagnostic("Iniciando câmera...")

      // Verificar se a API de mídia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de mídia não suportada pelo navegador")
      }

      addDiagnostic("API de mídia disponível")

      // Tentar diferentes configurações de câmera
      const constraints = {
        video: {
          facingMode: "environment", // Câmera traseira (melhor para códigos de barras)
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16/9 },
        },
      }

      addDiagnostic("Solicitando acesso à câmera...")
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      addDiagnostic("Acesso à câmera concedido")
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        addDiagnostic("Configurando elemento de vídeo...")
        await videoRef.current.play()

        // Aguardar o vídeo carregar antes de iniciar o scan
        videoRef.current.onloadedmetadata = () => {
          addDiagnostic("Vídeo carregado, iniciando scanner...")
          setIsLoading(false)
          setIsScanning(true)
          startScanning()
        }

        videoRef.current.onerror = () => {
          const errorMsg = "Erro ao carregar o vídeo da câmera"
          addDiagnostic(errorMsg)
          setError(errorMsg)
          onError(errorMsg)
          setIsLoading(false)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      addDiagnostic(`Erro: ${errorMessage}`)
      
      // Tentar configuração alternativa se a primeira falhar
      if (errorMessage.includes("Permission") || errorMessage.includes("NotAllowedError")) {
        setError("Permissão de câmera negada. Verifique as configurações do navegador.")
        onError("Permissão de câmera negada")
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("DevicesNotFoundError")) {
        setError("Câmera não encontrada. Verifique se há uma câmera conectada.")
        onError("Câmera não encontrada")
      } else {
        setError(`Erro ao acessar a câmera: ${errorMessage}`)
        onError(errorMessage)
      }
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      addDiagnostic("Câmera parada")
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset()
        addDiagnostic("Leitor de códigos resetado")
      } catch (err) {
        // Ignorar erros de reset
      }
      codeReaderRef.current = null
    }

    setIsScanning(false)
    setIsLoading(false)
  }

  const restartCamera = () => {
    addDiagnostic("Reiniciando câmera...")
    stopCamera()
    setTimeout(() => {
      startCamera()
    }, 500)
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return

    addDiagnostic("Carregando biblioteca ZXing...")

    // Importar dinamicamente a biblioteca de leitura de códigos de barras
    import("@zxing/library")
      .then((ZXing) => {
        try {
          addDiagnostic("Biblioteca ZXing carregada")
          const codeReader = new ZXing.BrowserMultiFormatReader()
          codeReaderRef.current = codeReader
          addDiagnostic("Leitor de códigos inicializado")

          // Configurar o intervalo de scanning
          scanIntervalRef.current = setInterval(() => {
            if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
              const canvas = canvasRef.current
              const video = videoRef.current
              const context = canvas.getContext("2d")

              if (context && video.videoWidth > 0 && video.videoHeight > 0) {
                // Definir o tamanho do canvas
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                // Desenhar o frame atual do vídeo no canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                try {
                  // Tentar ler o código de barras do canvas
                  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
                  const code = codeReader.decodeFromImageData(imageData)

                  if (code && code.getText()) {
                    const scannedText = code.getText()
                    addDiagnostic(`Código lido: ${scannedText}`)

                    // Evitar scans duplicados consecutivos
                    if (scannedText !== lastScan) {
                      setLastScan(scannedText)
                      onScan(scannedText)

                      // Parar o scanning após um scan bem-sucedido
                      if (scanIntervalRef.current) {
                        clearInterval(scanIntervalRef.current)
                        scanIntervalRef.current = null
                      }
                    }
                  }
                } catch (err) {
                  // Ignorar erros de leitura (normal quando não há código visível)
                  // console.log("Tentando ler código...")
                }
              }
            }
          }, 200) // Tentar ler a cada 200ms (reduzido para melhor performance)
        } catch (err) {
          const errorMsg = "Erro ao inicializar o leitor de códigos de barras"
          addDiagnostic(errorMsg)
          setError(errorMsg)
          onError(errorMsg)
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar biblioteca ZXing:", err)
        addDiagnostic("Erro ao carregar biblioteca ZXing")
        setError("Erro ao carregar a biblioteca de códigos de barras. Tente recarregar a página.")
        onError("Erro ao carregar a biblioteca de códigos de barras")
      })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        {error ? (
          <div className="space-y-4">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={restartCamera} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Inicializando câmera...
                </AlertDescription>
              </Alert>
            )}

            {isScanning && !isLoading && (
              <Alert className="bg-blue-50 border-blue-200">
                <Camera className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Posicione o código de barras dentro da área de visualização da câmera
                </AlertDescription>
              </Alert>
            )}

            {lastScan && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Código lido: <span className="font-mono text-sm">{lastScan}</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full h-64 bg-black rounded-lg object-cover" 
                playsInline 
                muted 
                autoPlay
              />

              {/* Overlay com guias visuais */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-green-500 border-dashed rounded-lg w-80 h-20 flex items-center justify-center bg-green-500 bg-opacity-10">
                  <span className="text-green-700 text-sm font-medium bg-white bg-opacity-90 px-2 py-1 rounded">
                    Posicione o código aqui
                  </span>
                </div>
              </div>

              {/* Indicador de scanning */}
              {isScanning && !isLoading && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Escaneando...</span>
                </div>
              )}

              {/* Indicador de carregamento */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <div className="text-white text-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <div className="text-sm">Carregando câmera...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas oculto para processamento */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Diagnósticos */}
            {diagnostics.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center space-x-1">
                  <Info className="h-3 w-3" />
                  <span className="font-medium">Diagnósticos:</span>
                </div>
                <div className="max-h-20 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                  {diagnostics.map((msg, index) => (
                    <div key={index} className="text-gray-500">{msg}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Dicas para melhor leitura:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mantenha o código de barras dentro da área destacada</li>
                <li>Certifique-se de que há boa iluminação</li>
                <li>Mantenha o dispositivo estável</li>
                <li>O código deve estar nítido e bem focado</li>
                <li>Se não funcionar, tente recarregar a página</li>
              </ul>
            </div>

            {isScanning && !isLoading && (
              <Button onClick={restartCamera} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reiniciar Scanner
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
