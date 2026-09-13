# Módulo de Trámites

Documentación técnica del módulo de solicitud y seguimiento de trámites académicos en **AI Avatar** (TESCHA).

Público objetivo: desarrolladores que mantengan o extiendan este módulo.

> Es un flujo **simulado**, sin conexión al sistema escolar real de TESCHA — no valida matrícula contra una base de datos institucional, ni genera documentos oficiales firmados.

---

## A. Descripción general

Permite a un estudiante:

1. Levantar una solicitud de trámite (constancia de estudios, constancia de no adeudo, reporte de problema, u otro) desde un modal en la UI.
2. Recibir un **folio** único para dar seguimiento.
3. Que el departamento de Control Escolar reciba un correo y resuelva la solicitud con un clic (sin necesidad de entrar a ningún panel).
4. Consultar el estatus con su folio y, una vez resuelta, descargar un **comprobante en PDF**.

---

## B. Flujo completo

```
1. Estudiante llena el formulario en TramitesModal ("Nueva solicitud")
        ↓
2. POST /api/tramites
        ↓
3. createTramite() → INSERT en Postgres (tabla "tramites", estado inicial: "recibido")
        ↓
4. Folio generado (TESCHA-XXXXXXXX) se muestra al estudiante (con botón copiar)
        ↓
5. notifyNuevoTramite() → correo a SENDGRID_TO_EMAIL (Control Escolar)
   enviado desde SENDGRID_FROM_EMAIL, con los datos de la solicitud
   y 3 botones de acción
        ↓
6. Control Escolar da clic en un botón del correo
   → GET /api/tramites/[folio]/accion?estado=X&key=ADMIN_KEY
        ↓
7. updateTramiteEstado() → UPDATE en Postgres (estado + fecha_en_proceso o fecha_resuelto)
        ↓
8. Si el nuevo estado es "completado" o "rechazado":
   notifyEstadoActualizado() → correo al estudiante (tramite.correo),
   enviado desde SENDGRID_FROM_EMAIL
        ↓
9. Estudiante consulta su folio en TramitesModal ("Consultar estatus")
   → GET /api/tramites?folio=X
        ↓
10. Si el estado es "completado" o "rechazado": puede descargar el comprobante
    → GET /api/tramites/[folio]/comprobante (PDF con pdf-lib)
```

---

## C. Modelo de datos

Tabla `tramites` en PostgreSQL (creada/migrada automáticamente por `ensureTramitesTable()` en `db.ts`, con `ADD COLUMN IF NOT EXISTS` para columnas agregadas después — no requiere migraciones manuales).

| Columna | Tipo | Notas |
|---------|------|-------|
| `folio` | `TEXT` | Primary key. Formato `TESCHA-XXXXXXXX` (8 caracteres del primer segmento de un UUID v4, en mayúsculas) |
| `nombre` | `TEXT` | |
| `matricula` | `TEXT` | |
| `carrera` | `TEXT` | Default `''` |
| `semestre` | `INTEGER` | Default `1` |
| `turno` | `TEXT` | Default `'matutino'` (ver `TRAMITE_TURNOS` en `types/tramite.ts`) |
| `correo` | `TEXT` | Default `''`. Correo del estudiante, usado para notificarle el resultado |
| `tipo` | `TEXT` | `constancia_estudios` / `constancia_no_adeudo` / `reporte_problema` / `otro` |
| `descripcion` | `TEXT` | |
| `estado` | `TEXT` | Default `'recibido'` (ver sección D) |
| `created_at` | `TIMESTAMPTZ` | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | Default `now()`, se actualiza en cada cambio de estado |
| `fecha_en_proceso` | `TIMESTAMPTZ` | Nullable. Se llena solo al pasar a `en_proceso` |
| `fecha_resuelto` | `TIMESTAMPTZ` | Nullable. Se llena al pasar a `completado` o `rechazado` |

Conexión: `getPool()` en `db.ts`, vía `DATABASE_URL` (ver sección I sobre cómo se arma esta variable).

---

## D. Estados y transiciones

| Estado | Cuándo se llega | ¿Es final? |
|--------|------------------|------------|
| `recibido` | Al crear el trámite (default) | No |
| `en_proceso` | Control Escolar da clic en "Marcar en proceso" | No |
| `completado` | Control Escolar da clic en "Marcar completado" | **Sí** |
| `rechazado` | Control Escolar da clic en "Rechazar" | **Sí** |

Una vez que un trámite llega a un estado **final** (`completado` o `rechazado`), la ruta `/accion` lo bloquea: cualquier intento posterior de cambiar su estado devuelve `409` con un mensaje de "este trámite ya fue resuelto anteriormente". Esto evita que un mismo enlace de correo (que puede quedar abierto o reenviado) altere un trámite ya cerrado.

---

## E. Rutas de API

| Método | Ruta | Qué hace |
|--------|------|----------|
| `POST` | `/api/tramites` | Crea el trámite. Valida campos obligatorios y que `tipo` sea válido. Dispara `notifyNuevoTramite` (sin esperarlo — `void`). Devuelve `201` + el trámite creado |
| `GET` | `/api/tramites?folio=X` | Consulta un trámite por folio. `404` si no existe |
| `GET` | `/api/tramites/[folio]/accion?estado=X&key=Y` | Cambia el estado (protegido por `ADMIN_KEY`, pensado para abrirse desde el enlace del correo). Devuelve una página HTML de confirmación que se autocierra a los 8s |
| `GET` | `/api/tramites/[folio]/comprobante` | Genera y descarga el PDF del comprobante. Solo si el trámite está `completado` o `rechazado` (si no, `409`) |

---

## F. Notificaciones por correo (SendGrid)

Dos correos distintos, con destinatarios distintos, pero **un solo remitente** para ambos (`SENDGRID_FROM_EMAIL`, ver sección I):

### 1. `notifyNuevoTramite` — al crear el trámite

- **Destinatario:** `SENDGRID_TO_EMAIL` (la bandeja de la persona de Control Escolar que actúa sobre el trámite).
- **Remitente:** `SENDGRID_FROM_EMAIL` (la cuenta verificada como Single Sender en SendGrid — puede ser una persona distinta a quien recibe).
- **Contenido:** todos los datos de la solicitud + 3 botones de acción (en proceso / completado / rechazado), cada uno apuntando a `/api/tramites/[folio]/accion?estado=...&key=${ADMIN_KEY}`.
- Si falta `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_TO_EMAIL` o `ADMIN_KEY`, la función se cancela silenciosamente (con un `console.warn`) — el trámite igual se crea en la base de datos, solo no llega el correo.

### 2. `notifyEstadoActualizado` — al resolver el trámite

- **Destinatario:** `tramite.correo` (el correo que el propio estudiante puso en el formulario).
- **Remitente:** `SENDGRID_FROM_EMAIL`.
- Solo se envía si el nuevo estado es `completado` o `rechazado`.
- El mensaje de resolución cambia según el **tipo** de trámite:
  - Si es `reporte_problema`: mensaje distinto ("fue revisado y atendido" / "no fue posible darle seguimiento"), no menciona recoger documentos.
  - Cualquier otro tipo: mensaje sobre recoger el documento en las oficinas del TESCHA dentro de 2 días hábiles (o volver a solicitarlo si fue rechazado), con el horario de atención de Control Escolar.

Ambos correos desactivan el tracking de SendGrid (clics, aperturas, suscripción) y convierten manualmente los acentos/ñ a entidades HTML antes de enviarlos (`toHtmlEntities`).

> **Nota:** `SENDGRID_FROM_EMAIL` y `SENDGRID_TO_EMAIL` pueden ser la misma dirección (caso simple, una sola persona hace todo) o direcciones distintas (por ejemplo, una cuenta verificada como sender y otra persona distinta que recibe y actúa sobre los trámites). El código no asume que sean iguales.

---

## G. Generación del comprobante PDF

Ruta: `GET /api/tramites/[folio]/comprobante` (`pdf-lib`).

- Solo disponible si `estado` es `completado` o `rechazado` (si no, `409` con mensaje de que aún no está disponible).
- Parte de una plantilla ya membretada: `public/documents/templates/hoja_membretada_tescha.pdf`, y **dibuja texto encima** (no genera el PDF desde cero).
- Campos impresos: tipo de trámite y fecha (arriba), folio (alineado a la derecha), nombre, matrícula, carrera, semestre, turno, correo, fecha de solicitud recibida, fecha en proceso (si existe), fecha de resolución (si existe), estado actual, y la descripción (con salto de línea automático si es larga).
- Se descarga como `comprobante-{folio}.pdf`.

---

## H. Seguridad: `ADMIN_KEY`

**No hay sistema de login** para el personal de Control Escolar. La única protección es que el enlace del correo incluye `key=${ADMIN_KEY}` como parámetro de la URL, y `/accion` rechaza la petición si no coincide con la variable de entorno `ADMIN_KEY` (`401` si falta o no coincide).

Implicaciones a tener en cuenta:

- Quien tenga ese enlace (por ejemplo, si se reenvía el correo, o si alguien más tiene acceso a esa bandeja) puede cambiar el estado del trámite — no hay verificación de identidad de quién da clic.
- Es un `GET`, no un `POST`: técnicamente cualquier cosa que "visite" esa URL (un escáner de enlaces de algunos clientes de correo, por ejemplo) podría disparar la acción, aunque el bloqueo por estado final limita el daño a un solo cambio de estado por trámite.
- No hay expiración de tiempo para el enlace, solo el bloqueo una vez que el trámite llega a estado final.

Esto es razonable para un proyecto de titulación con fines de demostración, pero vale la pena mencionarlo como limitación conocida (y posible mejora futura: autenticación real para el panel de Control Escolar).

---

## I. Variables de entorno

```env
# Postgres
POSTGRES_USER=tescha_admin
POSTGRES_PASSWORD=
POSTGRES_DB=tramites
# En Docker, docker-compose arma DATABASE_URL automáticamente con los 3 de arriba.
# Sin Docker, hay que definir DATABASE_URL a mano en .env.local:
# DATABASE_URL=postgresql://tescha_admin:tu_password@localhost:5432/tramites

# Trámites
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=    # cuenta verificada como Single Sender en SendGrid (envía los correos)
SENDGRID_TO_EMAIL=      # bandeja de la persona de Control Escolar que recibe y actúa (puede ser distinta a SENDGRID_FROM_EMAIL)
ADMIN_KEY=              # protege los enlaces de acción del correo interno
APP_BASE_URL=http://localhost:3000   # usado para construir los enlaces del correo
```

`db.ts` **solo lee `DATABASE_URL`** — no arma la cadena de conexión a partir de `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` por sí mismo. Ese ensamblado lo hace `docker-compose.yml` al inyectar la variable al contenedor de Next.js.

---

## J. Interfaz (`TramitesModal.tsx`)

Modal con dos pestañas:

- **"Nueva solicitud":** formulario (nombre, matrícula, carrera, semestre, turno, correo, tipo, descripción) → `POST /api/tramites`. Al crearse, muestra el folio con botón de copiar, y dos avisos: revisar el correo para novedades, y que la resolución tarda hasta 2 días hábiles.
- **"Consultar estatus":** campo de folio → `GET /api/tramites?folio=X`. Si el trámite está resuelto, muestra el enlace de descarga del comprobante; si no, un mensaje de que estará disponible una vez resuelto.

Al abrir el modal, ambos formularios se reinician (`useEffect` sobre `open`).

---

## K. Limitaciones actuales

- Flujo simulado: no se conecta al sistema escolar real ni valida la matrícula contra una base de datos institucional.
- Sin autenticación real para Control Escolar (ver sección H, `ADMIN_KEY`).
- Cambios de estado vía `GET` en vez de `POST`/`PATCH` (necesario para que funcione como enlace de correo clicable, pero no es REST estricto).
- No hay reintento ni cola si el envío de SendGrid falla: solo se registra el error en consola (`console.error`), el trámite queda creado/actualizado igual.
- El comprobante PDF depende de que exista físicamente `public/documents/templates/hoja_membretada_tescha.pdf`; si falta, la ruta falla.
- Sin paginación ni panel de administración para listar todos los trámites — solo se puede consultar de uno en uno, por folio.
- **El envío de correo depende de un Single Sender Verification en SendGrid asociado a una cuenta de Gmail individual, no de un dominio propio autenticado.** Si Google inhabilita esa cuenta (ya ocurrió una vez), se pierde el envío hasta verificar un nuevo remitente. Mejora futura: autenticar un dominio propio en SendGrid para no depender de la disponibilidad de una cuenta personal.

---

## L. Checklist de pruebas manuales

- [ ] Crear una solicitud nueva con todos los campos → se genera folio y llega el correo a `SENDGRID_TO_EMAIL`
- [ ] Botón "Marcar en proceso" del correo → estado cambia, `fecha_en_proceso` se llena
- [ ] Botón "Marcar completado" → estado cambia, `fecha_resuelto` se llena, llega correo al estudiante
- [ ] Botón "Rechazar" → mismo comportamiento que completado, con mensaje distinto
- [ ] Intentar cambiar el estado de un trámite ya resuelto → `409`, mensaje de "ya fue resuelto"
- [ ] Enlace de acción sin `key` o con `key` incorrecta → `401`
- [ ] Consultar estatus con folio válido antes de resolver → sin enlace de descarga
- [ ] Consultar estatus con folio válido después de resolver → aparece el enlace y el PDF descarga correctamente con todos los datos
- [ ] Intentar descargar el comprobante de un trámite aún no resuelto directamente por URL → `409`
- [ ] Folio inexistente → `404` en consulta y en comprobante
- [ ] Probar con `reporte_problema` para confirmar que el mensaje de resolución es distinto al de constancias
- [ ] Confirmar que `SENDGRID_FROM_EMAIL` está verificado como Single Sender en SendGrid antes de probar en producción

---

## Referencias rápidas

- Base de datos: `src/lib/tramites/db.ts`
- Lógica de negocio: `src/lib/tramites/store.ts`
- Correos: `src/lib/tramites/mailer.ts`
- API: `src/app/api/tramites/route.ts`, `src/app/api/tramites/[folio]/accion/route.ts`, `src/app/api/tramites/[folio]/comprobante/route.ts`
- UI: `src/components/TramitesModal.tsx`
- Tipos: `src/types/tramite.ts`
- Plantilla PDF: `public/documents/templates/hoja_membretada_tescha.pdf`