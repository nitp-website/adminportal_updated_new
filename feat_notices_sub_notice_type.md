## Adding `notice_sub_type` to notices table

A new column `notice_sub_type` has been added to the `notices` table to support sub-types for certain notice types. The following SQL migration is required:

```sql
ALTER TABLE notices ADD COLUMN notice_sub_type VARCHAR(255) NULL;
```

---

## API Changes

Three endpoints now fully support `notice_sub_type` with validation:

---

### 1. `/api/notice` (GET)

#### Description

You can now filter notices by both `type` and `notice_sub_type` (both are case-insensitive and trimmed). If both parameters are provided, only notices matching **both** the type and sub-type will be returned.

#### Example: Valid Request

```
GET http://localhost:3000/api/notice?type=JOb&notice_sub_type=rEGULARTEACHING
```

#### Example: Successful Response (`200 OK`)

```json
[
  {
    "id": "12345",
    "title": "Holiday Announcement",
    "timestamp": "1775655248700",
    "openDate": "1717200000000",
    "closeDate": "1717545600000",
    "important": 1,
    "isVisible": 1,
    "attachments": [
      {
        "name": "HolidayList.pdf",
        "url": "https://example.com/HolidayList.pdf"
      }
    ],
    "email": "admin@nitp.ac.in",
    "isDept": 0,
    "notice_link": "https://example.com/notices/holiday",
    "notice_type": "JOB",
    "updatedBy": "shivamg.ug24.cs@nitp.ac.in",
    "updatedAt": "1775655248700",
    "department": "CSE",
    "notice_sub_type": "REGULARTEACHING"
  }
]
```

- If results are found, an array of notices is returned (`200 OK`) as above.
- Notice that both `type` and `notice_sub_type` accept any casing but are normalized to UPPERCASE in responses.
- If the `type` is invalid, you get:

#### Example: Error Response for Invalid Type (`400 Bad Request`)

```json
{
  "message": "Invalid type parameter"
}
```

---

### 2. `/api/create` (POST)

#### Description

Allows creation of notices with the optional `notice_sub_type` field. If a given `notice_type` requires a sub-type, a valid `notice_sub_type` **must** be provided or the API responds with an error.

#### Example: Valid Request Payload

```json
{
  "id": "1702472618475",
  "title": "Test with sub type",
  "notice_type": "job",
  "notice_sub_type": "regularteaching",
  "openDate": 1702472618000,
  "closeDate": 1702472618000,
  "department": "AR",
  "attachments": [
    {
      "name": "test.doc",
      "url": "https://docs.cloud.testman.pdf"
    }
  ],
  "isDept": 0,
  "important": 0,
  "isVisible": 1,
  "email": "admin@institute.ac.in"
}
```

#### Example: Successful API Response

```json
{
  "affectedRows": 1,
  "insertId": "1702472618475",
  "warningStatus": 0
}
```

#### Example: Invalid Request Payload (Missing Required `notice_sub_type`)

```json
{
  "id": "1702472618476",
  "title": "Test missing sub type",
  "notice_type": "job",
  "openDate": 1702472618000,
  "closeDate": 1702472618000,
  "department": "AR",
  "attachments": [
    {
      "name": "test.doc",
      "url": "https://docs.cloud.testman.pdf"
    }
  ],
  "isDept": 0,
  "important": 0,
  "isVisible": 1,
  "email": "admin@institute.ac.in"
}
```
Returns:
```json
{
  "message": "Invalid or missing notice_sub_type for notice_type: job"
}
```

---

### 3. `/api/update` (PUT)

#### Description

Allows updating notices including the `notice_sub_type` field. If the updated notice’s `notice_type` requires a sub-type, a valid `notice_sub_type` **must** be included in the payload, else the update will fail.

#### Example: Valid Request Payload

```json
{
  "data": {
    "id": 1775663250583,
    "title": "Regular Teaching Faculty Position - Computer Science Department",
    "email": "mps@nitp.ac.in",
    "openDate": 1712534400000,
    "closeDate": 1715212800000,
    "notice_type": "job",
    "notice_sub_type": "regularteaching",
    "attachments": [
      {
        "name": "job_description.pdf",
        "url": "https://docs.cloud.google.com/faculty-job-posting-2024.pdf"
      }
    ],
    "important": 1,
    "department": "AR",
    "isDept": 0,
    "isVisible": 1
  },
  "type": "notice"
}
```

#### Example: Successful API Response

```json
{
  "fieldCount": 0,
  "affectedRows": 1,
  "insertId": 0,
  "info": "Rows matched: 1  Changed: 1  Warnings: 0",
  "serverStatus": 2,
  "warningStatus": 0,
  "changedRows": 1
}
```

#### Example: Invalid Request Payload (Missing Required `notice_sub_type`)

```json
{
  "data": {
    "id": 1775663250583,
    "title": "Updated Notice Missing Sub Type",
    "notice_type": "job",
    "openDate": 1775606400000,
    "closeDate": 1775606400000,
    "department": "AR",
    "isDept": 0
  },
  "type": "notice"
}
```
Returns:
```json
{
  "message": "Invalid or missing notice_sub_type for notice_type: job"
}
```

---

#### Authorization Notes

**Authorization for `/api/update` only:**

- **SUPER_ADMIN:** Can update any notice.
- **ACADEMIC_ADMIN:** Can update notices only if `notice_type = 'academics'`.
- **DEPT_ADMIN:** Can update notices only if `notice_type = 'department'` and the `department` matches their own.
- All updates automatically set `updatedAt` to the current timestamp.

*Note: These authorization rules apply solely to the `/api/update` endpoint. Other endpoints such as `/api/create` (for creation).*

---

> Ensure all payloads provide a valid `notice_sub_type` string whenever required by the `notice_type`. See examples above for both success and error outputs.
