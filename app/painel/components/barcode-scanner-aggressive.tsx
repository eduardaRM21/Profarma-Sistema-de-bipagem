"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings, Monitor, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerAggressiveProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScannerAggressive({ onScan, onError }: BarcodeScannerAggressiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment')
  const [retryCount, setRetryCount] = useState(0)
  const [isStreamActive, setIsStreamActive] = useState(false)
  const streamCheckInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startCameraAggressively()
    return () => {
      stopCamera()
    }
  }, [cameraMode])

  // Monitorar se o stream ainda está ativo
  useEffect(() => {
    if (stream && isStreamActive) {
      streamCheckInterval.current = setInterval(() => {
        if (stream && stream.getTracks().some(track => track.readyState === 'ended')) {
          console.log("Stream foi interrompido, tentando recuperar...")
          setIsStreamActive(false)
          setError("Câmera foi interrompida por outro aplicativo. Tentando recuperar...")
          setTimeout(() => {
            startCameraAggressively()
          }, 1000)
        }
      }, 2000)

      return () => {
        if (streamCheckInterval.current) {
          clearInterval(streamCheckInterval.current)
        }
      }
    }
  }, [stream, isStreamActive])

  const startCameraAggressively = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setIsInitializing(true)

      console.log(`Tentativa ${retryCount + 1}: Iniciando câmera agressivamente com modo ${cameraMode}...`)

      // Parar qualquer stream existente primeiro
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
          console.log("Track parada:", track.kind)
        })
        setStream(null)
      }

      // Aguardar um pouco para garantir que o stream anterior foi liberado
      await new Promise(resolve => setTimeout(resolve, 500))

      // Estratégia 1: Configuração agressiva com prioridade alta
      try {
        const constraints = {
          video: {
            facingMode: { ideal: cameraMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 },
            // Forçar acesso exclusivo
            deviceId: { ideal: await getPreferredCamera() }
          },
          audio: false
        }

        console.log("Tentando configuração agressiva...")
        await startCameraWithRetry(constraints, 3)
        return
      } catch (err) {
        console.log("Estratégia agressiva falhou, tentando estratégia 2...")
      }

      // Estratégia 2: Configuração simples mas persistente
      try {
        const constraints = {
          video: {
            facingMode: cameraMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        }

        console.log("Tentando configuração simples...")
        await startCameraWithRetry(constraints, 2)
        return
      } catch (err) {
        console.log("Estratégia simples falhou, tentando estratégia 3...")
      }

      // Estratégia 3: Configuração mínima com retry
      try {
        const constraints = {
          video: true,
          audio: false
        }

        console.log("Tentando configuração mínima...")
        await startCameraWithRetry(constraints, 1)
        return
      } catch (err) {
        console.log("Estratégia mínima falhou, tentando trocar câmera...")
      }

      // Estratégia 4: Trocar câmera
      if (cameraMode === 'environment') {
        setCameraMode('user')
        setRetryCount(prev => prev + 1)
        return
      }

      if (cameraMode === 'user') {
        setCameraMode('environment')
        setRetryCount(prev => prev + 1)
        return
      }

      // Se todas as estratégias falharam
      throw new Error("Não foi possível acessar nenhuma câmera após múltiplas tentativas")

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("Erro ao acessar câmera:", err)
      
      if (errorMessage.includes('NotReadableError')) {
        setError("A câmera está sendo usada por outro aplicativo. Feche Zoom, Teams, WhatsApp Web e outros apps que usam câmera, depois tente novamente.")
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

  const getPreferredCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      // Priorizar câmera traseira se disponível
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('traseira') ||
        device.label.toLowerCase().includes('environment')
      )
      
      return backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId
    } catch (err) {
      console.log("Erro ao enumerar dispositivos:", err)
      return undefined
    }
  }

  const startCameraWithRetry = async (constraints: MediaStreamConstraints, maxRetries: number) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de iniciar câmera...`)
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        // Verificar se o stream tem tracks ativas
        if (mediaStream.getTracks().length === 0) {
          throw new Error("Stream criado mas sem tracks ativas")
        }

        setStream(mediaStream)
        setIsStreamActive(true)

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
            return // Sucesso, sair do loop
          } catch (err) {
            console.error("Erro ao iniciar vídeo:", err)
            throw err
          }
        }
      } catch (err) {
        console.log(`Tentativa ${attempt} falhou:`, err)
        
        if (attempt === maxRetries) {
          throw err
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  const stopCamera = () => {
    if (streamCheckInterval.current) {
      clearInterval(streamCheckInterval.current)
      streamCheckInterval.current = null
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
        console.log("Track parada:", track.kind)
      })
      setStream(null)
    }
    setIsScanning(false)
    setIsInitializing(false)
    setIsStreamActive(false)
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
      startCameraAggressively()
    }, 1000)
  }

  const switchCamera = () => {
    stopCamera()
    setCameraMode(cameraMode === 'environment' ? 'user' : 'environment')
  }

  const forceCameraAccess = async () => {
    try {
      // Tentar acessar a câmera de forma mais agressiva
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: cameraMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false 
      })
      
      // Se conseguiu acessar, parar e tentar novamente
      stream.getTracks().forEach(track => track.stop())
      
      setTimeout(() => {
        retryCamera()
      }, 500)
    } catch (err) {
      setError("Não foi possível forçar o acesso à câmera. Verifique se outros aplicativos estão usando a câmera.")
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
              
              <Button onClick={forceCameraAccess} variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Forçar Acesso
              </Button>
              
              <Button onClick={switchCamera} variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Trocar Câmera
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Dicas para resolver câmera escura:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Feche TODOS os aplicativos</strong> que usam câmera (Zoom, Teams, WhatsApp Web)</li>
                <li><strong>Verifique o Gerenciador de Tarefas</strong> e encerre processos suspeitos</li>
                <li><strong>Use o botão "Forçar Acesso"</strong> para tentar recuperar a câmera</li>
                <li><strong>Reinicie o navegador</strong> completamente</li>
                <li><strong>Tente em modo incógnito</strong> para evitar extensões</li>
                <li><strong>Verifique se não há outras abas</strong> usando a câmera</li>
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

              {/* Indicador de stream ativo */}
              {isStreamActive && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Ativo</span>
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
                onClick={forceCameraAccess} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Forçar Acesso
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