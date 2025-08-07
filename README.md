# Profarma - Sistema de Bipagem

Sistema completo para bipagem de notas fiscais com scanner de código de barras integrado.

## 🚀 Funcionalidades

- **Scanner de Código de Barras**: Leitura automática via câmera
- **Validação de Recebimento**: Verifica se NFs foram bipadas no recebimento
- **Gerenciamento de Carros**: Organização por carros/destinos
- **Sistema de Chat**: Comunicação interna entre usuários
- **Interface Responsiva**: Funciona em desktop e mobile
- **Controle de Acesso**: Sistema de administradores
- **Relatórios**: Geração de relatórios de produção

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Scanner**: ZXing Library
- **Deploy**: Vercel (recomendado)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Navegador moderno com suporte a WebRTC
- Câmera para scanner de código de barras

## ⚡ Instalação Rápida

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd profarma-bipagem

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
npm run setup-env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

## 🔧 Configuração Detalhada

### 1. Variáveis de Ambiente

O projeto usa configuração centralizada. Execute:

```bash
npm run setup-env
```

Isso criará um arquivo `.env.local` com todas as configurações necessárias.

### 2. Configuração Manual (Opcional)

Se preferir configurar manualmente, crie um arquivo `.env.local` na raiz:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://auiidcxarcjjxvyswwhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY

# Application Configuration
NEXT_PUBLIC_APP_NAME=Profarma Bipagem
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENVIRONMENT=development

# Scanner Configuration
NEXT_PUBLIC_SCANNER_TIMEOUT=30000
NEXT_PUBLIC_SCANNER_INTERVAL=500

# Feature Flags
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_ADMIN_FEATURES=true

# Logging Configuration
NEXT_PUBLIC_ENABLE_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=debug

# Development Configuration
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ALLOW_HTTP_IN_DEVELOPMENT=true
```

## 🎯 Como Usar

### 1. Acesso ao Sistema

1. Acesse `http://localhost:3000`
2. Faça login com suas credenciais
3. Selecione a data e turno de trabalho

### 2. Bipagem de NFs

1. **Vá para a seção "NFs Bipadas"**
2. **Clique em "Scanner"** para ativar a câmera
3. **Posicione o código de barras** na área destacada
4. **O sistema processará automaticamente** o código
5. **Verifique a validação** - NFs devem ser bipadas primeiro no recebimento

### 3. Gerenciamento de Carros

- **Crie novos carros** conforme necessário
- **Alterne entre carros** para organizar por destino
- **Finalize a bipagem** quando terminar
- **Embalar carros** para enviar à produção

### 4. Sistema de Chat

- **Acesse o chat** pelo botão flutuante
- **Comunique-se** com outros usuários
- **Receba notificações** de mensagens não lidas

## 🔍 Troubleshooting

### Scanner não funciona

1. **Verifique permissões da câmera**
2. **Certifique-se de estar usando HTTPS** (em produção)
3. **Teste em diferentes navegadores**
4. **Verifique os logs no console**

### Supabase não conecta

1. **Verifique as credenciais** no `.env.local`
2. **Confirme se o projeto Supabase está ativo**
3. **Teste a conexão** no painel do Supabase

### Problemas de Performance

1. **Ajuste o intervalo do scanner** (`NEXT_PUBLIC_SCANNER_INTERVAL`)
2. **Reduza o timeout** (`NEXT_PUBLIC_SCANNER_TIMEOUT`)
3. **Desabilite logs** em produção (`NEXT_PUBLIC_ENABLE_LOGGING=false`)

## 📚 Documentação

- **ENV_SETUP.md**: Configuração detalhada de variáveis de ambiente
- **Console do navegador**: Logs de debug e configuração
- **Componentes**: Código comentado e documentado

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# 1. Conecte seu repositório ao Vercel
# 2. Configure as variáveis de ambiente no painel
# 3. Deploy automático a cada push
```

### Outras Plataformas

1. **Configure HTTPS** (obrigatório para scanner)
2. **Defina variáveis de ambiente**
3. **Build**: `npm run build`
4. **Start**: `npm start`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:

- **Issues**: Abra uma issue no GitHub
- **Documentação**: Consulte ENV_SETUP.md
- **Logs**: Verifique o console do navegador

---

**Desenvolvido com ❤️ para Profarma**