# AI Tutor image storage

Set `TUTOR_S3_BUCKET` to a private S3 bucket and configure `AWS_REGION` and
the server's usual AWS credential provider. If `TUTOR_S3_BUCKET` is absent,
the service uses `PRESENTATION_S3_BUCKET` when available.

The server needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for
the bucket's `tutor/*` prefix. Images do not need public bucket access.
The authenticated tutor image endpoint checks conversation ownership before
streaming an image. MongoDB stores image metadata and object keys, not base64.

Each turn accepts one PNG, JPEG, GIF, or WebP image, at most 5 MB.
The existing Python vision service receives the image through `image_base64`.
No Python changes are required.
Deleting a conversation also deletes its images. A failed AI turn retains
its saved user message and images; a failed upload cleans up completed uploads.
Without configured storage, image submissions return a configuration error;
text-only tutoring continues to work.

Existing conversations remain readable without migration. Historical images
that only existed as browser blob URLs cannot be recovered.

Checks:

```powershell
node tests/tutorImages.test.js
```

Before deployment, verify an image-only and an image-with-text turn against the
configured bucket, refresh/reopen the chat, verify another account cannot read
the image URL, and delete the conversation to confirm object cleanup.
