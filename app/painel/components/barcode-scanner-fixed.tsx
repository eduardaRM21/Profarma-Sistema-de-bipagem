"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerFixedProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScannerFixed({ onScan, onError }: BarcodeScannerFixedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')

  useEffect(() => {
    checkCameraPermission()
    return () => {
      stopCamera()
    }
  }, [])

  const checkCameraPermission = async () => {
    try {
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Seu navegador não suporta acesso à câmera")
        onError("Navegador não suporta câmera")
        return
      }

      // Verificar permissões
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setPermissionStatus(permission.state)
        
        if (permission.state === 'denied') {
          setError("Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.")
          onError("Permissão de câmera negada")
          return
        }
      }

      startCamera()
    } catch (err) {
      console.error("Erro ao verificar permissões:", err)
      setError("Erro ao verificar permissões da câmera")
      onError("Erro ao verificar permissões")
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setIsInitializing(true)

      console.log("Solicitando acesso à câmera...")

      // Configuração mais compatível da câmera
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      }

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
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("Erro ao acessar câmera:", err)
      
      if (errorMessage.includes('Permission')) {
        setError("Permissão de câmera negada. Clique em 'Tentar Novamente' para solicitar permissão.")
      } else if (errorMessage.includes('NotFound')) {
        setError("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.")
      } else if (errorMessage.includes('NotAllowed')) {
        setError("Acesso à câmera negado. Verifique as permissões do navegador.")
      } else {
        setError(`Erro ao acessar a câmera: ${errorMessage}`)
      }
      
      onError(errorMessage)
      setIsScanning(false)
      setIsInitializing(false)
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
    setTimeout(() => {
      checkCameraPermission()
    }, 500)
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
              
              {permissionStatus === 'denied' && (
                <Button onClick={openCameraSettings} variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Dicas para resolver:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Clique em "Permitir" quando o navegador solicitar acesso à câmera</li>
                <li>Verifique se não há outros aplicativos usando a câmera</li>
                <li>Certifique-se de que a câmera está funcionando</li>
                <li>Tente em um navegador diferente (Chrome recomendado)</li>
                <li>Verifique as configurações de privacidade do navegador</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isInitializing && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Inicializando câmera...
                </AlertDescription>
              </Alert>
            )}

            {isScanning && !isInitializing && (
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
                <li>Se não funcionar, tente reiniciar a câmera</li>
              </ul>
            </div>

            {/* Botão para reiniciar câmera */}
            <div className="flex justify-center">
              <Button 
                onClick={retryCamera} 
                variant="outline" 
                size="sm"
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reiniciar Câmera
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 