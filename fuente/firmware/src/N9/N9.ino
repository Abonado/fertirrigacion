// N9 · Consumo de la bomba (pinza SCT-013-030) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define PINZA 5
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
void enviar(const String& m) {
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
const float AMP_POR_VOLTIO = 30.0;   // SCT-013-030: 30 A dan 1 V
const float UMBRAL_A = 1.0;          // por encima, la bomba está funcionando (CAMBIA tras mirar los valores)

float amperios() {                   // valor eficaz de unas 10 ondas de 50 Hz
  const int N = 2000; static float v[N]; long suma = 0;
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINZA); suma += v[i]; delayMicroseconds(100); }
  float media = suma / (float)N, cuad = 0;
  for (int i = 0; i < N; i++) { float d = v[i] - media; cuad += d * d; }
  af("media_mv=" + String(media, 0));   // con la placa de polarización debe salir cerca de 1650
  return sqrt(cuad / N) / 1000.0 * AMP_POR_VOLTIO;
}
void setup() {
  inicio("N9");
  float a = amperios();
  af("pinza=ok"); af("amp=" + String(a, 1));
  radioIni();
}
void loop() {
  float a = amperios();
  enviar("N9;id=" + ID + ";amp=" + String(a, 1) + ";marcha=" + String(a > UMBRAL_A ? 1 : 0));
  radio.sleep();
  af("fin");
  delay(60000);
}
