import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_put(r2_key: str, mime_type: str, expires_in: int = 300) -> str:
    """Generate a presigned PUT URL for direct client upload to R2."""
    client = _get_client()
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": r2_key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires_in,
    )
    return url


def generate_presigned_get(r2_key: str, expires_in: int = 900) -> str:
    """Generate a presigned GET URL for secure photo access (15-min TTL default)."""
    client = _get_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": r2_key,
        },
        ExpiresIn=expires_in,
    )
    return url


def delete_object(r2_key: str) -> None:
    """Permanently delete an object from R2."""
    client = _get_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=r2_key)


def delete_objects_batch(r2_keys: list[str]) -> None:
    """Batch delete up to 1000 objects from R2."""
    if not r2_keys:
        return
    client = _get_client()
    client.delete_objects(
        Bucket=settings.r2_bucket_name,
        Delete={"Objects": [{"Key": k} for k in r2_keys], "Quiet": True},
    )


def upload_bytes(r2_key: str, data: bytes, mime_type: str = "application/octet-stream") -> None:
    """Upload raw bytes directly to R2 (used for QR code PNGs)."""
    client = _get_client()
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=r2_key,
        Body=data,
        ContentType=mime_type,
    )


def stream_object(r2_key: str):
    """Return a streaming body for an R2 object."""
    client = _get_client()
    response = client.get_object(Bucket=settings.r2_bucket_name, Key=r2_key)
    return response["Body"]
