// N10 · Válvulas y contador del cabezal (máquina de riego antigua) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib (WiFi, HTTPClient y Preferences vienen con la placa)
// Ve qué válvulas abre el programador (8 entradas por optoacoplador: valen 24 V de alterna o de continua) y cuenta los pulsos
// del contador. Avisa al momento cuando abre o cierra cada válvula, cada minuto mientras riega y cada 10 minutos «sigo viva».
// Si en el cabezal hay wifi, se le pasa desde la app por el cable USB como a la pasarela («CFG wifi=…|clave=…|url=…|token=…»)
// y sube directo al servidor puente; sin wifi, manda por radio a la pasarela.
// Mensajes (pm = pulsos del contador desde el mensaje anterior):
//   «N10;id=…;ev=1;c=3;pm=0»                        abre la válvula 3
//   «N10;id=…;ev=2;c=3;dur=482;pul=27.5;pm=4»        cierra la válvula 3: segundos y pulsos de ese riego
//   «N10;id=…;on=3+5;pm=12»                          mientras riega (válvulas abiertas)   ·   «N10;id=…;on=0;pm=0;up=…» sigo viva
#include <RadioLib.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#define PULSOS 41
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
const int VALV[8] = {2, 4, 5, 6, 7, 38, 39, 40};
const unsigned long VIVA_MS = 10UL * 60UL * 1000UL, MARCHA_MS = 60UL * 1000UL;
const unsigned long ABRE_MS = 2000, CIERRA_MS = 3000;   // tiempo seguido para dar por abierta o cerrada una válvula (evita falsos)
const unsigned long PARPADEO_MS = 60;                    // con alterna la entrada se enciende y apaga 50 veces por segundo
Preferences cfg; String WIFI, CLAVE, URL, TOKEN; bool hayRadio = false;
volatile unsigned long cuenta = 0, ultP = 0;
void IRAM_ATTR pulso() { unsigned long t = millis(); if (t - ultP > 30) { cuenta++; ultP = t; } }   // 30 ms antirrebote
unsigned long bajo[8], desde[8], cambio[8], tUlt = 0, pmAnt = 0, repAnt = 0;
bool abierta[8]; float pulR[8];
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
  HTTPClient h; h.setTimeout(8000); h.begin(URL);
  h.addHeader("Content-Type", "application/json"); h.addHeader("Authorization", "Bearer " + TOKEN);
  int c = h.POST(json); h.end();
  return c >= 200 && c < 300;
}
// Con wifi configurada, por wifi (y si falla, a la cola para el siguiente intento); sin wifi, por radio a la pasarela
void mandar(const String& m) {
  af("dato=" + m);
  if (WIFI.length()) {
    String j = "{\"raw\":\"" + m + "\",\"rssi\":" + String(WiFi.RSSI()) + ",\"gw\":\"wifi-" + ID + "\"}";
    if (subir(j)) af("envio=ok wifi"); else { af("envio=wifi_no"); if (nCola < 20) cola[nCola++] = j; }
    return;
  }
  if (!hayRadio) { af("envio=sin_salida"); return; }
  int e = radio.transmit(m);
  af(e == RADIOLIB_ERR_NONE ? String("envio=ok radio") : "envio=err" + String(e));
}
String pm() { noInterrupts(); unsigned long c = cuenta; interrupts(); unsigned long d = c - pmAnt; pmAnt = c; return String(d); }
// Los pulsos de cada momento se reparten entre las válvulas abiertas
void repartir() {
  noInterrupts(); unsigned long c = cuenta; interrupts();
  unsigned long d = c - repAnt; repAnt = c; if (!d) return;
  int n = 0; for (int i = 0; i < 8; i++) if (abierta[i]) n++;
  if (n) for (int i = 0; i < 8; i++) if (abierta[i]) pulR[i] += (float)d / n;
}
String abiertas() { String s = ""; for (int i = 0; i < 8; i++) if (abierta[i]) { if (s.length()) s += "+"; s += String(i + 1); } return s.length() ? s : "0"; }
void mirarValvulas() {
  unsigned long t = millis();
  for (int i = 0; i < 8; i++) if (digitalRead(VALV[i]) == LOW) bajo[i] = t;
  repartir();
  for (int i = 0; i < 8; i++) {
    bool ve = bajo[i] && t - bajo[i] < PARPADEO_MS;
    if (ve == abierta[i]) { cambio[i] = 0; continue; }
    if (!cambio[i]) cambio[i] = t;
    if (t - cambio[i] < (ve ? ABRE_MS : CIERRA_MS)) continue;
    cambio[i] = 0; abierta[i] = ve; tUlt = millis();
    if (ve) { desde[i] = t - ABRE_MS; pulR[i] = 0; mandar("N10;id=" + ID + ";ev=1;c=" + String(i + 1) + ";pm=" + pm()); }
    else { unsigned long dur = (t - CIERRA_MS - desde[i]) / 1000;
      mandar("N10;id=" + ID + ";ev=2;c=" + String(i + 1) + ";dur=" + String(dur) + ";pul=" + String(pulR[i], 1) + ";pm=" + pm()); }
  }
}
void setup() {
  inicio("N10");
  leerCfg();
  for (int i = 0; i < 8; i++) { pinMode(VALV[i], INPUT_PULLUP); bajo[i] = 0; desde[i] = 0; cambio[i] = 0; abierta[i] = false; pulR[i] = 0; }
  pinMode(PULSOS, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PULSOS), pulso, FALLING);
  hayRadio = radioIni();
  unsigned long t0 = millis(); while (millis() - t0 < 300) { unsigned long t = millis(); for (int i = 0; i < 8; i++) if (digitalRead(VALV[i]) == LOW) bajo[i] = t; delay(2); }
  String ab = ""; for (int i = 0; i < 8; i++) if (bajo[i]) { if (ab.length()) ab += "+"; ab += String(i + 1); }
  af(ab.length() ? "valvulas=ok con corriente ahora: " + ab : String("valvulas=ok todas cerradas"));
  for (int i = 0; i < 8; i++) bajo[i] = 0;
  af("pulsos=listo");
  af(WIFI.length() ? String(conectar() ? "wifi=ok" : "wifi=no") : String("wifi=sin_configurar (manda por radio)"));
  mandar("N10;id=" + ID + ";on=0;pm=0;up=0");
  tUlt = millis();
  af("fin");
}
void loop() {
  mirarSerie();
  mirarValvulas();
  static unsigned long visto = 0; noInterrupts(); unsigned long c = cuenta; interrupts();
  if (c != visto) { visto = c; af("pulso=" + String(c)); }   // en la mesa: cada pulso suma 1
  bool riega = false; for (int i = 0; i < 8; i++) riega = riega || abierta[i];
  if (millis() - tUlt >= (riega ? MARCHA_MS : VIVA_MS)) {
    tUlt = millis();
    mandar("N10;id=" + ID + ";on=" + abiertas() + ";pm=" + pm() + (riega ? String("") : ";up=" + String(millis() / 60000)));
    if (!riega && nCola) { int q = 0; for (int i = 0; i < nCola; i++) if (!subir(cola[i])) cola[q++] = cola[i]; nCola = q; }
  }
  delay(4);
}
