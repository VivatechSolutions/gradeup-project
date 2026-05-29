"""
S3 Image Storage for GradeUp

Handles uploading images to AWS S3 with organized path structure:
  - Structured:  structured-content/{board}/{class}/{subject}/unit-{n}/{filename}
  - Enriched:    enriched-content/{board}/{class}/{subject}/unit-{n}/{filename}

Images are uploaded with public-read-write ACL so they can be accessed via URL.
"""

import os
import re
import mimetypes
from typing import Any, Dict, List, Optional, Tuple

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv

load_dotenv()

# ─── Configuration ───────────────────────────────────────────────────────────

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "gradeup-books-images")

S3_AVAILABLE = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and S3_BUCKET_NAME)

# ─── Client Initialization ──────────────────────────────────────────────────

_s3_client = None


def get_s3_client():
    """Get or create a cached boto3 S3 client."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    if not S3_AVAILABLE:
        print("⚠️  S3 not configured: missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or S3_BUCKET_NAME")
        return None

    try:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
        # Quick connectivity check
        _s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
        print(f"✅ Connected to S3 bucket: {S3_BUCKET_NAME} ({AWS_REGION})")
        return _s3_client
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "404":
            print(f"❌ S3 bucket '{S3_BUCKET_NAME}' does not exist")
        elif error_code == "403":
            print(f"❌ Access denied to S3 bucket '{S3_BUCKET_NAME}' — check IAM permissions")
        else:
            print(f"❌ S3 error: {e}")
        _s3_client = None
        return None
    except NoCredentialsError:
        print("❌ AWS credentials not found")
        _s3_client = None
        return None
    except Exception as e:
        print(f"❌ Failed to connect to S3: {e}")
        _s3_client = None
        return None


# ─── Path Helpers ────────────────────────────────────────────────────────────

def _sanitize_path_component(value: str) -> str:
    """Sanitize a string for use in an S3 key path.

    - Lowercases
    - Replaces spaces and special chars with underscores
    - Strips leading/trailing underscores
    """
    if not value:
        return "unknown"
    sanitized = re.sub(r"[^a-z0-9]+", "_", value.lower().strip())
    return sanitized.strip("_") or "unknown"


def build_s3_image_key(
    board: str,
    class_number: str,
    subject: str,
    unit_number: int,
    filename: str,
    content_category: str = "structured",
) -> str:
    """Build the S3 object key for an image.

    Args:
        board: Board name (e.g. "CBSE", "State Board")
        class_number: Class number (e.g. "10", "11")
        subject: Subject name (e.g. "english", "science")
        unit_number: Unit or chapter number
        filename: Image filename (e.g. "img-0.jpeg")
        content_category: "structured" or "enriched"

    Returns:
        S3 key like: structured-content/cbse/10/english/unit-1/img-0.jpeg
    """
    prefix = "enriched-content" if content_category == "enriched" else "structured-content"
    board_part = _sanitize_path_component(board)
    class_part = _sanitize_path_component(class_number or "unknown")
    subject_part = _sanitize_path_component(subject or "unknown")

    return f"{prefix}/{board_part}/{class_part}/{subject_part}/unit-{unit_number}/{filename}"


def get_s3_public_url(s3_key: str) -> str:
    """Get the public URL for an S3 object."""
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"


# ─── Upload Functions ────────────────────────────────────────────────────────

def upload_image_to_s3(
    image_bytes: bytes,
    s3_key: str,
    content_type: Optional[str] = None,
) -> Optional[str]:
    """Upload a single image to S3 and return its public URL.

    Args:
        image_bytes: Raw image bytes
        s3_key: Full S3 object key
        content_type: MIME type (auto-detected from key extension if not provided)

    Returns:
        Public URL of the uploaded image, or None on failure
    """
    client = get_s3_client()
    if not client:
        return None

    if not content_type:
        content_type, _ = mimetypes.guess_type(s3_key)
        content_type = content_type or "image/jpeg"

    try:
        client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=image_bytes,
            ContentType=content_type,
            ACL="public-read-write",
        )
        url = get_s3_public_url(s3_key)
        return url
    except ClientError as e:
        print(f"  ⚠️  S3 upload failed for {s3_key}: {e}")
        return None
    except Exception as e:
        print(f"  ⚠️  S3 upload error for {s3_key}: {e}")
        return None


def upload_images_to_s3(
    images_by_unit: Dict[int, List[Tuple[str, bytes]]],
    board: str,
    class_number: str,
    subject: str,
    content_category: str = "structured",
) -> Dict[int, Dict[str, str]]:
    """Upload all images for a document to S3.

    Args:
        images_by_unit: {unit_number: [(filename, image_bytes), ...]}
        board: Board name
        class_number: Class number
        subject: Subject name
        content_category: "structured" or "enriched"

    Returns:
        {unit_number: {filename: s3_url, ...}, ...}
    """
    if not S3_AVAILABLE:
        print("  ⚠️  S3 not configured — skipping S3 upload")
        return {}

    url_map: Dict[int, Dict[str, str]] = {}
    total_uploaded = 0
    total_failed = 0

    for unit_num in sorted(images_by_unit.keys()):
        unit_urls: Dict[str, str] = {}
        images = images_by_unit[unit_num]

        for filename, img_bytes in images:
            # Ensure filename has an extension
            if "." not in filename:
                filename = f"{filename}.jpeg"

            s3_key = build_s3_image_key(
                board=board,
                class_number=class_number,
                subject=subject,
                unit_number=unit_num,
                filename=filename,
                content_category=content_category,
            )

            url = upload_image_to_s3(img_bytes, s3_key)
            if url:
                unit_urls[filename] = url
                total_uploaded += 1
            else:
                total_failed += 1

        url_map[unit_num] = unit_urls

    print(f"  ☁️  S3 upload: {total_uploaded} images uploaded, {total_failed} failed")
    return url_map


def upload_single_image_to_s3(
    image_bytes: bytes,
    filename: str,
    board: str,
    class_number: str,
    subject: str,
    unit_number: int,
    content_category: str = "enriched",
) -> Optional[str]:
    """Upload a single image (e.g. enrichment-generated diagram) to S3.

    Convenience wrapper for enrichment pipeline use.

    Returns:
        Public URL of the uploaded image, or None on failure
    """
    if not S3_AVAILABLE:
        return None

    if "." not in filename:
        filename = f"{filename}.png"

    s3_key = build_s3_image_key(
        board=board,
        class_number=class_number,
        subject=subject,
        unit_number=unit_number,
        filename=filename,
        content_category=content_category,
    )

    return upload_image_to_s3(image_bytes, s3_key)


# ─── Audio Upload (Highlighting Feature) ─────────────────────────────────────

def build_s3_audio_key(
    board: str,
    class_number: str,
    subject: str,
    filename: str,
) -> str:
    """Build the S3 object key for a highlight audio file.

    Args:
        board: Board name (e.g. "CBSE", "State Board")
        class_number: Class number (e.g. "10", "11")
        subject: Subject name (e.g. "science", "biology")
        filename: Audio filename (e.g. "explain_abc123.mp3")

    Returns:
        S3 key like: highlight-audio/cbse/10/science/explain_abc123.mp3
    """
    board_part = _sanitize_path_component(board)
    class_part = _sanitize_path_component(class_number or "unknown")
    subject_part = _sanitize_path_component(subject or "unknown")

    return f"highlight-audio/{board_part}/{class_part}/{subject_part}/{filename}"


def upload_audio_to_s3(
    audio_bytes: bytes,
    filename: str,
    board: str,
    class_number: str,
    subject: str,
) -> Optional[str]:
    """Upload a TTS audio file to S3 and return its public URL.

    Audio files are stored under: highlight-audio/{board}/{class}/{subject}/{filename}

    Args:
        audio_bytes: Raw audio bytes (MP3)
        filename: Audio filename (e.g. "explain_abc123.mp3")
        board: Board name
        class_number: Class number
        subject: Subject name

    Returns:
        Public URL of the uploaded audio, or None on failure
    """
    if not S3_AVAILABLE:
        print("  ⚠️  S3 not configured — skipping audio upload")
        return None

    if "." not in filename:
        filename = f"{filename}.mp3"

    s3_key = build_s3_audio_key(
        board=board,
        class_number=class_number,
        subject=subject,
        filename=filename,
    )

    return upload_image_to_s3(audio_bytes, s3_key, content_type="audio/mpeg")
