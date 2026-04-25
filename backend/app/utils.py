from datetime import datetime, timedelta, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def day_ago_iso() -> str:
    return (utc_now() - timedelta(days=1)).isoformat()

