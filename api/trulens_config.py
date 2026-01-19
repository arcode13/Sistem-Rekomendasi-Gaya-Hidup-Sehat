from typing import Optional
from open_notebook.database.repository import repo_query, ensure_record_id

TRULENS_SETTINGS_RECORD = "open_notebook:trulens_settings"


async def get_trulens_enabled(default: bool = True) -> bool:
  """Fetch TruLens enabled flag from database, fallback to default if missing."""
  try:
    rows = await repo_query(
      "SELECT trulens_enabled FROM ONLY $rid",
      {"rid": ensure_record_id(TRULENS_SETTINGS_RECORD)},
    )
    if rows:
      data = rows[0] if isinstance(rows, list) else rows
      enabled = data.get("trulens_enabled")
      if enabled is None:
        return default
      return bool(enabled)
  except Exception:
    # If any issue occurs, keep system running with default value
    return default
  return default


async def set_trulens_enabled(enabled: bool) -> bool:
  """Persist TruLens enabled flag, creating the record when needed."""
  rid = ensure_record_id(TRULENS_SETTINGS_RECORD)
  # Try update first; if record missing, create it.
  rows = await repo_query("SELECT * FROM ONLY $rid", {"rid": rid})
  if rows:
    await repo_query(
      "UPDATE $rid SET trulens_enabled = $enabled, updated = time::now()",
      {"rid": rid, "enabled": enabled},
    )
  else:
    await repo_query(
      "CREATE $rid SET trulens_enabled = $enabled, created = time::now(), updated = time::now()",
      {"rid": rid, "enabled": enabled},
    )
  return enabled


