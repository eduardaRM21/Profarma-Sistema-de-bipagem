"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Info } from "lucide-react"

export default function BarcodeTest() {
  const [zxingStatus, setZxingStatus] = useState<string>("Verificando...")
  const [cameraStatus, setCameraStatus] = useState<string>("Verificando...")
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    testZXing()
    testCamera()
  }, [])

  const testZXing = async () => {
    try {
      console.log("Testando biblioteca ZXing...")
      const ZXing = await import("@zxing/library")
      
      if (ZXing && ZXing.BrowserMultiFormatReader) {
        console.log("ZXing carregado com sucesso")
        setZxingStatus("✅ Biblioteca ZXing carregada com sucesso")
        setTestResults(prev => [...prev, "ZXing: OK"])
      } else {
        console.error("ZXing não encontrado")
        setZxingStatus("❌ Erro ao carregar biblioteca ZXing")
        setTestResults(prev => [...prev, "ZXing: ERRO"])
      }
    } catch (error) {
      console.error("Erro ao testar ZXing:", error)
      setZxingStatus("❌ Erro ao carregar biblioteca ZXing")
      setTestResults(prev => [...prev, `ZXing: ${error}`])
    }
  }

  const testCamera = async () => {
    try {
      console.log("Testando acesso à câmera...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      
      console.log("Câmera acessada com sucesso")
      setCameraStatus("✅ Acesso à câmera funcionando")
      setTestResults(prev => [...prev, "Câmera: OK"])
      
      // Parar o stream de teste
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error("Erro ao acessar câmera:", error)
      setCameraStatus("❌ Erro ao acessar câmera")
      setTestResults(prev => [...prev, `Câmera: ${error}`])
    }
  }

  const runFullTest = async () => {
    setTestResults([])
    await testZXing()
    await testCamera()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-blue-600" />
          <span>Teste do Scanner</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Este componente testa se a biblioteca ZXing e a câmera estão funcionando corretamente.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">ZXing:</span>
            <span className="text-sm">{zxingStatus}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Câmera:</span>
            <span className="text-sm">{cameraStatus}</span>
          </div>
        </div>

        <Button onClick={runFullTest} className="w-full">
          Executar Teste Completo
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Resultados dos Testes:</h4>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Dicas:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Se ZXing falhar, verifique se a biblioteca está instalada</li>
            <li>Se a câmera falhar, verifique as permissões do navegador</li>
            <li>Certifique-se de estar usando HTTPS em produção</li>
            <li>Teste em diferentes navegadores</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 