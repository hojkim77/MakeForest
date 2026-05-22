---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
origin: ECC
---

# API Design Patterns

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Planning API versioning strategy

## Resource Design

### URL Structure

```
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resources for relationships
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Actions that don't map to CRUD (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

### Naming Rules

```
# GOOD
/api/v1/team-members          # kebab-case for multi-word resources
/api/v1/orders?status=active  # query params for filtering

# BAD
/api/v1/getUsers              # verb in URL
/api/v1/user                  # singular (use plural)
/api/v1/team_members          # snake_case in URLs
```

## HTTP Methods and Status Codes

### Status Code Reference

```
# Success
200 OK                    — GET, PUT, PATCH (with response body)
201 Created               — POST (include Location header)
204 No Content            — DELETE, PUT (no response body)

# Client Errors
400 Bad Request           — Validation failure, malformed JSON
401 Unauthorized          — Missing or invalid authentication
403 Forbidden             — Authenticated but not authorized
404 Not Found             — Resource doesn't exist
409 Conflict              — Duplicate entry, state conflict
422 Unprocessable Entity  — Semantically invalid (valid JSON, bad data)
429 Too Many Requests     — Rate limit exceeded

# Server Errors
500 Internal Server Error — Unexpected failure (never expose details)
503 Service Unavailable   — Temporary overload, include Retry-After
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### Collection Response

```json
{
  "data": [...],
  "meta": {
    "total": 142,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "invalid_format"
      }
    ]
  }
}
```

## Pagination

### Cursor-Based (preferred for MakeForest feeds)

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20
```

```json
{
  "data": [...],
  "meta": {
    "hasNext": true,
    "nextCursor": "eyJpZCI6MTQzfQ"
  }
}
```

### Offset-Based (for admin/small datasets)

```
GET /api/v1/users?page=2&perPage=20
```

## Versioning

```
/api/v1/users   ← current
/api/v2/users   ← new version (breaking changes only)
```

- Maintain at most 2 active versions
- Non-breaking changes (new optional fields, new endpoints) don't need a new version
- Breaking changes (removing fields, changing types) require a new version

## API Design Checklist

Before shipping a new endpoint:

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method and status codes
- [ ] Input validated with Zod schema
- [ ] Error responses follow standard format
- [ ] Pagination on list endpoints
- [ ] Authentication checked
- [ ] Authorization checked (user can only access their own resources)
- [ ] Response does not leak internal details (stack traces, SQL errors)
