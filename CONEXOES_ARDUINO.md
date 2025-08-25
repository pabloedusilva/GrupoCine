# 📋 GUIA DE CONEXÕES - Arduino Uno R3 para Sistema GrupoCine

## 🔧 Material Necessário
- 1x Arduino Uno R3
- 1x Botão/Sensor de pressão (4 terminais: 1a, 1b, 2a, 2b)
- 1x LED (qualquer cor)
- 1x Resistor 220Ω (para o LED)
- 6x Jumpers macho-macho
- 1x Cabo USB A-B (para conectar Arduino ao PC)
- 1x Protoboard (opcional, para facilitar conexões)

## 🔌 PASSO A PASSO DAS CONEXÕES

### **PASSO 1: Identificar os terminais do botão**
```
Botão com 4 terminais:
┌─────────┐
│ 1a  1b  │
│         │
│ 2a  2b  │
└─────────┘
```

### **PASSO 2: Conectar os terminais ao Arduino**

**CONEXÃO DOS TERMINAIS:**
```
Arduino Uno R3          Botão               LED
┌─────────────┐         ┌─────────┐         ┌─────┐
│ Pino 2 (D2) │ ←────── │   1a    │         │  +  │
│ Pino 3 (D3) │ ←────── │   1b    │         │     │ LED
│ Pino 4 (D4) │ ←────── │   2a    │         │  -  │
│ Pino 5 (D5) │ ←────── │   2b    │         │     │
│ Pino 13     │ ────────┬─────────────────→ │  +  │
│ GND         │ ────────┼─────────────→ [220Ω] → │  -  │
│ 5V          │         │         │         └─────┘
└─────────────┘         └─────────┘
```

### **PASSO 3: Fazer as conexões físicas**

1. **Desconecte o Arduino** do computador antes de fazer as conexões
2. **Conecte os jumpers:**
   - Terminal **1a** do botão → Pino **Digital 2** do Arduino (fio vermelho)
   - Terminal **1b** do botão → Pino **Digital 3** do Arduino (fio laranja)
   - Terminal **2a** do botão → Pino **Digital 4** do Arduino (fio amarelo)
   - Terminal **2b** do botão → Pino **Digital 5** do Arduino (fio verde)
3. **Conecte o LED:**
   - **Ânodo (+)** do LED → Pino **Digital 13** do Arduino (fio azul)
   - **Cátodo (-)** do LED → Resistor 220Ω → **GND** do Arduino (fio preto)

### **PASSO 4: Diagrama visual das conexões**

```
     Arduino Uno R3                    LED + Resistor
    ┌─────────────────┐               ┌──────────────┐
    │  USB    RESET   │               │              │
    │ ┌───┐           │               │   LED        │
    │ │   │    13 ●───┼───────────────┼→ (+) Ânodo   │
    │ │   │ ~11 ~10   │               │              │
    │ │   │  ~9  8    │               │   220Ω       │
    │ │   │     7     │               │   Resistor   │
    │ │   │ ~6  ~5 ●──┼── 2b (Verde)  │              │
    │ │   │     4  ●──┼── 2a (Amarelo)│   (-) Cátodo │
    │ │   │ ~3     ●──┼── 1b (Laranja)│       │      │
    │ │   │  2     ●──┼── 1a (Vermelho)│      │      │
    │ └───┘  1     0  │               │      │      │
    │              TX │               │      │      │
    │     GND  GND ●──┼───────────────┼──────┘      │
    │ A0       VIN    │               │             │
    │ A1       5V     │               └─────────────┘
    │ A2       3.3V   │
    │ A3   ●   RESET  │
    │ A4  GND  IOREF  │
    │ A5   ●          │
    └─────────────────┘
```

### **PASSO 5: Como funciona a detecção**

**Funcionamento do botão:**
- Quando **NÃO pressionado**: Terminais 1a-1b e 2a-2b estão **desconectados** + LED **APAGADO**
- Quando **PRESSIONADO**: Terminais 1a-1b ficam **conectados** E 2a-2b ficam **conectados** + LED **ACESO**

**Lógica do Arduino:**
```
Se (1a E 1b estão em LOW) OU (2a E 2b estão em LOW):
    Botão está PRESSIONADO → LED ACENDE
Senão:
    Botão está LIBERADO → LED APAGA
```

**Indicação visual:**
- **LED APAGADO**: Cadeira aguardando (estado cinza no sistema)
- **LED ACESO**: Pessoa sentada (estado laranja no sistema)

### **PASSO 6: Verificar as conexões**

**Checklist antes de ligar:**
- [ ] Terminal 1a → Pino Digital 2
- [ ] Terminal 1b → Pino Digital 3  
- [ ] Terminal 2a → Pino Digital 4
- [ ] Terminal 2b → Pino Digital 5
- [ ] LED ânodo (+) → Pino Digital 13
- [ ] LED cátodo (-) → Resistor 220Ω → GND
- [ ] Nenhum fio solto ou mal conectado
- [ ] Arduino desconectado do PC durante conexões

### **PASSO 7: Carregar o código**

1. **Conecte o Arduino** ao computador via USB
2. **Abra o Arduino IDE**
3. **Copie e cole** o código do arquivo `arduino_code.ino`
4. **Altere o SEAT_CODE** para a cadeira desejada (ex: "A1", "B3", etc.)
5. **Selecione a porta COM** correta
6. **Carregue o código** no Arduino

### **PASSO 8: Testar o sistema**

1. **Abra o Serial Monitor** (Ctrl+Shift+M) no Arduino IDE
2. **Configure para 9600 baud**
3. **Ao ligar**: LED deve piscar 3 vezes (indicando que está pronto)
4. **Pressione o botão** → LED acende + aparece: `SEAT:A1:PRESSED`
5. **Solte o botão** → LED apaga + aparece: `SEAT:A1:RELEASED`

## 🎮 SIMULAÇÃO NO TINKERCAD

### **Como montar no Tinkercad:**

1. **Acesse**: [tinkercad.com](https://www.tinkercad.com)
2. **Crie um novo circuito**
3. **Adicione os componentes:**
   - Arduino Uno R3
   - Pushbutton (4 pinos)
   - LED (qualquer cor)
   - Resistor 220Ω
   - Fios/jumpers

### **Montagem no Tinkercad:**
```
Arduino Uno R3 (Tinkercad)
- Pino 2 → Terminal 1a do Pushbutton
- Pino 3 → Terminal 1b do Pushbutton  
- Pino 4 → Terminal 2a do Pushbutton
- Pino 5 → Terminal 2b do Pushbutton
- Pino 13 → Resistor 220Ω → LED (ânodo)
- GND → LED (cátodo)
```

### **Para testar no Tinkercad:**
1. **Cole o código** do arquivo `arduino_code.ino`
2. **Clique em "Iniciar Simulação"**
3. **LED deve piscar 3 vezes** (inicialização)
4. **Pressione o pushbutton** → LED acende
5. **Solte o pushbutton** → LED apaga
6. **Monitore o Serial Monitor** para ver as mensagens

## ⚠️ TROUBLESHOOTING

**Problema: Não detecta pressão**
- Verifique se os fios estão bem conectados
- Teste a continuidade do botão com multímetro
- Verifique se o SEAT_CODE no código corresponde à cadeira no sistema

**Problema: Detecção instável**
- Verifique se há fios soltos
- O código já tem debounce implementado
- Certifique-se que apenas um botão está conectado por Arduino

**Problema: Arduino não aparece no sistema**
- Verifique se o driver USB está instalado
- Tente outra porta USB
- Verifique se o cabo USB não está danificado

**Problema: LED não acende**
- Verifique a polaridade do LED (ânodo + para pino 13)
- Verifique se o resistor está conectado corretamente
- Teste com um LED diferente

**Problema: LED fica sempre aceso**
- Verifique se os terminais do botão estão conectados corretamente
- Problema pode ser na lógica do botão (4 terminais)

**Problema: No Tinkercad não funciona**
- Certifique-se de usar Pushbutton de 4 pinos
- Verifique todas as conexões no diagrama
- Reinicie a simulação se necessário

## 📝 NOTAS IMPORTANTES

- **Para múltiplas cadeiras**: Use um Arduino para cada cadeira
- **Altere apenas** o `SEAT_CODE` no código para cada cadeira
- **Códigos válidos**: A1 até E10 (conforme configurado no banco)
- **Não é necessário** resistor externo (pull-up interno ativado)
- **Tensão de operação**: 5V (padrão do Arduino Uno)

## 🎯 CONFIGURAÇÃO PARA CADA CADEIRA

Para cadeira A1:
```cpp
const String SEAT_CODE = "A1";
```

Para cadeira B3:
```cpp
const String SEAT_CODE = "B3";
```

E assim por diante...

## ✅ RESULTADO ESPERADO

Quando tudo estiver funcionando:
- **LED pisca 3 vezes** na inicialização
- **LED acende** quando botão é pressionado (pessoa senta)
- **LED apaga** quando botão é liberado (pessoa levanta)
- **Servidor detecta** o Arduino automaticamente
- **Interface web** mostra cadeiras em tempo real
- **Estado "Pendente"** (laranja) quando alguém senta
- **Estado "Ocupada"** (vermelho) quando código é validado
- **Estado "Aguardando"** (cinza) quando pessoa levanta
