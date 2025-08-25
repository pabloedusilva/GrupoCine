/*
  Arduino Code para Sistema de Cadeiras GrupoCine
  
  Hardware necessário:
  - Arduino Uno R3
  - Botão conectado nos terminais 1a, 1b, 2a, 2b
  - LED para indicação visual (teste no Tinkercad)
  
  Conexões:
  - Terminal 1a: Pino Digital 2
  - Terminal 1b: Pino Digital 3  
  - Terminal 2a: Pino Digital 4
  - Terminal 2b: Pino Digital 5
  - LED: Pino Digital 13 (+ resistor 220Ω para GND)
  
  Funcionamento:
  - Quando o botão é pressionado: LED acende + envia "SEAT:A1:PRESSED"
  - Quando o botão é liberado: LED apaga + envia "SEAT:A1:RELEASED"
*/

const int TERMINAL_1A = 2;    // Terminal 1a
const int TERMINAL_1B = 3;    // Terminal 1b
const int TERMINAL_2A = 4;    // Terminal 2a
const int TERMINAL_2B = 5;    // Terminal 2b
const int LED_PIN = 13;       // LED indicador
const String SEAT_CODE = "A1"; // Código da cadeira (alterar para cada Arduino)

bool lastButtonState = HIGH;   // Estado anterior do botão
bool currentButtonState = HIGH; // Estado atual do botão
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50; // Delay para debounce em ms

void setup() {
  // Inicializar comunicação serial
  Serial.begin(9600);
  
  // Configurar terminais como entrada com pull-up interno
  pinMode(TERMINAL_1A, INPUT_PULLUP);
  pinMode(TERMINAL_1B, INPUT_PULLUP);
  pinMode(TERMINAL_2A, INPUT_PULLUP);
  pinMode(TERMINAL_2B, INPUT_PULLUP);
  
  // Configurar LED como saída
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // LED inicialmente apagado
  
  // Mensagem de inicialização
  Serial.println("Arduino GrupoCine iniciado");
  Serial.println("Cadeira: " + SEAT_CODE);
  Serial.println("Terminais: 1a(D2), 1b(D3), 2a(D4), 2b(D5)");
  Serial.println("LED: Pino 13");
  Serial.println("Aguardando detecção...");
  
  // Piscar LED 3 vezes para indicar que está pronto
  for(int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void loop() {
  // Ler estado dos terminais (assumindo que o botão conecta 1a-1b ou 2a-2b quando pressionado)
  bool terminal1a = digitalRead(TERMINAL_1A);
  bool terminal1b = digitalRead(TERMINAL_1B);
  bool terminal2a = digitalRead(TERMINAL_2A);
  bool terminal2b = digitalRead(TERMINAL_2B);
  
  // Verificar se o botão está pressionado (conexão entre terminais)
  bool buttonPressed = (terminal1a == LOW && terminal1b == LOW) || (terminal2a == LOW && terminal2b == LOW);
  int reading = buttonPressed ? LOW : HIGH;
  
  // Verificar se houve mudança (debounce)
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  
  // Se passou o tempo de debounce
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Se o estado mudou
    if (reading != currentButtonState) {
      currentButtonState = reading;
      
      // Botão pressionado
      if (currentButtonState == LOW) {
        digitalWrite(LED_PIN, HIGH); // Acender LED
        Serial.println("SEAT:" + SEAT_CODE + ":PRESSED");
      }
      // Botão liberado
      else {
        digitalWrite(LED_PIN, LOW); // Apagar LED
        Serial.println("SEAT:" + SEAT_CODE + ":RELEASED");
      }
    }
  }
  
  // Salvar estado para próxima iteração
  lastButtonState = reading;
  
  // Pequeno delay para não sobrecarregar o loop
  delay(10);
}

/*
  INSTRUÇÕES DE USO:
  
  1. Carregue este código no seu Arduino Uno R3
  2. Altere a variável SEAT_CODE para o código da cadeira desejada (ex: "A1", "B3", etc.)
  3. Conecte o botão/sensor no pino 2 e GND
  4. Conecte o Arduino ao computador via USB
  5. Execute o servidor Node.js
  6. O sistema detectará automaticamente o Arduino e começará a receber dados
  
  NOTAS:
  - Para múltiplas cadeiras, use um Arduino para cada cadeira
  - Altere apenas o SEAT_CODE para cada cadeira
  - O sistema suporta até 50 cadeiras (A1-E10)
  - Certifique-se de que o SEAT_CODE corresponde exatamente ao código no banco de dados
*/
