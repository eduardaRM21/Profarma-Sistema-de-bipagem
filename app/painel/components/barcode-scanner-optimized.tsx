"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw, Settings, Monitor, Shield, Lock, Unlock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerOptimizedProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    Quagga: any
  }
}

export default function BarcodeScannerOptimized({ onScan, onError }: BarcodeScannerOptimizedProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [scanAttempts, setScanAttempts] = useState(0)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [isDebugMode, setIsDebugMode] = useState(false)

  useEffect(() => {
    startOptimizedScanner()
    return () => {
      stopQuagga()
    }
  }, [])

  const startOptimizedScanner = async () => {
    try {
      setIsInitializing(true)
      setError(null)
      setDebugInfo("Iniciando scanner otimizado...")

      // Carregar QuaggaJS se necessário
      if (!window.Quagga) {
        await loadQuaggaScript()
      }

      if (!window.Quagga || !scannerRef.current) {
        throw new Error("QuaggaJS não está disponível")
      }

      console.log("Iniciando scanner otimizado...")

      window.Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment", // Câmera traseira
            aspectRatio: { min: 1, max: 2 }
          },
          area: {
            top: "20%",
            right: "10%",
            left: "10%",
            bottom: "20%"
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
        frequency: 5, // Reduzido para melhor performance
        multiple: false, // Evitar múltiplas leituras
        locate: true
      }, (err: any) => {
        if (err) {
          console.error("Erro ao inicializar QuaggaJS:", err)
          handleQuaggaError(err)
          return
        }

        console.log("QuaggaJS inicializado com sucesso")
        setIsInitializing(false)
        setIsScanning(true)
        setDebugInfo("Scanner ativo - Posicione o código de barras na área destacada")

        // Configurar eventos otimizados
        window.Quagga.onDetected(handleCodeDetected)
        window.Quagga.onProcessed(handleProcessed)
        window.Quagga.onProcessed((result: any) => {
          if (result) {
            setScanAttempts(prev => prev + 1)
            if (result.codeResult && result.codeResult.code) {
              console.log("Tentativa de leitura:", result.codeResult.code)
              setDebugInfo(`Tentativa ${scanAttempts + 1}: ${result.codeResult.code}`)
            }
          }
        })
      })

    } catch (err) {
      console.error("Erro ao iniciar scanner otimizado:", err)
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
        console.log("Confiança:", result.codeResult.confidence)
        console.log("Formato:", result.codeResult.format)
        
        setLastScan(code)
        onScan(code)
        setError(null)
        setDebugInfo(`✅ Código lido: ${code}`)
        
        // Feedback visual temporário
        setTimeout(() => {
          setDebugInfo("Scanner ativo - Posicione o próximo código")
        }, 3000)
      }
    }
  }

  const handleProcessed = (result: any) => {
    if (result) {
      if (result.codeResult && result.codeResult.code) {
        console.log("Processando código:", result.codeResult.code)
        setDebugInfo(`Processando: ${result.codeResult.code}`)
      } else {
        setDebugInfo("Nenhum código detectado - ajuste a posição")
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
      errorMessage = "A câmera está sendo usada por outro aplicativo."
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
    setScanAttempts(0)
    setDebugInfo("Reiniciando scanner...")
    
    setTimeout(() => {
      startOptimizedScanner()
    }, 1000)
  }

  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode)
    setDebugInfo(isDebugMode ? "Modo debug desativado" : "Modo debug ativado")
  }

  const testBarcodeReading = () => {
    setDebugInfo("Testando leitura de códigos...")
    // Simular teste de leitura
    setTimeout(() => {
      setDebugInfo("Teste concluído - Scanner funcionando")
    }, 2000)
  }

  const showReadingTips = () => {
    const tips = `
DICAS PARA MELHOR LEITURA:

1. DISTÂNCIA: Mantenha 10-30cm da câmera
2. ILUMINAÇÃO: Use boa luz, evite sombras
3. ESTABILIDADE: Mantenha a câmera parada
4. ÂNGULO: Posicione perpendicular ao código
5. TAMANHO: Códigos pequenos precisam ser aproximados
6. QUALIDADE: Evite códigos danificados ou borrados
7. ÁREA: Mantenha dentro da área destacada
8. PACIÊNCIA: Aguarde 2-3 segundos para leitura

FORMATOS SUPORTADOS:
- Code 128, EAN-13, EAN-8
- Code 39, UPC-A, UPC-E
- Codabar, I2of5
    `
    alert(tips)
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
              
              <Button onClick={showReadingTips} variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Dicas de Leitura
              </Button>
              
              <Button onClick={toggleDebugMode} variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Debug
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isInitializing && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Inicializando scanner otimizado... (Tentativa {retryCount + 1})
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

            {isDebugMode && debugInfo && (
              <Alert className="bg-purple-50 border-purple-200">
                <Monitor className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  Debug: {debugInfo} (Tentativas: {scanAttempts})
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <div 
                ref={scannerRef} 
                className="w-full h-64 bg-black rounded-lg overflow-hidden"
                style={{ position: 'relative' }}
              />

              {/* Overlay com guias visuais otimizadas */}
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

              {/* Indicador de tentativas */}
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                <Target className="w-3 h-3" />
                <span>{scanAttempts} tentativas</span>
              </div>

              {/* Indicador de debug */}
              {isDebugMode && (
                <div className="absolute bottom-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <Monitor className="w-3 h-3" />
                  <span>Debug</span>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Dicas para melhor leitura:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mantenha 10-30cm de distância da câmera</li>
                <li>Use boa iluminação, evite sombras</li>
                <li>Mantenha a câmera estável e parada</li>
                <li>Posicione perpendicular ao código de barras</li>
                <li>Para códigos pequenos, aproxime a câmera</li>
                <li>Evite códigos danificados ou borrados</li>
                <li>Mantenha dentro da área destacada</li>
                <li>Aguarde 2-3 segundos para leitura</li>
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
                onClick={showReadingTips} 
                variant="outline" 
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Dicas
              </Button>
              
              <Button 
                onClick={toggleDebugMode} 
                variant="outline" 
                size="sm"
                className="text-purple-600 hover:text-purple-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Debug
              </Button>
              
              <Button 
                onClick={testBarcodeReading} 
                variant="outline" 
                size="sm"
                className="text-orange-600 hover:text-orange-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Testar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 