"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertTriangle, CheckCircle } from "lucide-react"

export default function TestCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cameraInfo, setCameraInfo] = useState<any>(null)

  const startCamera = async () => {
    try {
      setError(null)
      setIsLoading(true)

      // Verificar se a API de mídia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de mídia não suportada pelo navegador")
      }

      // Listar dispositivos de mídia disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      console.log("Dispositivos de vídeo encontrados:", videoDevices)
      setCameraInfo({
        totalDevices: videoDevices.length,
        devices: videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
      })

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setIsLoading(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(`Erro ao acessar a câmera: ${errorMessage}`)
      setIsLoading(false)
      console.error("Erro da câmera:", err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-6 w-6" />
            <span>Teste de Câmera</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button onClick={startCamera} disabled={isLoading}>
              {isLoading ? "Iniciando..." : "Iniciar Câmera"}
            </Button>
            <Button onClick={stopCamera} variant="outline" disabled={!stream}>
              Parar Câmera
            </Button>
          </div>

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stream && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Câmera funcionando corretamente!
              </AlertDescription>
            </Alert>
          )}

          {cameraInfo && (
            <div className="text-sm space-y-2">
              <p><strong>Dispositivos de câmera encontrados:</strong> {cameraInfo.totalDevices}</p>
              {cameraInfo.devices.map((device: any, index: number) => (
                <p key={index} className="text-gray-600">
                  {index + 1}. {device.label || `Câmera ${index + 1}`}
                </p>
              ))}
            </div>
          )}

          <div className="relative">
            <video 
              ref={videoRef} 
              className="w-full h-64 bg-black rounded-lg object-cover" 
              playsInline 
              muted 
              autoPlay
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <div className="text-sm">Carregando câmera...</div>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Informações do navegador:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>User Agent: {navigator.userAgent}</li>
              <li>API de mídia: {navigator.mediaDevices ? "Disponível" : "Não disponível"}</li>
              <li>getUserMedia: {navigator.mediaDevices?.getUserMedia ? "Disponível" : "Não disponível"}</li>
              <li>enumerateDevices: {navigator.mediaDevices?.enumerateDevices ? "Disponível" : "Não disponível"}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 