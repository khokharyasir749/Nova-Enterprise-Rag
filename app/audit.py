import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.config import settings
from app.models import AuditRecord

logger = logging.getLogger(__name__)


class AuditLogger:
    """Thread-safe in-memory and persistent JSONL audit logger."""

    def __init__(self, log_filepath: str = settings.AUDIT_LOG_FILE):
        self.log_filepath = log_filepath
        self._lock = threading.Lock()
        self._records: List[AuditRecord] = []
        self._load_existing_records()

    def _load_existing_records(self) -> None:
        """Load records from existing file if available."""
        if not os.path.exists(self.log_filepath):
            return

        try:
            with open(self.log_filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        record_dict = json.loads(line)
                        self._records.append(AuditRecord(**record_dict))
            logger.info(f"Loaded {len(self._records)} prior audit log records from '{self.log_filepath}'.")
        except Exception as e:
            logger.warning(f"Could not load previous audit logs from '{self.log_filepath}': {e}")

    def log_event(
        self,
        user_id: str,
        tenant_id: str,
        user_roles: List[str],
        query: str,
        retrieved_chunks_count: int,
        retrieved_documents: List[str],
        access_status: str,
    ) -> AuditRecord:
        """
        Record an access/query event with permission and audit details.
        Appends to memory and disk.
        """
        record = AuditRecord(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            user_id=user_id,
            tenant_id=tenant_id.lower().strip(),
            user_roles=[r.lower().strip() for r in user_roles],
            query=query,
            retrieved_chunks_count=retrieved_chunks_count,
            retrieved_documents=list(dict.fromkeys(retrieved_documents)),  # deduplicated
            access_status=access_status,
        )

        with self._lock:
            self._records.append(record)
            try:
                with open(self.log_filepath, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record.model_dump()) + "\n")
            except Exception as e:
                logger.error(f"Failed to persist audit log record to '{self.log_filepath}': {e}")

        logger.info(
            f"Audit event logged: id={record.id} tenant='{record.tenant_id}' "
            f"user='{record.user_id}' status='{record.access_status}' "
            f"chunks={record.retrieved_chunks_count}"
        )
        return record

    def get_logs(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[AuditRecord]:
        """
        Retrieve audit logs in reverse chronological order (newest first).
        Optionally filter by tenant_id.
        """
        with self._lock:
            # Copy references
            records = list(self._records)

        if tenant_id:
            clean_tenant = tenant_id.strip().lower()
            records = [r for r in records if r.tenant_id == clean_tenant]

        # Reverse chronological (newest first)
        records = sorted(records, key=lambda r: r.timestamp, reverse=True)
        return records[:limit]


# Global audit logger instance
audit_logger = AuditLogger()
