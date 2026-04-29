# Load Specification: 7 Transporter Records
**Source:** `design/hulubul_registru_transportatori_ro.xlsx` — sheet "Registru Transportatori v1"  
**Target API:** `https://steadfast-bell-433fdd1ac5.strapiapp.com/api`  
**Date:** 2026-04-29 — **STATUS: EXECUTED ✓**

> All 24 calls completed. This file reflects the exact payloads that were sent and the documentIds returned. Use these IDs for future updates or relations.

---

## Lessons Learned During Execution

| Issue | Fix applied |
|---|---|
| Local Moldova phone numbers (`069xxxxxx`) rejected — backend requires `+` or `00` prefix | Prefixed with `+373` |
| Route-schedule relations: `{ "documentId": "..." }` format rejected with "Invalid key documentId" | Use plain documentId string: `"route": "docId"` |
| `"daily"` rejected by Strapi backend enum (not configured in Content-Type Builder) | Stored as `"on_demand"` with note — **must update backend enum then `PUT` S-06** |

---

## Loaded documentIds — Quick Reference

| Alias | Entity | documentId |
|---|---|---|
| TT-pasageri | transport-type | `ktu8mb1ofmwzck0hsag2kqdf` |
| TT-colete | transport-type | `yu8z8srffvoe0emmqzmiqgg9` |
| TT-livrare-domiciliu | transport-type | `s0g5gsf6gmhd9p65z9jrn8ev` |
| TT-transport-frigorific | transport-type | `xnvgx75n9z18en44rlf3swgq` |
| TR-001 | transporter | `qb161e0fef1po0vm97qpiftu` |
| TR-002 | transporter | `kir3li2ya5yzvao309txyzi2` |
| TR-003 | transporter | `itwcqq1wwh5iozko9qyqmnf1` |
| TR-004 | transporter | `z6pv79vavscxrz98pw9nkxz1` |
| TR-005 | transporter | `nv7zuyfevxz3a0ps0vnlysgd` |
| TR-006 | transporter | `t2z963g0p1uq3ei6bk3528vx` |
| TR-007 | transporter | `tcn1dycyaq1oubzu1worb8ks` |
| R-01 | route | `yxg33sam0bq3m0f7dszsfxhm` |
| R-02 | route | `jul1auxw2nnbbyaz3264qd83` |
| R-03 | route | `w7qt32chllonqsd5fdaez5gd` |
| R-04 | route | `koyx6dci19hmfjbhy2ona30z` |
| S-01 | route-schedule | `og64owtoyu868wso8trypd12` |
| S-02a | route-schedule | `bzzhkaew87idlwq69p41oiqv` |
| S-02b | route-schedule | `yj9hxtw8xkwge0qdo5pzsyu0` |
| S-03 | route-schedule | `jdm93yrjaivp57em8hqudyuw` |
| S-04 | route-schedule | `iihnaggrphxsebk48txsa3v6` |
| S-05a | route-schedule | `fchgz3pvlmg4fssq21dz66wr` |
| S-05b | route-schedule | `jllyp6v3k5ksckioa24fujjf` |
| S-06 | route-schedule | `he5fstpnbi8anifuk7bf1lja` |
| S-07 | route-schedule | `j1t9p8rnpavn5wxfhtqbfqvy` |

---

## Step 0 — Transport Types ✓

### 0-A  pasageri → `ktu8mb1ofmwzck0hsag2kqdf`
```http
POST /api/transport-types
Authorization: Bearer {STRAPI_API_TOKEN}

{
  "data": {
    "label": "Transport Pasageri",
    "slug": "pasageri",
    "description": "Transport de persoane între destinații internaționale."
  }
}
```

### 0-B  colete → `yu8z8srffvoe0emmqzmiqgg9`
```http
POST /api/transport-types
{
  "data": {
    "label": "Transport Colete",
    "slug": "colete",
    "description": "Transport de colete și pachete între destinații internaționale."
  }
}
```

### 0-C  livrare-domiciliu → `s0g5gsf6gmhd9p65z9jrn8ev`
```http
POST /api/transport-types
{
  "data": {
    "label": "Livrare la Domiciliu",
    "slug": "livrare-domiciliu",
    "description": "Colectare de la expeditor și livrare la adresa destinatarului."
  }
}
```

### 0-D  transport-frigorific → `xnvgx75n9z18en44rlf3swgq`
```http
POST /api/transport-types
{
  "data": {
    "label": "Transport Frigorific",
    "slug": "transport-frigorific",
    "description": "Transport cu vehicule dotate cu frigider și congelator — pentru alimente și medicamente."
  }
}
```

---

## Step 1 — Transporters ✓

> Relations use `{ "connect": [{ "documentId": "..." }] }` — works for many-to-many (transportTypes).  
> Single relations on route-schedules use plain string — see Step 3.

### TR-001 → `qb161e0fef1po0vm97qpiftu`
```json
{
  "data": {
    "name": "Operator Moldova–Germania (neidentificat TR-001)",
    "type": "individual",
    "phoneNumbers": ["+37379396463", "+40748413126"],
    "transportTypes": {
      "connect": [
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" },
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "s0g5gsf6gmhd9p65z9jrn8ev" }
      ]
    },
    "notes": "Brandul nu este identificat. Postat în grupul «Moldovenii din Toată Germania». Ambele numere WhatsApp+Viber. Necesită confirmare nume operator și program exact.",
    "status": "draft"
  }
}
```

### TR-002 → `kir3li2ya5yzvao309txyzi2`
> Office phones prefixed `+373` (backend rejects bare local format).
```json
{
  "data": {
    "name": "373 Fratelli Tour",
    "type": "company",
    "phoneNumbers": [
      "+37369407204", "+37360090501", "+37379121921",
      "+393801884880", "+393287593528", "+393898441558",
      "+37369190440", "+37369101069", "+37369588242"
    ],
    "transportTypes": {
      "connect": [
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" },
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "s0g5gsf6gmhd9p65z9jrn8ev" }
      ]
    },
    "notes": "Oficii colectare Moldova: (1) Ciocana — str. Maria Drăgan 1, tel. +37369190440, mar/mier 09:00–18:00; (2) Botanica — str. Sarmizegetusa 31, tel. +37369101069, mar/mier 09:00–18:00; (3) Cimișlia — str. Suveranității 10A, tel. +37369588242. Lista orașe Italia și numere necesită curățare manuală.",
    "status": "draft"
  }
}
```

### TR-003 → `itwcqq1wwh5iozko9qyqmnf1`
```json
{
  "data": {
    "name": "Operator Moldova–Irlanda (neidentificat TR-003)",
    "type": "individual",
    "phoneNumbers": ["+37360669151", "+353894114090"],
    "transportTypes": {
      "connect": [
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "s0g5gsf6gmhd9p65z9jrn8ev" },
        { "documentId": "xnvgx75n9z18en44rlf3swgq" }
      ]
    },
    "notes": "Vehicule dotate cu frigider și congelator. Acoperire toată Moldova la livrare. Brandul și orașele din Irlanda nu sunt specificate — necesită confirmare. Ambele numere WhatsApp.",
    "status": "draft"
  }
}
```

### TR-004 → `z6pv79vavscxrz98pw9nkxz1`
```json
{
  "data": {
    "name": "Operator Moldova–Anglia (neidentificat TR-004)",
    "type": "individual",
    "phoneNumbers": [
      "+37369050509", "+37369179837", "+37360305160", "+40756887666",
      "+37369393099", "+37369346330", "+37369848813", "+37369277669"
    ],
    "transportTypes": {
      "connect": [
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" },
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" }
      ]
    },
    "notes": "Distribuire Moldova: rute marți și miercuri pe regiuni (Strășeni, Lozova, Nisporeni, Călărași, Fălești, Ungheni, Bălți și alte 25+ localități). Viber activ pe mai multe numere. Posibil duplicat de coridor cu TR-006 și TR-007.",
    "status": "draft"
  }
}
```

### TR-005 → `nv7zuyfevxz3a0ps0vnlysgd`
```json
{
  "data": {
    "name": "Grigore Danu Transport",
    "type": "individual",
    "phoneNumbers": ["+393894311807", "+393277870983", "+37360135108"],
    "transportTypes": {
      "connect": [
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" },
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "s0g5gsf6gmhd9p65z9jrn8ev" }
      ]
    },
    "notes": "Oficiu Chișinău: str. Independenței 40, tel. +37360135108. Flyer menționează Gregore Danu, postare menționează Grigore Danu — necesită confirmare. Posibil duplicat de coridor cu TR-002 (Italia).",
    "status": "draft"
  }
}
```

### TR-006 → `t2z963g0p1uq3ei6bk3528vx`
> Office phones prefixed `+373`.
```json
{
  "data": {
    "name": "M&D TUR",
    "type": "company",
    "phoneNumbers": [
      "+37369343666", "+37360518944",
      "+447447942233", "+447512052770",
      "+37368710000"
    ],
    "transportTypes": {
      "connect": [
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" }
      ]
    },
    "notes": "Oficiu Chișinău: str. Liviu Deleanu 76. Serviciu declarat ca zilnic — necesită confirmare program exact. +37368710000 parțial vizibil în sursă. Posibil duplicat de coridor cu TR-004 și TR-007.",
    "status": "draft"
  }
}
```

### TR-007 → `tcn1dycyaq1oubzu1worb8ks`
```json
{
  "data": {
    "name": "BFD477 Transport Moldova–Londra",
    "type": "individual",
    "phoneNumbers": [
      "+37360166956", "+37369707879", "+37360166122", "+37369207579",
      "+447378378140", "+447946075810"
    ],
    "transportTypes": {
      "connect": [
        { "documentId": "ktu8mb1ofmwzck0hsag2kqdf" },
        { "documentId": "yu8z8srffvoe0emmqzmiqgg9" },
        { "documentId": "s0g5gsf6gmhd9p65z9jrn8ev" }
      ]
    },
    "notes": "Oficii Chișinău: (1) Centru — posibil str. A. Pușkin 22 / Casa Presei (necesită confirmare); (2) Botanica — str. Sarmizegetusa 31. Colectare/livrare gratuită în Chișinău până la 15 kg. Posibil duplicat de coridor cu TR-004 și TR-006.",
    "status": "draft"
  }
}
```

---

## Step 2 — Routes ✓

> GeoJson coordinates are approximate centroids — replace with geocoded waypoints before publishing.  
> Reference: Chișinău `[28.8638, 47.0105]` · Berlin `[13.4050, 52.5200]` · Roma `[12.4964, 41.9028]` · Dublin `[-6.2672, 53.3331]` · London `[-0.1278, 51.5074]`

### R-01 Moldova–Germania → `yxg33sam0bq3m0f7dszsfxhm`
```json
{
  "data": {
    "name": "Moldova–Germania",
    "citiesText": "Chișinău (MD) → România → Ungaria → Cehia → Austria → Germania",
    "geoJson": {
      "type": "LineString",
      "coordinates": [[28.8638,47.0105],[26.1025,44.4268],[19.0402,47.4979],[14.4208,50.0880],[14.5501,47.8095],[13.4050,52.5200]]
    },
    "status": "draft"
  }
}
```

### R-02 Moldova–Italia → `jul1auxw2nnbbyaz3264qd83`
> Serves TR-002 (acoperire extinsă) and TR-005 (zona Milano-Monza) via separate schedules.
```json
{
  "data": {
    "name": "Moldova–Italia",
    "citiesText": "Chișinău (MD) → România → Ungaria → Slovenia → Italia (Milano, Torino, Genova, Venezia, Roma, Bologna, Rimini, Brescia, Bergamo, Verona, Padova, Vicenza și alte orașe)",
    "geoJson": {
      "type": "LineString",
      "coordinates": [[28.8638,47.0105],[26.1025,44.4268],[19.0402,47.4979],[14.5058,46.0569],[12.4964,41.9028]]
    },
    "status": "draft"
  }
}
```

### R-03 Moldova–Irlanda → `w7qt32chllonqsd5fdaez5gd`
```json
{
  "data": {
    "name": "Moldova–Irlanda",
    "citiesText": "Chișinău (MD) → toată Republica Moldova → Irlanda (orașe neconfirmate)",
    "geoJson": {
      "type": "LineString",
      "coordinates": [[28.8638,47.0105],[-6.2672,53.3331]]
    },
    "status": "draft"
  }
}
```

### R-04 Moldova–Anglia → `koyx6dci19hmfjbhy2ona30z`
> Serves TR-004, TR-006, TR-007 via separate schedules.
```json
{
  "data": {
    "name": "Moldova–Anglia",
    "citiesText": "Chișinău (MD) → România → Europa Centrală → Londra, Luton, Birmingham, Manchester, Leicester, Nottingham, Sheffield, Northampton, Oxford, Corby, Peterborough, Leeds, Liverpool, Reading și alte orașe UK",
    "geoJson": {
      "type": "LineString",
      "coordinates": [[28.8638,47.0105],[26.1025,44.4268],[16.3738,48.2082],[2.3522,48.8566],[-0.1278,51.5074]]
    },
    "status": "draft"
  }
}
```

---

## Step 3 — Route Schedules ✓

> **Relation format for single relations:** plain documentId string — e.g. `"route": "yxg33sam0bq3m0f7dszsfxhm"`.  
> The `{ "documentId": "..." }` object format is rejected by Strapi for single relations.

### S-01 TR-001 on R-01 (Moldova → Germania) → `og64owtoyu868wso8trypd12`
```json
{
  "data": {
    "route": "yxg33sam0bq3m0f7dszsfxhm",
    "transporter": "qb161e0fef1po0vm97qpiftu",
    "frequency": "weekly",
    "departureDays": ["wed"],
    "arrivalDays": [],
    "notes": "Plecare anunțată miercuri. Preluare de acasă și livrare la adresă. Program exact necesită confirmare.",
    "status": "draft"
  }
}
```

### S-02a TR-002 on R-02 (Moldova → Italia) → `bzzhkaew87idlwq69p41oiqv`
```json
{
  "data": {
    "route": "jul1auxw2nnbbyaz3264qd83",
    "transporter": "kir3li2ya5yzvao309txyzi2",
    "frequency": "weekly",
    "departureDays": ["thu"],
    "arrivalDays": [],
    "notes": "Direcție Moldova → Italia. Colectare în oficiile din Moldova marți/miercuri 09:00–16:00 înainte de cursă.",
    "status": "draft"
  }
}
```

### S-02b TR-002 on R-02 (Italia → Moldova) → `yj9hxtw8xkwge0qdo5pzsyu0`
```json
{
  "data": {
    "route": "jul1auxw2nnbbyaz3264qd83",
    "transporter": "kir3li2ya5yzvao309txyzi2",
    "frequency": "weekly",
    "departureDays": ["sat", "sun"],
    "arrivalDays": [],
    "notes": "Direcție Italia → Moldova. Plecare sâmbătă sau duminică conform flyer — zi exactă necesită confirmare.",
    "status": "draft"
  }
}
```

### S-03 TR-003 on R-03 (Moldova ↔ Irlanda) → `jdm93yrjaivp57em8hqudyuw`
```json
{
  "data": {
    "route": "w7qt32chllonqsd5fdaez5gd",
    "transporter": "itwcqq1wwh5iozko9qyqmnf1",
    "frequency": "weekly",
    "departureDays": [],
    "arrivalDays": [],
    "notes": "Serviciu săptămânal confirmat în sursă. Ziua de plecare și direcția exactă necesită confirmare. Vehicule cu frigider+congelator.",
    "status": "draft"
  }
}
```

### S-04 TR-004 on R-04 (Moldova ↔ Anglia) → `iihnaggrphxsebk48txsa3v6`
```json
{
  "data": {
    "route": "koyx6dci19hmfjbhy2ona30z",
    "transporter": "z6pv79vavscxrz98pw9nkxz1",
    "frequency": "weekly",
    "departureDays": ["tue", "wed"],
    "arrivalDays": [],
    "notes": "Marți și miercuri: distribuire colete în Moldova pe rute regionale. Ziua de plecare spre Anglia și programul complet necesită confirmare manuală.",
    "status": "draft"
  }
}
```

### S-05a TR-005 on R-02 (Moldova → Italia) → `fchgz3pvlmg4fssq21dz66wr`
```json
{
  "data": {
    "route": "jul1auxw2nnbbyaz3264qd83",
    "transporter": "nv7zuyfevxz3a0ps0vnlysgd",
    "frequency": "weekly",
    "departureDays": ["wed"],
    "arrivalDays": [],
    "notes": "Direcție Moldova → Italia. Plecare din Chișinău (str. Independenței 40) miercuri 06:00. Destinații: Milano, Monza, Padova, Verona, Brescia, Bergamo.",
    "status": "draft"
  }
}
```

### S-05b TR-005 on R-02 (Italia → Moldova) → `jllyp6v3k5ksckioa24fujjf`
```json
{
  "data": {
    "route": "jul1auxw2nnbbyaz3264qd83",
    "transporter": "nv7zuyfevxz3a0ps0vnlysgd",
    "frequency": "weekly",
    "departureDays": ["sat"],
    "arrivalDays": [],
    "notes": "Direcție Italia → Moldova. Plecare sâmbătă 20:00 din Italia.",
    "status": "draft"
  }
}
```

### S-06 TR-006 on R-04 (Moldova ↔ Anglia) → `he5fstpnbi8anifuk7bf1lja`
> ⚠️ Stored as `on_demand` — Strapi backend enum does not include `daily`. After adding `daily` to the Content-Type Builder, run:
> `PUT /api/route-schedules/he5fstpnbi8anifuk7bf1lja` with `{ "data": { "frequency": "daily" } }`
```json
{
  "data": {
    "route": "koyx6dci19hmfjbhy2ona30z",
    "transporter": "t2z963g0p1uq3ei6bk3528vx",
    "frequency": "on_demand",
    "departureDays": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    "arrivalDays": [],
    "notes": "Serviciu declarat ca ZILNIC în sursă. Plecare din str. Liviu Deleanu 76, Chișinău. Setat ca on_demand temporar — actualizează la daily după ce backend-ul Strapi adaugă valoarea în enum.",
    "status": "draft"
  }
}
```

### S-07 TR-007 on R-04 (Moldova ↔ Anglia) → `j1t9p8rnpavn5wxfhtqbfqvy`
```json
{
  "data": {
    "route": "koyx6dci19hmfjbhy2ona30z",
    "transporter": "tcn1dycyaq1oubzu1worb8ks",
    "frequency": "weekly",
    "departureDays": ["wed", "sun"],
    "arrivalDays": [],
    "notes": "Miercuri: plecare Moldova → Anglia. Duminică: plecare Anglia → Moldova. Oficii Chișinău: Centru (str. A. Pușkin 22 / Casa Presei — necesită verificare) și Botanica (str. Sarmizegetusa 31). Colectare/livrare gratuită Chișinău până la 15 kg.",
    "status": "draft"
  }
}
```

---

## Known Issues to Resolve Before Publishing

| Record | Issue |
|---|---|
| TR-001 | Brand/operator name unconfirmed |
| TR-002 | City list for Italia very long and partially unreadable from source |
| TR-003 | Irish cities and direction unconfirmed |
| TR-004 | Operator name unknown; likely duplicate corridor with TR-006 + TR-007 |
| TR-005 | Name discrepancy Grigore vs Gregore Danu; likely duplicate corridor with TR-002 |
| TR-006 / S-06 | `frequency` stored as `on_demand` — add `daily` to Strapi enum, then `PUT` S-06 |
| TR-007 | Brand name uncertain (BFD477 from footer); Centru office address needs verification |
| All | `departureDays` conflates both directions on one schedule — consider adding `direction` field to RouteSchedule schema |
| All | GeoJson coordinates are centroid approximations — geocode real waypoints before approval |
