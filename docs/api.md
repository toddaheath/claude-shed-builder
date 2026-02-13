# API Reference

Base URL: `/api`

All endpoints return JSON with `camelCase` property names. Enum values are serialized as strings (e.g., `"Gable"`, `"LeanTo"`).

## Designs

### List Designs

```
GET /api/designs
```

Returns all designs ordered by most recently updated.

**Response:** `200 OK`
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Backyard Shed",
    "widthFeet": 10,
    "widthInches": 0,
    "depthFeet": 12,
    "depthInches": 6,
    "heightFeet": 8,
    "heightInches": 0,
    "roofPitch": 4.0,
    "roofType": "Gable",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T14:20:00Z"
  }
]
```

### Get Design

```
GET /api/designs/{id}
```

**Response:** `200 OK` — Single design object (same shape as list item).

**Error:** `404 Not Found` — Design does not exist.

### Create Design

```
POST /api/designs
```

**Request Body:**
```json
{
  "name": "Garden Shed",
  "widthFeet": 8,
  "widthInches": 0,
  "depthFeet": 10,
  "depthInches": 0,
  "heightFeet": 8,
  "heightInches": 0,
  "roofPitch": 4.0,
  "roofType": "Gable"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | — | Design name (max 200 chars) |
| widthFeet | int | No | 8 | Width in feet |
| widthInches | int | No | 0 | Additional width inches (0-11) |
| depthFeet | int | No | 10 | Depth in feet |
| depthInches | int | No | 0 | Additional depth inches (0-11) |
| heightFeet | int | No | 8 | Wall height in feet |
| heightInches | int | No | 0 | Additional height inches (0-11) |
| roofPitch | decimal | No | 4.0 | Roof pitch (rise per 12" run) |
| roofType | string | No | "Gable" | `"Gable"` or `"LeanTo"` |

**Response:** `201 Created` — Returns the created design with `id`, `createdAt`, and `updatedAt`.

**Error:** `400 Bad Request` — Validation failure (missing name, name too long).

### Update Design

```
PUT /api/designs/{id}
```

Partial update — only include fields you want to change.

**Request Body:**
```json
{
  "widthFeet": 12,
  "roofType": "LeanTo"
}
```

All fields are optional. Only provided fields are updated.

**Response:** `200 OK` — Returns the full updated design.

**Error:** `404 Not Found` — Design does not exist.

### Delete Design

```
DELETE /api/designs/{id}
```

**Response:** `204 No Content`

**Error:** `404 Not Found` — Design does not exist.

## Bill of Materials

### Get BOM

```
GET /api/designs/{id}/bom
```

Calculates a bill of materials based on the design's current dimensions.

**Response:** `200 OK`
```json
{
  "designId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "items": [
    {
      "material": "Pressure-treated lumber",
      "dimensions": "2×6 × 10'",
      "quantity": 10,
      "unit": "pieces",
      "category": "Floor"
    },
    {
      "material": "Framing lumber",
      "dimensions": "2×4 × 8'",
      "quantity": 36,
      "unit": "pieces",
      "category": "Walls"
    }
  ]
}
```

Categories: `Floor`, `Walls`, `Roof`, `Hardware`.

**Error:** `404 Not Found` — Design does not exist.

## STL Export

### Download STL

```
GET /api/designs/{id}/stl
```

Downloads a binary STL file of the shed model for 3D printing.

**Response:** `200 OK` with `Content-Type: application/octet-stream` and `Content-Disposition: attachment; filename="{name}.stl"`.

**Error:** `404 Not Found` — Design does not exist.

## Versioning

### List Versions

```
GET /api/designs/{id}/versions
```

Returns all saved versions for a design, ordered by version number descending.

**Response:** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-...",
    "designId": "3fa85f64-...",
    "versionNumber": 2,
    "label": "Final layout",
    "widthFeet": 12,
    "widthInches": 0,
    "depthFeet": 14,
    "depthInches": 0,
    "heightFeet": 9,
    "heightInches": 6,
    "roofPitch": 5.0,
    "roofType": "Gable",
    "createdAt": "2025-01-16T14:20:00Z"
  }
]
```

### Create Version

```
POST /api/designs/{id}/versions
```

Saves a snapshot of the design's current state.

**Request Body:**
```json
{
  "label": "Before roof change"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | Yes | Version label (max 200 chars) |

**Response:** `201 Created` — Returns the version object with auto-incremented `versionNumber`.

### Get Version

```
GET /api/designs/{id}/versions/{vid}
```

**Response:** `200 OK` — Single version object.

**Error:** `404 Not Found` — Design or version does not exist.

### Restore Version

```
POST /api/designs/{id}/versions/{vid}/restore
```

Restores the design to the state captured in the specified version.

**Response:** `200 OK` — Returns the updated design.

**Error:** `404 Not Found` — Design or version does not exist.

## Error Responses

All error responses follow the standard ASP.NET Core problem details format:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404,
  "traceId": "00-abc123..."
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Validation error (missing required fields, invalid values) |
| 404 | Resource not found |
| 500 | Internal server error |
