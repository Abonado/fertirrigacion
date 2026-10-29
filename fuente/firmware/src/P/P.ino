// P · Pasarela casera (LoRa → wifi → servidor puente) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib (WiFi, HTTPClient y Preferences vienen con la placa)
// La wifi, la dirección del servidor y la clave se le pasan desde la app por el cable USB (Taller → Comprobar en la mesa):
// la app manda «CFG wifi=…|clave=…|url=…|token=…» y la placa lo guarda y se reinicia.
#include <RadioLib.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
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
Preferences cfg; String WIFI, CLAVE, URL, TOKEN;
volatile bool llega = false;
void IRAM_ATTR alRecibir() { llega = true; }
String cola[20]; int nCola = 0;

void leerCfg() {
  cfg.begin("af", true);
  WIFI = cfg.getString("wifi", ""); CLAVE = cfg.getString("clave", ""); URL = cfg.getString("url", ""); TOKEN = cfg.getString("token", "");
  cfg.end();
}
void mirarSerie() {
  if (!Serial.available()) return;
  String l = Serial.readStringUntil('\n'); l.trim();
  if (!l.startsWith("CFG ")) return;
  l = l.substring(4);
  cfg.begin("af", false);
  while (l.length()) {
    int p = l.indexOf('|'); String kv = p < 0 ? l : l.substring(0, p); l = p < 0 ? "" : l.substring(p + 1);
    int e = kv.indexOf('='); if (e > 0) cfg.putString(kv.substring(0, e).c_str(), kv.substring(e + 1));
  }
  cfg.end();
  af("cfg=ok"); delay(300); ESP.restart();
}
bool conectar() {
  if (WiFi.status() == WL_CONNECTED) return true;
  if (!WIFI.length()) return false;
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI.c_str(), CLAVE.c_str());
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); mirarSerie(); }
  return WiFi.status() == WL_CONNECTED;
}
bool subir(const String& json) {
  if (!URL.length() || !conectar()) return false;
  HTTPClient h; h.begin(URL);
  h.addHeader("Content-Type", "application/json"); h.addHeader("Authorization", "Bearer " + TOKEN);
  int c = h.POST(json); h.end();
  return c >= 200 && c < 300;
}
void setup() {
  inicio("P");
  leerCfg();
  af(WIFI.length() ? "wifi_cfg=ok" : "wifi_cfg=falta");
  af(conectar() ? "wifi=ok" : "wifi=no");
  af(URL.length() ? "url=ok" : "url=falta");
  if (radioIni()) { radio.setPacketReceivedAction(alRecibir); radio.startReceive(); }
  af("fin");
}
void loop() {
  mirarSerie();
  if (llega) {
    llega = false;
    String m; int e = radio.readData(m);
    if (e == RADIOLIB_ERR_NONE) {
      String j = "{\"raw\":\"" + m + "\",\"rssi\":" + String(radio.getRSSI(), 0) + ",\"snr\":" + String(radio.getSNR(), 1) + ",\"gw\":\"" + ID + "\"}";
      af("recibido=" + m);
      if (!subir(j) && nCola < 20) cola[nCola++] = j;
    }
    radio.startReceive();
  }
  static unsigned long t0 = 0;
  if (millis() - t0 > 600000UL) {   // cada 10 minutos: «sigo viva» y lo que no se pudo subir
    t0 = millis();
    subir("{\"raw\":\"P;id=" + ID + ";up=" + String(millis() / 60000) + "\",\"gw\":\"" + ID + "\"}");
    int q = 0; for (int i = 0; i < nCola; i++) if (!subir(cola[i])) cola[q++] = cola[i];
    nCola = q;
  }
}
