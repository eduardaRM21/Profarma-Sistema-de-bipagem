"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerRobustProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScannerRobust({ onScan, onError }: BarcodeScannerRobustProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    startCameraWithFallback()
    return () => {
      stopCamera()
    }
  }, [cameraMode])

  const startCameraWithFallback = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setIsInitializing(true)

      console.log(`Tentativa ${retryCount + 1}: Iniciando câmera com modo ${cameraMode}...`)

      // Estratégia 1: Tentar com configuração ideal
      try {
        await startCamera({
          video: {
            facingMode: { ideal: cameraMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        })
        return
      } catch (err) {
        console.log("Estratégia 1 falhou, tentando estratégia 2...")
      }

      // Estratégia 2: Configuração mais simples
      try {
        await startCamera({
          video: {
            facingMode: cameraMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        })
        return
      } catch (err) {
        console.log("Estratégia 2 falhou, tentando estratégia 3...")
      }

      // Estratégia 3: Configuração mínima
      try {
        await startCamera({
          video: true,
          audio: false
        })
        return
      } catch (err) {
        console.log("Estratégia 3 falhou, tentando estratégia 4...")
      }

      // Estratégia 4: Tentar câmera frontal se estava usando traseira
      if (cameraMode === 'environment') {
        setCameraMode('user')
        setRetryCount(prev => prev + 1)
        return
      }

      // Estratégia 5: Tentar câmera traseira se estava usando frontal
      if (cameraMode === 'user') {
        setCameraMode('environment')
        setRetryCount(prev => prev + 1)
        return
      }

      // Se todas as estratégias falharam
      throw new Error("Não foi possível acessar nenhuma câmera")

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("Erro ao acessar câmera:", err)
      
      if (errorMessage.includes('NotReadableError')) {
        setError("A câmera está sendo usada por outro aplicativo. Feche outros apps que possam estar usando a câmera e tente novamente.")
      } else if (errorMessage.includes('NotAllowedError')) {
        setError("Acesso à câmera negado. Verifique as permissões do navegador.")
      } else if (errorMessage.includes('NotFoundError')) {
        setError("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.")
      } else if (errorMessage.includes('NotSupportedError')) {
        setError("Seu navegador não suporta acesso à câmera.")
      } else {
        setError(`Erro ao acessar a câmera: ${errorMessage}`)
      }
      
      onError(errorMessage)
      setIsScanning(false)
      setIsInitializing(false)
    }
  }

  const startCamera = async (constraints: MediaStreamConstraints) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    setStream(mediaStream)

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream
      
      videoRef.current.onloadedmetadata = () => {
        console.log("Vídeo carregado, iniciando scanner...")
        setIsInitializing(false)
        startScanning()
      }

      videoRef.current.onerror = (err) => {
        console.error("Erro no vídeo:", err)
        setError("Erro ao carregar o vídeo da câmera")
      }

      try {
        await videoRef.current.play()
        console.log("Vídeo iniciado com sucesso")
      } catch (err) {
        console.error("Erro ao iniciar vídeo:", err)
        setError("Erro ao iniciar o vídeo da câmera")
        throw err
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
        console.log("Track parada:", track.kind)
      })
      setStream(null)
    }
    setIsScanning(false)
    setIsInitializing(false)
  }

  const startScanning = async () => {
    if (!videoRef.current) {
      console.error("Elemento de vídeo não encontrado")
      return
    }

    try {
      console.log("Carregando biblioteca ZXing...")
      
      const ZXing = await import("@zxing/library")
      
      console.log("Criando leitor de códigos...")
      
      const reader = new ZXing.BrowserMultiFormatReader()
      
      // Configurar formatos suportados
      const hints = new Map()
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.DATA_MATRIX,
        ZXing.BarcodeFormat.PDF_417,
        ZXing.BarcodeFormat.AZTEC,
        ZXing.BarcodeFormat.ITF,
        ZXing.BarcodeFormat.CODABAR
      ])
      
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true)
      hints.set(ZXing.DecodeHintType.CHARACTER_SET, "UTF-8")
      
      reader.hints = hints

      console.log("Iniciando processo de scanning...")

      const scanCode = async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) {
          return
        }

        try {
          const result = await reader.decodeFromVideoElement(videoRef.current)
          
          if (result && result.getText()) {
            const scannedText = result.getText().trim()
            
            console.log("Código detectado:", scannedText)
            
            if (scannedText && scannedText !== lastScan) {
              console.log("Enviando código para processamento:", scannedText)
              setLastScan(scannedText)
              onScan(scannedText)
            }
          }
        } catch (err) {
          // Ignorar erros de leitura (normal quando não há código)
          console.log("Nenhum código detectado")
        }
      }

      // Iniciar scanning contínuo
      const scanInterval = setInterval(async () => {
        await scanCode()
      }, config.scanner.interval)

      // Parar após timeout
      setTimeout(() => {
        clearInterval(scanInterval)
        if (isScanning) {
          startScanning() // Reiniciar
        }
      }, config.scanner.timeout)

    } catch (err) {
      console.error("Erro ao carregar biblioteca ZXing:", err)
      setError("Erro ao carregar a biblioteca de códigos de barras")
      onError("Erro ao carregar biblioteca")
    }
  }

  const retryCamera = () => {
    stopCamera()
    setRetryCount(0)
    setTimeout(() => {
      startCameraWithFallback()
    }, 1000)
  }

  const switchCamera = () => {
    stopCamera()
    setCameraMode(cameraMode === 'environment' ? 'user' : 'environment')
  }

  const openCameraSettings = () => {
    // Tentar abrir configurações do navegador
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          retryCamera()
        })
        .catch(() => {
          setError("Por favor, permita o acesso à câmera nas configurações do navegador e tente novamente.")
        })
    }
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
            
            <div className="flex gap-2">
              <Button onClick={retryCamera} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              
              <Button onClick={switchCamera} variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Trocar Câmera
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Dicas para resolver o erro "Could not start video source":</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Feche outros aplicativos</strong> que possam estar usando a câmera (Zoom, Teams, etc.)</li>
                <li><strong>Reinicie o navegador</strong> completamente</li>
                <li><strong>Verifique se não há outras abas</strong> usando a câmera</li>
                <li><strong>Tente em modo incógnito</strong> para evitar extensões interferindo</li>
                <li><strong>Use o botão "Trocar Câmera"</strong> para tentar câmera frontal/traseira</li>
                <li><strong>Verifique as configurações de privacidade</strong> do navegador</li>
                <li><strong>Tente em um navegador diferente</strong> (Chrome recomendado)</li>
                <li><strong>Reinicie o computador</strong> se o problema persistir</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isInitializing && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Inicializando câmera... (Tentativa {retryCount + 1})
                </AlertDescription>
              </Alert>
            )}

            {isScanning && !isInitializing && (
              <Alert className="bg-blue-50 border-blue-200">
                <Camera className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Posicione o código de barras dentro da área de visualização da câmera
                  {cameraMode === 'environment' ? ' (Câmera Traseira)' : ' (Câmera Frontal)'}
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
              {isScanning && !isInitializing && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Escaneando...</span>
                </div>
              )}

              {/* Indicador de inicialização */}
              {isInitializing && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Inicializando...</span>
                </div>
              )}

              {/* Indicador de câmera */}
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                <Monitor className="w-3 h-3" />
                <span>{cameraMode === 'environment' ? 'Traseira' : 'Frontal'}</span>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Dicas para melhor leitura:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mantenha o código de barras dentro da área destacada</li>
                <li>Certifique-se de que há boa iluminação</li>
                <li>Mantenha o dispositivo estável</li>
                <li>O código deve estar nítido e bem focado</li>
                <li>Evite reflexos e sombras sobre o código</li>
                <li>Para códigos pequenos, aproxime a câmera</li>
                <li>Se não funcionar, tente trocar de câmera</li>
              </ul>
            </div>

            {/* Botões de controle */}
            <div className="flex justify-center gap-2">
              <Button 
                onClick={retryCamera} 
                variant="outline" 
                size="sm"
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
              
              <Button 
                onClick={switchCamera} 
                variant="outline" 
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Trocar Câmera
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 