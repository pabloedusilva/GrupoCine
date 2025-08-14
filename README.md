# 🎬 CineMax - Sistema de Gerenciamento de Assentos com QR Code

Sistema completo para gerenciamento de assentos de cinema com validação por QR Code e códigos únicos.

## 📋 Recursos

- **Scanner QR Code**: Interface para escanear QR codes das cadeiras
- **Códigos Únicos**: Sistema de validação com códigos alfanuméricos de 5 caracteres
- **Dashboard Administrativo**: Controle completo das cadeiras em tempo real
- **Atualizações em Tempo Real**: WebSocket para sincronização instantânea
- **Banco de Dados MySQL**: Armazenamento seguro de dados
- **Histórico Completo**: Rastreamento de todas as atividades
- **Relatórios**: Exportação de dados e estatísticas

## 🚀 Instalação

### 1. Pré-requisitos

- **Node.js** (versão 16 ou superior)
- **MySQL** (versão 8.0 ou superior)
- **Navegador moderno** com suporte à câmera

### 2. Configuração do Banco de Dados

1. **Instale e configure o MySQL**
2. **Crie o banco de dados**:
   ```sql
   CREATE DATABASE cinema_seats;
   ```
3. **Execute o script de inicialização**:
   ```bash
   mysql -u root -p cinema_seats < database/init.sql
   ```

### 3. Configuração do Projeto

1. **Clone ou extraia o projeto**
2. **Instale as dependências**:
   ```bash
   npm install
   ```
3. **Configure as variáveis de ambiente**:
   - Edite o arquivo `.env` com suas configurações:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha_mysql
   DB_DATABASE=cinema_seats
   DB_PORT=3306
   PORT=3000
   SESSION_TIMEOUT_MINUTES=120
   CODE_EXPIRY_HOURS=2
   ```

### 4. Iniciando o Sistema

```bash
npm start
```

O sistema estará disponível em:
- **Interface do Usuário**: http://localhost:3000
- **Dashboard Administrativo**: http://localhost:3000/dashboard

## 📱 Como Usar

### Interface do Usuário (Público)

1. **Acesse** http://localhost:3000
2. **Permita o acesso à câmera** quando solicitado
3. **Escaneie o QR Code** da cadeira desejada
4. **Digite o código único** de 5 caracteres fornecido no seu ingresso
5. **Aguarde a validação** - se correto, a cadeira será liberada

### Dashboard Administrativo

1. **Acesse** http://localhost:3000/dashboard
2. **Monitore em tempo real**:
   - Status de todas as cadeiras
   - Códigos ativos
   - Atividades recentes
3. **Gere códigos únicos** para cadeiras específicas
4. **Visualize relatórios** e histórico completo
5. **Exporte dados** quando necessário

## 🎭 Sistema de Status das Cadeiras

- **🟤 Disponível**: Cadeira livre para uso
- **🟠 Comprada**: Código gerado, aguardando validação
- **🟢 Ocupada**: Código validado, cadeira em uso
- **🟣 VIP**: Cadeiras especiais (fileira A)

## 🔐 Segurança

### Códigos Únicos
- **5 caracteres alfanuméricos** (maiúsculas, minúsculas e números)
- **Expiração automática** após 2 horas (configurável)
- **Uso único** - não pode ser reutilizado
- **Geração aleatória** garantindo unicidade

### Validações
- Verificação de cadeira válida
- Confirmação de código não expirado
- Bloqueio de códigos já utilizados
- Log de todas as tentativas

## 🗄️ Estrutura do Banco de Dados

### Tabela `seats`
- Informações das cadeiras (A1-E10)
- Identificação VIP
- Timestamps de criação/atualização

### Tabela `seat_codes`
- Códigos únicos ativos
- Data de expiração
- Status de uso

### Tabela `seat_sessions`
- Histórico de sessões
- Duração de uso
- IPs dos usuários

## 🛠️ API Endpoints

### GET `/api/seats`
Retorna status de todas as cadeiras

### POST `/api/validate-seat`
Valida código da cadeira
```json
{
  "seatCode": "A1",
  "uniqueCode": "Ax9P2",
  "userIP": "192.168.1.100"
}
```

### POST `/api/generate-code`
Gera novo código para cadeira
```json
{
  "seatCode": "A1"
}
```

### POST `/api/end-session`
Finaliza sessão ativa
```json
{
  "seatCode": "A1"
}
```

### GET `/api/seat-history/:seatCode`
Retorna histórico de uma cadeira específica

## 🔧 Personalização

### Códigos de Expiração
Altere no arquivo `.env`:
```env
CODE_EXPIRY_HOURS=2  # Códigos expiram em 2 horas
```

### Timeout de Sessão
```env
SESSION_TIMEOUT_MINUTES=120  # Sessões duram 2 horas
```

### Layout do Cinema
Modifique no arquivo `database/init.sql` para adicionar/remover cadeiras

## 📊 Monitoramento

### Logs do Sistema
- Todas as atividades são registradas
- Console do servidor mostra eventos em tempo real
- Dashboard exibe feed de atividades

### Métricas Disponíveis
- Taxa de ocupação
- Códigos ativos/usados
- Duração média das sessões
- Histórico completo de uso

## 🚨 Solução de Problemas

### Erro de Conexão com MySQL
1. Verifique se o MySQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Teste a conexão manualmente

### Câmera não funciona
1. Verifique permissões do navegador
2. Use HTTPS em produção
3. Teste em navegador diferente

### Códigos não validam
1. Verifique se não expiraram
2. Confirme se não foram usados anteriormente
3. Verifique logs do servidor

## 📈 Produção

### Configurações Recomendadas
- Use HTTPS para câmera funcionar
- Configure backup automático do banco
- Monitore logs de erro
- Implemente rate limiting
- Configure firewall adequadamente

### Variáveis de Ambiente para Produção
```env
NODE_ENV=production
DB_HOST=seu_host_mysql
DB_PASSWORD=senha_forte
PORT=80
```

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Confirme configurações do banco
3. Teste em ambiente local primeiro

## 📄 Licença

Este projeto é fornecido como exemplo educacional. Adapte conforme necessário para uso comercial.

---

**Desenvolvido para demonstrar integração de QR Code, WebSocket e MySQL em aplicação Node.js**
