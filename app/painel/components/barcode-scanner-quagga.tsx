"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings, Monitor, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerQuaggaProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    Quagga: any
  }
}

export default function BarcodeScannerQuagga({ onScan, onError }: BarcodeScannerQuaggaProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isQuaggaLoaded, setIsQuaggaLoaded] = useState(false)

  useEffect(() => {
    loadQuaggaAndStart()
    return () => {
      stopQuagga()
    }
  }, [])

  const loadQuaggaAndStart = async () => {
    try {
      setIsInitializing(true)
      setError(null)

      // Carregar QuaggaJS dinamicamente
      if (!window.Quagga) {
        console.log("Carregando QuaggaJS...")
        await loadQuaggaScript()
      }

      if (window.Quagga) {
        setIsQuaggaLoaded(true)
        startQuaggaScanner()
      } else {
        throw new Error("Não foi possível carregar QuaggaJS")
      }
    } catch (err) {
      console.error("Erro ao carregar QuaggaJS:", err)
      setError("Erro ao carregar o scanner de códigos de barras")
      onError("Erro ao carregar scanner")
      setIsInitializing(false)
    }
  }

  const loadQuaggaScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Quagga) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js'
      script.onload = () => {
        console.log("QuaggaJS carregado com sucesso")
        resolve()
      }
      script.onerror = () => {
        console.error("Erro ao carregar QuaggaJS")
        reject(new Error("Falha ao carregar QuaggaJS"))
      }
      document.head.appendChild(script)
    })
  }

  const startQuaggaScanner = () => {
    if (!window.Quagga || !scannerRef.current) {
      console.error("QuaggaJS não está disponível ou elemento não encontrado")
      return
    }

    try {
      console.log("Iniciando QuaggaJS scanner...")

      window.Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment", // Usar câmera traseira
            aspectRatio: { min: 1, max: 2 }
          },
          area: { // Área de leitura (opcional)
            top: "25%",
            right: "10%",
            left: "10%",
            bottom: "25%"
          }
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ],
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true,
            showPattern: true
          }
        },
        locate: true,
        frequency: 10
      }, (err: any) => {
        if (err) {
          console.error("Erro ao inicializar QuaggaJS:", err)
          handleQuaggaError(err)
          return
        }

        console.log("QuaggaJS inicializado com sucesso")
        setIsInitializing(false)
        setIsScanning(true)

        // Configurar eventos
        window.Quagga.onDetected(handleCodeDetected)
        window.Quagga.onProcessed(handleProcessed)
        window.Quagga.onProcessed((result: any) => {
          if (result) {
            const drawingCanvas = window.Quagga.canvas.ctx.overlay
            const drawingCtx = drawingCanvas.getContext('2d')
            if (result.codeResult && result.codeResult.code) {
              console.log("Código detectado:", result.codeResult.code)
            }
          }
        })
      })

    } catch (err) {
      console.error("Erro ao iniciar QuaggaJS:", err)
      handleQuaggaError(err)
    }
  }

  const handleCodeDetected = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const code = result.codeResult.code.trim()
      
      if (code && code !== lastScan) {
        console.log("Código de barras detectado:", code)
        setLastScan(code)
        onScan(code)
        
        // Feedback visual
        setError(null)
        
        // Opcional: parar temporariamente para evitar múltiplas leituras
        setTimeout(() => {
          if (window.Quagga) {
            window.Quagga.start()
          }
        }, 1000)
      }
    }
  }

  const handleProcessed = (result: any) => {
    if (result) {
      const drawingCanvas = window.Quagga.canvas.ctx.overlay
      const drawingCtx = drawingCanvas.getContext('2d')
      
      if (result.codeResult && result.codeResult.code) {
        console.log("Processando código:", result.codeResult.code)
      }
    }
  }

  const handleQuaggaError = (err: any) => {
    console.error("Erro do QuaggaJS:", err)
    
    let errorMessage = "Erro desconhecido"
    
    if (err.name === 'NotAllowedError') {
      errorMessage = "Acesso à câmera negado. Verifique as permissões do navegador."
    } else if (err.name === 'NotFoundError') {
      errorMessage = "Nenhuma câmera encontrada. Verifique se há uma câmera conectada."
    } else if (err.name === 'NotReadableError') {
      errorMessage = "A câmera está sendo usada por outro aplicativo. Feche Zoom, Teams, WhatsApp Web e outros apps que usam câmera."
    } else if (err.name === 'NotSupportedError') {
      errorMessage = "Seu navegador não suporta acesso à câmera."
    } else if (err.message) {
      errorMessage = err.message
    }
    
    setError(errorMessage)
    onError(errorMessage)
    setIsInitializing(false)
    setIsScanning(false)
  }

  const stopQuagga = () => {
    if (window.Quagga) {
      try {
        window.Quagga.stop()
        console.log("QuaggaJS parado")
      } catch (err) {
        console.error("Erro ao parar QuaggaJS:", err)
      }
    }
    setIsScanning(false)
    setIsInitializing(false)
  }

  const retryScanner = () => {
    stopQuagga()
    setRetryCount(prev => prev + 1)
    setLastScan(null)
    setError(null)
    
    setTimeout(() => {
      loadQuaggaAndStart()
    }, 1000)
  }

  const switchCamera = () => {
    stopQuagga()
    setRetryCount(prev => prev + 1)
    
    setTimeout(() => {
      if (window.Quagga && scannerRef.current) {
        window.Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: "user", // Trocar para câmera frontal
              aspectRatio: { min: 1, max: 2 }
            }
          },
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader"
            ]
          },
          locate: true,
          frequency: 10
        }, (err: any) => {
          if (err) {
            handleQuaggaError(err)
          } else {
            setIsInitializing(false)
            setIsScanning(true)
            window.Quagga.onDetected(handleCodeDetected)
            window.Quagga.onProcessed(handleProcessed)
          }
        })
      }
    }, 500)
  }

  const forceCameraAccess = async () => {
    try {
      // Tentar acessar a câmera primeiro
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false 
      })
      
      // Se conseguiu acessar, parar e tentar novamente
      stream.getTracks().forEach(track => track.stop())
      
      setTimeout(() => {
        retryScanner()
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
              <Button onClick={retryScanner} className="flex-1">
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
              <p><strong>Dicas para resolver problemas de câmera:</strong></p>
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
                  Inicializando scanner QuaggaJS... (Tentativa {retryCount + 1})
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
              <div 
                ref={scannerRef} 
                className="w-full h-64 bg-black rounded-lg overflow-hidden"
                style={{ position: 'relative' }}
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

              {/* Indicador de QuaggaJS */}
              <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                <Monitor className="w-3 h-3" />
                <span>QuaggaJS</span>
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
                <li>QuaggaJS suporta múltiplos formatos de código de barras</li>
              </ul>
            </div>

            {/* Botões de controle */}
            <div className="flex justify-center gap-2">
              <Button 
                onClick={retryScanner} 
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