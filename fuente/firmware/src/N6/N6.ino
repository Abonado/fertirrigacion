// N6 · Contador de pulsos (drenaje, agua o viento) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
// Cuenta los pulsos todo el rato y manda la suma cada 10 minutos.
#include <RadioLib.h>
#define PULSOS 2
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
const float POR_PULSO = 5.0;       // CALIBRA: ml por vuelco, litros por pulso o km/h por pulso/s
const unsigned long CADA_MS = 10UL * 60UL * 1000UL;
volatile unsigned long cuenta = 0, ultimo = 0;
void IRAM_ATTR pulso() { unsigned long t = millis(); if (t - ultimo > 30) { cuenta++; ultimo = t; } }   // 30 ms antirrebote

void setup() {
  inicio("N6");
  pinMode(PULSOS, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PULSOS), pulso, FALLING);
  af("pulsos=listo"); af("bat=" + String(batV(), 2));
  radioIni();
  af("fin");
}
void loop() {
  static unsigned long t0 = millis(), visto = 0;
  if (cuenta != visto) { visto = cuenta; af("pulso=" + String(visto)); }   // en la mesa: cada vuelco suma 1
  if (millis() - t0 >= CADA_MS) {
    t0 = millis();
    noInterrupts(); unsigned long n = cuenta; cuenta = 0; visto = 0; interrupts();
    enviar("N6;id=" + ID + ";pul=" + String(n) + ";valor=" + String(n * POR_PULSO, 1) + ";bat=" + String(batV(), 2));
    radio.sleep();
  }
  delay(50);
}
