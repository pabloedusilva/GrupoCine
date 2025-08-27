/*
  Arduino Code para Sistema de Cadeiras GrupoCine
  
  Hardware necessário:
  - Arduino Uno R3
  - Botão conectado nos terminais 1a, 1b, 2a, 2b
  - LED VERMELHO para indicar pessoa sentada
  - LED VERDE para indicar cadeira ocupada (código validado)
  
  Conexões:
  - Terminal 1a: Pino Digital 6
  - Terminal 1b: Pino Digital 7  
  - Terminal 2a: Pino Digital 8
  - Terminal 2b: Pino Digital 9
  - LED VERMELHO: Pino Digital 12 (+ resistor 220Ω para GND)
  - LED VERDE: Pino Digital 13 (+ resistor 220Ω para GND)
  
  Funcionamento:
  - Quando o botão é pressionado: LED VERMELHO acende + envia "SEAT:A1:PRESSED"
  - Quando o botão é liberado: LED VERMELHO apaga + envia "SEAT:A1:RELEASED"
  - LED VERDE acende apenas quando recebe comando "SEAT:A1:OCCUPIED" do servidor
  - LED VERDE apaga quando recebe comando "SEAT:A1:AVAILABLE" do servidor
*/

#include <Arduino.h>

// Pinos dos terminais (ATUALIZADOS conforme solicitação - não usa mais D2..D5)
const int TERMINAL_1A = 6;    // Terminal 1a (antes D2)
const int TERMINAL_1B = 7;    // Terminal 1b (antes D3)
const int TERMINAL_2A = 8;    // Terminal 2a (antes D4)
const int TERMINAL_2B = 9;    // Terminal 2b (antes D5)
const int LED_RED_PIN = 12;   // LED VERMELHO (pessoa sentada)
const int LED_GREEN_PIN = 13; // LED VERDE (cadeira ocupada)
String SEAT_CODE = "A1";      // Código da cadeira - será configurado dinamicamente via comando CONFIG
bool isOccupied = false;       // Flag local para saber se cadeira está validada (OCCUPIED)

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
  
  // Configurar LEDs como saída
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  digitalWrite(LED_RED_PIN, LOW);   // LED vermelho inicialmente apagado
  digitalWrite(LED_GREEN_PIN, LOW); // LED verde inicialmente apagado
  
  // Mensagem de inicialização
  Serial.println("Arduino GrupoCine iniciado");
  Serial.println("Cadeira: " + SEAT_CODE);
  Serial.println("Terminais: 1a(D6), 1b(D7), 2a(D8), 2b(D9)");
  Serial.println("LED VERMELHO: Pino 12 (pessoa sentada)");
  Serial.println("LED VERDE: Pino 13 (cadeira ocupada)");
  Serial.println("Aguardando detecção...");
  
  // Piscar LEDs para indicar que está pronto
  for(int i = 0; i < 3; i++) {
    digitalWrite(LED_RED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, HIGH);
    delay(100);
    digitalWrite(LED_GREEN_PIN, LOW);
    delay(100);
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
      
      // Botão pressionado (pessoa sentou)
      if (currentButtonState == LOW) {
        if (!isOccupied) { // só acende vermelho se ainda não validada
          digitalWrite(LED_RED_PIN, HIGH); // Acender LED VERMELHO
        }
        Serial.println("SEAT:" + SEAT_CODE + ":PRESSED");
      }
      // Botão liberado (pessoa levantou)
      else {
        if (!isOccupied) {
          digitalWrite(LED_RED_PIN, LOW); // Apagar LED VERMELHO apenas se não validada
        }
        Serial.println("SEAT:" + SEAT_CODE + ":RELEASED");
      }
    }
  }
  
  // Salvar estado para próxima iteração
  lastButtonState = reading;
  
  // Verificar comandos recebidos do servidor
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Comando para configurar nova cadeira
    if (command.startsWith("CONFIG:")) {
      String newSeatCode = command.substring(7); // Remove "CONFIG:"
      if (newSeatCode.length() > 0) {
        SEAT_CODE = newSeatCode;
        Serial.println("CONFIGURADO:" + SEAT_CODE);
        
        // Piscar LEDs para confirmar configuração
        for(int i = 0; i < 2; i++) {
          digitalWrite(LED_RED_PIN, HIGH);
          digitalWrite(LED_GREEN_PIN, HIGH);
          delay(150);
          digitalWrite(LED_RED_PIN, LOW);
          digitalWrite(LED_GREEN_PIN, LOW);
          delay(150);
        }
      }
    }
    // Comando para controlar LED VERDE
    else if (command == "SEAT:" + SEAT_CODE + ":OCCUPIED") {
      // Status: cadeira validada -> apenas LED VERDE aceso
      isOccupied = true;
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, HIGH);
    } else if (command == "SEAT:" + SEAT_CODE + ":PENDING") {
      // Status: pessoa sentada aguardando validação -> apenas LED VERMELHO aceso
      isOccupied = false;
      digitalWrite(LED_RED_PIN, HIGH);
      digitalWrite(LED_GREEN_PIN, LOW);
    } else if (command == "SEAT:" + SEAT_CODE + ":WAITING") {
      // Status: cadeira livre aguardando alguém sentar -> ambos apagados
      isOccupied = false;
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, LOW);
    } else if (command == "SEAT:" + SEAT_CODE + ":AVAILABLE") {
      // Compatibilidade anterior: tratar AVAILABLE como cadeira livre (ambos apagados)
      isOccupied = false;
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, LOW);
    }
  }
  
  // Pequeno delay para não sobrecarregar o loop
  delay(10);
}

/*
  INSTRUÇÕES DE USO:
  
  1. Carregue este código no seu Arduino Uno R3
  2. Altere a variável SEAT_CODE para o código da cadeira desejada (ex: "A1", "B3", etc.)
  3. Conecte os componentes:
  - Botão: terminais nos pinos 6, 7, 8, 9
     - LED VERMELHO: pino 12 + resistor 220Ω para GND
     - LED VERDE: pino 13 + resistor 220Ω para GND
  4. Conecte o Arduino ao computador via USB
  5. Execute o servidor Node.js
  6. O sistema detectará automaticamente o Arduino e começará a receber dados
  
  FUNCIONAMENTO:
  - LED VERMELHO: Acende quando alguém senta (pressiona botão)
  - LED VERDE: Acende quando a pessoa valida o código (cadeira ocupada)
  
  NOTAS:
  - Para múltiplas cadeiras, use um Arduino para cada cadeira
  - Altere apenas o SEAT_CODE para cada cadeira
  - O sistema suporta até 50 cadeiras (A1-E10)
  - Certifique-se de que o SEAT_CODE corresponde exatamente ao código no banco de dados
*/
