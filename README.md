# Tracke Sharp 2.0 — backend sanitation

## Principios
- MLB y NFL son motores independientes a nivel de negocio.
- Las fuentes solo recolectan/normalizan; el motor decide.
- No se inventan porcentajes ni se usan fallbacks falsos.
- Sin evidencia pública por lado, no existe señal SHARP.
- Matching de equipos por identidad/tokens, no por última palabra.
- Pinnacle es referencia de mercado; VSiN es fuente primaria de splits; Action Network es confirmación.
- `SHARP_FLOW` exige una confirmación independiente del split principal: una segunda fuente de splits que coincida o movimiento de Pinnacle hacia el lado. Con una sola fuente y sin movimiento, el máximo es `SHARP_WATCH`.

## Variables
- `ODDS_API_KEY` — obligatorio.
- `VSIN_MLB_DATA_URL` o `VSIN_DATA_URL` — endpoint JSON normalizado de VSiN.
- `VSIN_NFL_DATA_URL` o `VSIN_DATA_URL` — endpoint JSON normalizado de VSiN.
- `ACTION_NETWORK_MLB_URL` / `ACTION_NETWORK_NFL_URL` — opcionales para fijar endpoints.
- `CRON_SECRET` — protege `/api/sharp-daily`, `/api/sharp-snapshot` y `/api/source-*`. El mismo valor va como secret `CRON_SECRET` del repo en GitHub.
- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — almacenamiento de snapshots (solo servidor; nunca con prefijo `NEXT_PUBLIC_`). Sin ellas el motor funciona sin movimiento de línea.

## Movimiento de línea
`.github/workflows/odds-snapshots.yml` llama a `/api/sharp-snapshot` cada 3 horas (2 requests de The Odds API por ejecución, ~16 al día), que guarda las líneas de Pinnacle en `public.odds_snapshots`. El motor compara la línea actual con la primera observada (`public.odds_openers`): en spread cuenta menos puntos para el lado; a igual línea, una subida de probabilidad implícita de al menos 1 punto. El esquema está en `supabase/migrations/`.

## Estado de Action Network
Se lee el scoreboard v2 (`/web/v2/scoreboard/{mlb|nfl}?bookIds=15&periods=event`), sin login. Tickets y money salen de `bet_info` del book 15 (consenso): moneyline para MLB, spread para NFL. Los fixtures de `tests/fixtures/` están recortados de respuestas reales.

## Endpoints protegidos
`/api/sharp-daily` y `/api/source-*` exigen `Authorization: Bearer <CRON_SECRET>`. `/api/sharp-mlb` y `/api/sharp-nfl` son públicos y se cachean 5 minutos en el CDN.

## Estado de VSiN
El adaptador está preparado, pero el proyecto NO inventa un endpoint de VSiN. Hay que conectar aquí el endpoint/flujo real que podamos verificar y mantener. Mientras no exista, VSiN queda `available:false` y el sistema no fabrica datos.

## Limpieza
Se eliminaron los tres cerebros duplicados, el endpoint combinado, la generación aleatoria de público y los fallbacks 80/55.
