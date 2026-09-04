# Tracke Sharp 2.0 — backend sanitation

## Principios
- MLB y NFL son motores independientes a nivel de negocio.
- Las fuentes solo recolectan/normalizan; el motor decide.
- No se inventan porcentajes ni se usan fallbacks falsos.
- Sin evidencia pública por lado, no existe señal SHARP.
- Matching de equipos por identidad/tokens, no por última palabra.
- Pinnacle es referencia de mercado; VSiN es fuente primaria de splits; Action Network es confirmación.

## Variables
- `ODDS_API_KEY` — obligatorio.
- `VSIN_MLB_DATA_URL` o `VSIN_DATA_URL` — endpoint JSON normalizado de VSiN.
- `VSIN_NFL_DATA_URL` o `VSIN_DATA_URL` — endpoint JSON normalizado de VSiN.
- `ACTION_NETWORK_MLB_URL` / `ACTION_NETWORK_NFL_URL` — opcionales para fijar endpoints.
- `CRON_SECRET` — recomendado para proteger ejecuciones programadas.

## Estado de VSiN
El adaptador está preparado, pero el proyecto NO inventa un endpoint de VSiN. Hay que conectar aquí el endpoint/flujo real que podamos verificar y mantener. Mientras no exista, VSiN queda `available:false` y el sistema no fabrica datos.

## Limpieza
Se eliminaron los tres cerebros duplicados, el endpoint combinado, la generación aleatoria de público y los fallbacks 80/55.
