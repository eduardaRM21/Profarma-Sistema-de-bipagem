# Solução de Problemas - Câmera Integrada

## Problemas Comuns e Soluções

### 1. Câmera não está lendo códigos de barras

**Possíveis causas:**
- Permissões de câmera negadas
- Câmera não encontrada
- Biblioteca ZXing não carregada
- Configuração incorreta da câmera

**Soluções:**

#### A. Verificar Permissões
1. Clique no ícone de câmera na barra de endereços do navegador
2. Selecione "Permitir" para acesso à câmera
3. Recarregue a página

#### B. Verificar Câmera
1. Certifique-se de que há uma câmera conectada ao dispositivo
2. Teste a câmera em outras aplicações
3. Verifique se não há outras aplicações usando a câmera

#### C. Configurações do Navegador
1. **Chrome/Edge:**
   - Digite `chrome://settings/content/camera` na barra de endereços
   - Verifique se o site está na lista de sites permitidos
   - Remova da lista de bloqueados se necessário

2. **Firefox:**
   - Digite `about:preferences#privacy` na barra de endereços
   - Role até "Permissões" e clique em "Configurações"
   - Verifique as configurações de câmera

3. **Safari:**
   - Vá em Preferências > Sites > Câmera
   - Verifique se o site está configurado corretamente

### 2. Câmera lenta ou travando

**Soluções:**
- Reduza a resolução da câmera
- Feche outras aplicações que usam a câmera
- Reinicie o navegador
- Limpe o cache do navegador

### 3. Códigos de barras não são detectados

**Dicas para melhor leitura:**
- Mantenha o código de barras dentro da área destacada
- Certifique-se de que há boa iluminação
- Mantenha o dispositivo estável
- O código deve estar nítido e bem focado
- Evite reflexos e sombras no código

### 4. Erro "API de mídia não suportada"

**Causa:** Navegador muito antigo ou não suporta APIs de mídia

**Solução:**
- Atualize para uma versão mais recente do navegador
- Use Chrome, Firefox, Safari ou Edge atualizados

### 5. Erro "Biblioteca ZXing não carregada"

**Soluções:**
- Recarregue a página
- Verifique a conexão com a internet
- Limpe o cache do navegador
- Tente em modo incógnito

## Diagnósticos

O scanner agora inclui diagnósticos em tempo real que mostram:
- Status da inicialização da câmera
- Carregamento da biblioteca ZXing
- Tentativas de leitura de códigos
- Erros específicos

## Configurações Técnicas

### Configuração da Câmera
```javascript
const constraints = {
  video: {
    facingMode: "environment", // Câmera traseira
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    aspectRatio: { ideal: 16/9 },
  },
}
```

### Intervalo de Scanning
- Intervalo: 200ms (otimizado para performance)
- Formato suportado: Todos os formatos suportados pela biblioteca ZXing

## Suporte

Se os problemas persistirem:
1. Verifique os diagnósticos na interface
2. Teste em diferentes navegadores
3. Teste em diferentes dispositivos
4. Entre em contato com o suporte técnico

## Logs de Debug

Para debug avançado, abra o console do navegador (F12) e verifique:
- Erros de JavaScript
- Logs de diagnóstico
- Status da API de mídia
- Carregamento da biblioteca ZXing 