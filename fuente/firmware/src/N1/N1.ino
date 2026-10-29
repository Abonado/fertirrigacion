// N1 · Nivel del depósito · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define VEXT 36
#define SENSOR_RX 47   // cable blanco (TX del A02YYUW)
// ---- Común a todos los nodos Agro FLY (no hace falta tocarlo) ----
#define ADC_CTRL 37     // control de la lectura de batería de la Heltec V3
#define ADC_ON LOW      // si la batería marca 0 V, cambia a HIGH (placas V3.2)
#define VBAT_PIN 1
#define BOTON_PRG 0
SX1262 radio = new Module(8, 14, 12, 13);   // NSS, DIO1, RST, BUSY (fijos en la Heltec V3)
String ID;
String idNodo() { uint64_t m = ESP.getEfuseMac(); char b[7]; snprintf(b, sizeof b, "%06X", (unsigned)((m >> 24) & 0xFFFFFF)); return String(b); }
float batV() {
  pinMode(ADC_CTRL, OUTPUT); digitalWrite(ADC_CTRL, ADC_ON); delay(10);
  uint32_t mv = 0; for (int i = 0; i < 8; i++) mv += analogReadMilliVolts(VBAT_PIN);
  digitalWrite(ADC_CTRL, !ADC_ON);
  return mv / 8.0 * 4.9 / 1000.0;   // divisor de 390 kΩ y 100 kΩ
}
void af(const String& s) { Serial.println("#AF " + s); }   // autoprueba: la lee la app por el cable USB
bool radioIni() {
  SPI.begin(9, 11, 10, 8);
  int e = radio.begin(868.0, 125.0, 9, 7, RADIOLIB_SX126X_SYNC_WORD_PRIVATE, 14, 8, 1.8);
  af(e == RADIOLIB_ERR_NONE ? String("radio=ok") : "radio=err" + String(e));
  return e == RADIOLIB_ERR_NONE;
}
void enviar(String m) {      // por copia: RadioLib pide un String que pueda tocar
  Serial.println(m); af("dato=" + m);
  int e = radio.transmit(m);
  if (e != RADIOLIB_ERR_NONE) af("envio=err" + String(e));
}
void dormir(uint64_t minutos) {
  radio.sleep(); pinMode(36, OUTPUT); digitalWrite(36, HIGH);   // apaga la radio y los sensores (Vext)
  esp_sleep_enable_timer_wakeup(minutos * 60ULL * 1000000ULL);
  esp_deep_sleep_start();   // duerme y vuelve a empezar desde setup()
}
// Modo cobertura: con el botón PRG apretado al encender, una señal cada 10 s durante 15 minutos
void cobertura() {
  if (digitalRead(BOTON_PRG) != LOW) return;
  af("modo=cobertura");
  if (!radioIni()) return;
  for (int n = 1; n <= 90; n++) { enviar("PING;id=" + ID + ";n=" + String(n)); delay(10000); }
  ESP.restart();
}
void inicio(const char* nodo) {
  Serial.begin(115200); delay(300);
  pinMode(BOTON_PRG, INPUT_PULLUP);
  ID = idNodo();
  af(String("nodo=") + nodo); af("id=" + ID); af("version=1");
  cobertura();
}
// ---- Fin de lo común ----
HardwareSerial Sensor(1);
const float FONDO_CM = 167;   // distancia del sensor al fondo: CÁMBIALA por la medida real
const float LLENO_CM = 20;    // distancia con el depósito lleno: CÁMBIALA

int leerMM() {                // el sensor manda 4 bytes: 0xFF, alto, bajo, suma
  unsigned long t0 = millis();
  while (millis() - t0 < 1000) {
    if (Sensor.available() >= 4 && Sensor.read() == 0xFF) {
      int h = Sensor.read(), l = Sensor.read(), s = Sensor.read();
      if (((0xFF + h + l) & 0xFF) == s) return h * 256 + l;
    }
  }
  return -1;
}
void setup() {
  inicio("N1");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(500);
  Sensor.begin(9600, SERIAL_8N1, SENSOR_RX, -1);
  af(leerMM() > 0 ? "a02=ok" : "a02=no");
  radioIni();
}
void loop() {
  int mm = leerMM();
  if (mm > 0) {
    float cm = mm / 10.0;
    int pct = constrain((int)round((FONDO_CM - cm) * 100 / (FONDO_CM - LLENO_CM)), 0, 100);
    enviar("N1;id=" + ID + ";cm=" + String(cm, 0) + ";pct=" + String(pct));
  } else af("a02=no");
  af("fin");
  delay(60000);               // una lectura por minuto
}
