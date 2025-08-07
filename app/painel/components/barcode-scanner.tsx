"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [codeReader, setCodeReader] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setIsInitializing(true)
      retryCountRef.current = 0

      // Tentar diferentes configurações de câmera
      const constraints = {
        video: {
          facingMode: "environment", // Câmera traseira (melhor para códigos de barras)
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
        },
      }

      let mediaStream: MediaStream

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (err) {
        // Fallback para configurações mais básicas
        console.log("Tentando configuração alternativa da câmera...")
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { min: 320 },
            height: { min: 240 },
          },
        })
      }

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Aguardar o vídeo carregar antes de iniciar o scan
        videoRef.current.onloadedmetadata = () => {
          console.log("Vídeo carregado, iniciando scanner...")
          setIsInitializing(false)
          startScanning()
        }

        videoRef.current.onerror = (err) => {
          console.error("Erro no vídeo:", err)
          setError("Erro ao carregar o vídeo da câmera")
        }

        // Iniciar o vídeo
        try {
          await videoRef.current.play()
        } catch (err) {
          console.error("Erro ao iniciar vídeo:", err)
          setError("Erro ao iniciar o vídeo da câmera")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("Erro ao acessar câmera:", err)
      setError(`Erro ao acessar a câmera: ${errorMessage}`)
      onError(errorMessage)
      setIsScanning(false)
      setIsInitializing(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (codeReader) {
      try {
        codeReader.reset()
      } catch (err) {
        console.error("Erro ao resetar codeReader:", err)
      }
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
      
      // Importar dinamicamente a biblioteca de leitura de códigos de barras
      const ZXing = await import("@zxing/library")
      
      console.log("Criando leitor de códigos...")
      
      // Criar o leitor com configurações otimizadas
      const reader = new ZXing.BrowserMultiFormatReader()
      
      // Configurar formatos de códigos de barras suportados
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
      
      // Configurar outras dicas de decodificação
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true)
      hints.set(ZXing.DecodeHintType.CHARACTER_SET, "UTF-8")
      hints.set(ZXing.DecodeHintType.NEED_RESULT_POINT_CALLBACK, false)
      
      reader.hints = hints
      setCodeReader(reader)

      console.log("Iniciando processo de scanning...")

      // Função para tentar ler o código de barras
      const attemptScan = async () => {
        if (!videoRef.current || !reader || videoRef.current.readyState !== 4) {
          console.log("Scanner não pronto:", {
            video: !!videoRef.current,
            reader: !!reader,
            readyState: videoRef.current?.readyState
          })
          return
        }

        try {
          console.log("Tentando ler código de barras...")
          // Usar a API correta do ZXing
          const result = await reader.decodeFromVideoElement(videoRef.current)
          
          if (result && result.getText()) {
            const scannedText = result.getText().trim()
            
            console.log("Código detectado:", scannedText)
            
            // Evitar scans duplicados consecutivos
            if (scannedText && scannedText !== lastScan) {
              console.log("Enviando código para processamento:", scannedText)
              setLastScan(scannedText)
              onScan(scannedText)
              
              // Parar temporariamente o scanning após um scan bem-sucedido
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
                scanIntervalRef.current = null
              }
              
              // Reiniciar o scanning após 2 segundos
              setTimeout(() => {
                if (isScanning) {
                  scanIntervalRef.current = setInterval(attemptScan, 300)
                }
              }, 2000)
            }
          }
        } catch (err) {
          // Ignorar erros de leitura (normal quando não há código visível)
          console.log("Nenhum código detectado:", err)
        }
      }

              // Aguardar um pouco antes de iniciar o scanning
        setTimeout(() => {
          console.log("Iniciando intervalo de scanning...")
          scanIntervalRef.current = setInterval(attemptScan, config.scanner.interval)
        }, 1000)

    } catch (err) {
      console.error("Erro ao carregar biblioteca ZXing:", err)
      setError("Erro ao carregar a biblioteca de códigos de barras")
      onError("Erro ao carregar a biblioteca de códigos de barras")
    }
  }

  const retryCamera = () => {
    stopCamera()
    setTimeout(() => {
      startCamera()
    }, 500)
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
            <Button onClick={retryCamera} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
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
