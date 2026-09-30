import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

COMPANIES_FILE = os.getenv("COMPANIES_FILE", "companies.json")


def _generate_tenant_id(name: str, existing_ids: List[str]) -> str:
    """Generate a clean, url-friendly tenant_id slug from company name."""
    base_slug = re.sub(r"[^a-z0-9]+", "_", name.lower().strip()).strip("_")
    if not base_slug:
        base_slug = "company"

    candidate = base_slug
    counter = 1
    while candidate in existing_ids:
        candidate = f"{base_slug}_{counter}"
        counter += 1

    return candidate


def load_companies() -> List[Dict[str, Any]]:
    """Load companies list from local JSON file."""
    if not os.path.exists(COMPANIES_FILE):
        return []
    try:
        with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading {COMPANIES_FILE}: {e}")
        return []


def save_companies(companies: List[Dict[str, Any]]) -> None:
    """Persist companies list to local JSON file atomically."""
    temp_file = f"{COMPANIES_FILE}.tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(companies, f, indent=2, ensure_ascii=False)
        if os.path.exists(COMPANIES_FILE):
            os.replace(temp_file, COMPANIES_FILE)
        else:
            os.rename(temp_file, COMPANIES_FILE)
    except Exception as e:
        logger.error(f"Error saving {COMPANIES_FILE}: {e}")
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass
        raise


def register_company(
    name: str,
    admin_key: str = "",
    hr_key: str = "",
    employee_key: str = "",
    access_code: Optional[str] = None,
    logo_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Register a new company workspace with 3 distinct role-specific passkeys:
    - admin_key (full administrative access)
    - hr_key (human resources document access)
    - employee_key (general staff handbook access)
    - logo_url (optional custom organization logo)
    """
    clean_name = name.strip()
    k_admin = (admin_key or access_code or "").strip()
    k_hr = (hr_key or (f"{access_code}_hr" if access_code else "")).strip()
    k_emp = (employee_key or (f"{access_code}_emp" if access_code else "")).strip()

    if not clean_name:
        raise ValueError("Company name cannot be empty.")
    if not k_admin:
        raise ValueError("Admin passkey cannot be empty.")
    if not k_hr:
        raise ValueError("HR passkey cannot be empty.")
    if not k_emp:
        raise ValueError("Employee passkey cannot be empty.")

    # Validate passkeys are distinct
    if len({k_admin, k_hr, k_emp}) < 3:
        raise ValueError("Admin, HR, and Employee passkeys must all be distinct for secure role separation.")

    companies = load_companies()
    existing_ids = [c["tenant_id"] for c in companies]

    tenant_id = _generate_tenant_id(clean_name, existing_ids)
    created_at = datetime.now(timezone.utc).isoformat()
    clean_logo = (logo_url or "").strip()

    new_company = {
        "tenant_id": tenant_id,
        "name": clean_name,
        "keys": {
            "admin": k_admin,
            "hr": k_hr,
            "employee": k_emp,
        },
        "logo_url": clean_logo,
        "created_at": created_at,
    }

    companies.append(new_company)
    save_companies(companies)
    logger.info(f"Registered new company '{clean_name}' with tenant_id '{tenant_id}' and tiered passkeys.")

    return {
        "tenant_id": tenant_id,
        "name": clean_name,
        "logo_url": clean_logo,
        "created_at": created_at,
        "role": "admin",
    }


def verify_company_access(tenant_id: str, access_code: str) -> Optional[Dict[str, Any]]:
    """
    Verify tiered access code for a given tenant_id or company name.
    Checks which role key matches:
      - keys.admin    -> role: "admin"
      - keys.hr       -> role: "hr"
      - keys.employee -> role: "employee"
    Returns dict with { tenant_id, name, role, logo_url, success: True } if matched, else None.
    """
    clean_tenant = tenant_id.strip().lower()
    clean_code = access_code.strip()

    if not clean_code or not clean_tenant:
        return None

    companies = load_companies()
    for company in companies:
        c_tenant = company.get("tenant_id", "").lower().strip()
        c_name = company.get("name", "").lower().strip()

        if c_tenant == clean_tenant or c_name == clean_tenant:
            logo_val = company.get("logo_url", "")
            keys = company.get("keys")
            if isinstance(keys, dict):
                if keys.get("admin") == clean_code:
                    return {
                        "tenant_id": company["tenant_id"],
                        "name": company["name"],
                        "role": "admin",
                        "logo_url": logo_val,
                        "created_at": company.get("created_at"),
                    }
                elif keys.get("hr") == clean_code:
                    return {
                        "tenant_id": company["tenant_id"],
                        "name": company["name"],
                        "role": "hr",
                        "logo_url": logo_val,
                        "created_at": company.get("created_at"),
                    }
                elif keys.get("employee") == clean_code:
                    return {
                        "tenant_id": company["tenant_id"],
                        "name": company["name"],
                        "role": "employee",
                        "logo_url": logo_val,
                        "created_at": company.get("created_at"),
                    }

            # Legacy single access_code fallback
            legacy_code = company.get("access_code")
            if legacy_code and legacy_code == clean_code:
                return {
                    "tenant_id": company["tenant_id"],
                    "name": company["name"],
                    "role": "admin",
                    "logo_url": logo_val,
                    "created_at": company.get("created_at"),
                }
            return None

    return None


def get_public_companies() -> List[Dict[str, Any]]:
    """Return all registered companies without revealing access codes."""
    companies = load_companies()
    return [
        {
            "tenant_id": c["tenant_id"],
            "name": c["name"],
            "logo_url": c.get("logo_url", ""),
            "created_at": c.get("created_at"),
        }
        for c in companies
    ]


def update_company_logo(tenant_id: str, logo_url: str) -> Optional[Dict[str, Any]]:
    """
    Update or attach a logo URL / base64 image for a registered company.
    Returns the updated company dict or None if not found.
    """
    clean_tenant = tenant_id.strip().lower()
    companies = load_companies()
    updated_company = None

    for c in companies:
        if c.get("tenant_id", "").lower().strip() == clean_tenant:
            c["logo_url"] = logo_url.strip()
            updated_company = c
            break

    if updated_company:
        save_companies(companies)
        logger.info(f"Updated custom logo for company workspace '{clean_tenant}'.")

    return updated_company
