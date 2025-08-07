"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings, Monitor, Shield, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerPermissionProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    Quagga: any
  }
}

export default function BarcodeScannerPermission({ onScan, onError }: BarcodeScannerPermissionProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [showPermissionRequest, setShowPermissionRequest] = useState(false)

  useEffect(() => {
    checkCameraPermission()
  }, [])

  const checkCameraPermission = async () => {
    try {
      console.log("Verificando permissão da câmera...")
      
      // Verificar se o navegador suporta Permissions API
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setPermissionStatus(permission.state)
        console.log("Status da permissão:", permission.state)
        
        if (permission.state === 'granted') {
          startQuaggaScanner()
        } else if (permission.state === 'denied') {
          setShowPermissionRequest(true)
          setError("Permissão da câmera negada. Clique em 'Solicitar Permissão' para tentar novamente.")
        } else {
          // Estado 'prompt' - tentar acessar a câmera
          requestCameraAccess()
        }
      } else {
        // Fallback para navegadores que não suportam Permissions API
        requestCameraAccess()
      }
    } catch (err) {
      console.error("Erro ao verificar permissão:", err)
      requestCameraAccess()
    }
  }

  const requestCameraAccess = async () => {
    try {
      console.log("Solicitando acesso à câmera...")
      setIsInitializing(true)
      setError(null)

      // Tentar acessar a câmera para solicitar permissão
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false 
      })

      // Se chegou aqui, a permissão foi concedida
      setPermissionStatus('granted')
      console.log("Permissão concedida!")
      
      // Parar o stream de teste
      stream.getTracks().forEach(track => track.stop())
      
      // Iniciar o scanner QuaggaJS
      startQuaggaScanner()
      
    } catch (err: any) {
      console.error("Erro ao solicitar acesso à câmera:", err)
      
      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied')
        setShowPermissionRequest(true)
        setError("Acesso à câmera negado. Clique em 'Solicitar Permissão' para tentar novamente.")
      } else if (err.name === 'NotFoundError') {
        setError("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.")
      } else if (err.name === 'NotReadableError') {
        setError("A câmera está sendo usada por outro aplicativo. Feche Zoom, Teams, WhatsApp Web e outros apps que usam câmera.")
      } else {
        setError(`Erro ao acessar a câmera: ${err.message}`)
      }
      
      setIsInitializing(false)
    }
  }

  const startQuaggaScanner = async () => {
    try {
      console.log("Iniciando QuaggaJS scanner...")
      
      // Carregar QuaggaJS se necessário
      if (!window.Quagga) {
        await loadQuaggaScript()
      }

      if (!window.Quagga || !scannerRef.current) {
        throw new Error("QuaggaJS não está disponível")
      }

      window.Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment",
            aspectRatio: { min: 1, max: 2 }
          },
          area: {
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
        setShowPermissionRequest(false)

        // Configurar eventos
        window.Quagga.onDetected(handleCodeDetected)
        window.Quagga.onProcessed(handleProcessed)
      })

    } catch (err) {
      console.error("Erro ao iniciar QuaggaJS:", err)
      handleQuaggaError(err)
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

  const handleCodeDetected = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const code = result.codeResult.code.trim()
      
      if (code && code !== lastScan) {
        console.log("Código de barras detectado:", code)
        setLastScan(code)
        onScan(code)
        setError(null)
      }
    }
  }

  const handleProcessed = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      console.log("Processando código:", result.codeResult.code)
    }
  }

  const handleQuaggaError = (err: any) => {
    console.error("Erro do QuaggaJS:", err)
    
    let errorMessage = "Erro desconhecido"
    
    if (err.name === 'NotAllowedError') {
      errorMessage = "Acesso à câmera negado. Clique em 'Solicitar Permissão' para tentar novamente."
      setShowPermissionRequest(true)
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
    setShowPermissionRequest(false)
    
    setTimeout(() => {
      checkCameraPermission()
    }, 1000)
  }

  const forcePermissionRequest = async () => {
    try {
      setShowPermissionRequest(false)
      setError("Solicitando permissão da câmera...")
      setIsInitializing(true)
      
      // Tentar acessar a câmera novamente
      await requestCameraAccess()
      
    } catch (err) {
      console.error("Erro ao forçar solicitação de permissão:", err)
      setError("Não foi possível solicitar permissão da câmera. Verifique as configurações do navegador.")
    }
  }

  const openBrowserSettings = () => {
    const instructions = `
Para permitir o acesso à câmera:

CHROME:
1. Clique no ícone de cadeado na barra de endereços
2. Selecione "Permitir" para câmera
3. Recarregue a página

FIREFOX:
1. Clique no ícone de câmera na barra de endereços
2. Selecione "Permitir"
3. Recarregue a página

EDGE:
1. Clique no ícone de câmera na barra de endereços
2. Selecione "Permitir"
3. Recarregue a página

Ou tente em modo incógnito (Ctrl + Shift + N)
    `
    alert(instructions)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        {showPermissionRequest ? (
          <div className="space-y-4">
            <Alert className="mb-4 border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Permissão da Câmera Negada</strong><br />
                O navegador bloqueou o acesso à câmera. Você precisa permitir o acesso para usar o scanner.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={forcePermissionRequest} className="flex-1">
                <Unlock className="h-4 w-4 mr-2" />
                Solicitar Permissão
              </Button>
              
              <Button onClick={openBrowserSettings} variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações do Navegador
              </Button>
              
              <Button onClick={retryScanner} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Como resolver problemas de permissão:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Clique em "Solicitar Permissão"</strong> para tentar novamente</li>
                <li><strong>Use "Configurações do Navegador"</strong> para ver instruções detalhadas</li>
                <li><strong>Tente em modo incógnito</strong> (Ctrl + Shift + N)</li>
                <li><strong>Verifique se não há extensões</strong> bloqueando a câmera</li>
                <li><strong>Teste em outro navegador</strong> (Chrome, Firefox, Edge)</li>
                <li><strong>Reinicie o navegador</strong> completamente</li>
              </ul>
            </div>
          </div>
        ) : error ? (
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
              
              <Button onClick={forcePermissionRequest} variant="outline">
                <Unlock className="h-4 w-4 mr-2" />
                Solicitar Permissão
              </Button>
              
              <Button onClick={openBrowserSettings} variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isInitializing && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {permissionStatus === 'granted' 
                    ? `Inicializando scanner QuaggaJS... (Tentativa ${retryCount + 1})`
                    : "Verificando permissões da câmera..."
                  }
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

              {/* Indicador de permissão */}
              <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                {permissionStatus === 'granted' ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>Permitido</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Bloqueado</span>
                  </>
                )}
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
                onClick={forcePermissionRequest} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Solicitar Permissão
              </Button>
              
              <Button 
                onClick={openBrowserSettings} 
                variant="outline" 
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 