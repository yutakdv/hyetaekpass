#!/usr/bin/env python3
"""Local, non-personal CSV/JSON candidate work. No network, model, or publish tools."""
import argparse
import csv
import hashlib
import io
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


SCHEMA = json.loads((Path(__file__).resolve().parents[1] / "contracts/catalog.schema.json").read_text())
RULE_SCHEMA = SCHEMA["properties"]["rules"]["items"]
SOURCE_SCHEMA = SCHEMA["properties"]["sources"]["items"]
RIGHTS = ("display", "transform", "iosDistribution", "androidDistribution", "offlineCache", "update", "revoke")
INPUT_KEYS = set(RULE_SCHEMA["properties"]) - {"status", "origin", "review"}
PRIVATE_KEYS = {"wallet", "latitude", "longitude", "coordinates", "location", "transactions", "transactionhistory",
                "receipt", "reportbody", "message", "cardnumber", "cvc", "password", "token", "지갑", "좌표", "거래내역", "제보본문"}
PERSONAL = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\d)01[016789][ -]?\d{3,4}[ -]?\d{4}(?!\d)|(?<!\w)(?:\d[ -]?){13,19}(?!\w)")
PRIVATE_TEXT = re.compile(r"\b(?:wallet|latitude|longitude|transactions?|report[_ ]?body|cvc|password)\b|(?:내|사용자|개인)\s*(?:지갑|좌표|거래내역)|제보\s*본문|(?<![\w.])[-+]?\d{1,2}\.\d+\s*[,/]\s*[-+]?\d{1,3}\.\d+(?![\w.])", re.IGNORECASE)


def reject(code):
    raise ValueError(code)


def read_bytes(path, limit=5 * 1024 * 1024):
    file = Path(path)
    if not file.is_file() or file.stat().st_size > limit:
        reject("INPUT_UNREADABLE_OR_TOO_LARGE")
    return file.read_bytes()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            reject("DUPLICATE_JSON_KEY")
        result[key] = value
    return result


def decode_json(raw):
    return json.loads(raw.decode("utf-8-sig"), object_pairs_hook=unique_object,
                      parse_constant=lambda _: reject("NON_FINITE_JSON"))


def privacy(value, allow_locator=False):
    if isinstance(value, dict):
        for key, child in value.items():
            locator = allow_locator and key == "location" and isinstance(child, str) and (child.startswith("/") or child.startswith("csv:"))
            if re.sub(r"[_ -]", "", key).lower() in PRIVATE_KEYS and not locator:
                reject("PERSONAL_INPUT_REJECTED")
            privacy(child, allow_locator)
    elif isinstance(value, list):
        for child in value:
            privacy(child, allow_locator)
    elif isinstance(value, str) and (PERSONAL.search(value) or PRIVATE_TEXT.search(value)):
        reject("PERSONAL_INPUT_REJECTED")


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z", value):
        reject("INVALID_UTC_TIMESTAMP")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def schema_issues(value, schema, path=""):
    """Validate only the keywords present in the repository's v1 contract."""
    types = {"object": lambda v: isinstance(v, dict), "array": lambda v: isinstance(v, list),
             "string": lambda v: isinstance(v, str), "boolean": lambda v: type(v) is bool,
             "integer": lambda v: type(v) is int, "number": lambda v: type(v) in (int, float) and math.isfinite(v)}
    issues = []
    if "type" in schema and not types[schema["type"]](value):
        return ["SCHEMA_INVALID:" + path]
    if ("const" in schema and value != schema["const"]) or ("enum" in schema and value not in schema["enum"]):
        issues.append("SCHEMA_INVALID:" + path)
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                issues.append("SCHEMA_INVALID:" + (path + "." if path else "") + key)
        if schema.get("additionalProperties") is False and set(value) - set(properties):
            issues.append("SCHEMA_INVALID:" + path)
        for key in value.keys() & properties.keys():
            issues += schema_issues(value[key], properties[key], (path + "." if path else "") + key)
    elif isinstance(value, list):
        if len(value) < schema.get("minItems", 0) or len(value) > schema.get("maxItems", len(value)):
            issues.append("SCHEMA_INVALID:" + path)
        if schema.get("uniqueItems") and len({json.dumps(v, sort_keys=True) for v in value}) != len(value):
            issues.append("SCHEMA_INVALID:" + path)
        for index, child in enumerate(value):
            issues += schema_issues(child, schema.get("items", {}), f"{path}.{index}")
    elif isinstance(value, str):
        if len(value.strip()) < schema.get("minLength", 0) or len(value) > schema.get("maxLength", len(value)):
            issues.append("SCHEMA_INVALID:" + path)
        try:
            if schema.get("format") == "date-time":
                timestamp(value)
            if schema.get("format") == "uri" and (urlsplit(value).scheme != "https" or not urlsplit(value).hostname):
                reject("INVALID_SOURCE_URL")
        except ValueError:
            issues.append("SCHEMA_INVALID:" + path)
    elif type(value) in (int, float):
        if value < schema.get("minimum", value) or value > schema.get("maximum", value):
            issues.append("SCHEMA_INVALID:" + path)
    return issues


def proof_hash(directory, reference):
    if not isinstance(reference, str) or not reference.strip() or Path(reference).is_absolute():
        return None
    base = Path(directory).resolve()
    target = (base / reference).resolve()
    if not target.is_relative_to(base):
        return None
    try:
        raw = read_bytes(target, 64 * 1024)
        text = raw.decode("utf-8")
        privacy(text)
        if not text.strip():
            return None
        return hashlib.sha256(raw).hexdigest()
    except (OSError, ValueError, UnicodeError):
        return None


def leaves(value, prefix=""):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from leaves(child, (prefix + "." if prefix else "") + key)
    else:
        yield prefix, value


def input_records(path):
    raw = read_bytes(path)
    digest = hashlib.sha256(raw).hexdigest()
    if Path(path).suffix.lower() == ".json":
        records = decode_json(raw)
        if not isinstance(records, list):
            reject("RULE_ARRAY_REQUIRED")
        locations = [{key: f"/{index}/" + key.replace(".", "/") for key, _ in leaves(rule)}
                     for index, rule in enumerate(records)]
    elif Path(path).suffix.lower() == ".csv":
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""), strict=True)
        headers = reader.fieldnames or []
        allowed = (INPUT_KEYS - {"calculation"}) | {"calculation." + key for key in RULE_SCHEMA["properties"]["calculation"]["properties"]}
        if len(headers) != len(set(headers)) or set(headers) - allowed:
            reject("CSV_HEADERS_INVALID")
        records, locations = [], []
        for index, row in enumerate(reader):
            if None in row or None in row.values():
                reject("CSV_ROW_INVALID")
            rule, evidence = {}, {}
            for key, value in row.items():
                if value == "":
                    continue  # Unknown stays absent; never fill a blank source cell.
                spec = RULE_SCHEMA["properties"][key] if "." not in key else RULE_SCHEMA["properties"]["calculation"]["properties"][key.split(".")[1]]
                typed = decode_json(value.encode()) if spec["type"] in ("array", "boolean", "integer") else value
                if "." in key:
                    rule.setdefault("calculation", {})[key.split(".")[1]] = typed
                else:
                    rule[key] = typed
                evidence[key] = f"csv:record={index + 1}:line={reader.line_num}:column={key}"
            records.append(rule)
            locations.append(evidence)
    else:
        reject("CSV_OR_JSON_REQUIRED")
    if len(records) > 1000:
        reject("RULE_COUNT_INVALID")
    privacy(records)
    if any(not isinstance(rule, dict) or set(rule) - INPUT_KEYS for rule in records):
        reject("RULE_FIELDS_INVALID")
    ids = [rule.get("id") for rule in records]
    if any(not isinstance(rule_id, str) for rule_id in ids) or len(ids) != len(set(ids)):
        reject("RULE_ID_INVALID_OR_DUPLICATE")
    return records, locations, digest


def candidate(args):
    ledger_bytes = read_bytes(args.ledger)
    ledger = decode_json(ledger_bytes)
    privacy(ledger)
    if not isinstance(ledger, dict) or set(ledger) != {"sources", "brands", "products"}:
        reject("LEDGER_FIELDS_INVALID")
    for key in ("brands", "products"):
        if schema_issues(ledger[key], SCHEMA["properties"][key]):
            reject("LEDGER_REFERENCES_INVALID")
        if len({row["id"] for row in ledger[key]}) != len(ledger[key]):
            reject("LEDGER_REFERENCES_INVALID")
    if not isinstance(ledger["sources"], list) or len(ledger["sources"]) > 1000:
        reject("LEDGER_SOURCES_INVALID")
    sources, evidence_hashes = {}, {}
    for entry in ledger["sources"]:
        if not isinstance(entry, dict) or set(entry) != {"usage", "source", "internalPermission"}:
            reject("LEDGER_SOURCE_FIELDS_INVALID")
        permission = entry["internalPermission"]
        source = entry["source"]
        if not isinstance(permission, dict) or set(permission) != {"allowed", "nonPersonal", "evidenceRef"}:
            reject("INTERNAL_PERMISSION_REQUIRED")
        internal_hash = proof_hash(args.evidence_dir, permission["evidenceRef"])
        if permission["allowed"] is not True or permission["nonPersonal"] is not True or not internal_hash:
            reject("INTERNAL_PERMISSION_REQUIRED")
        if not isinstance(source, dict) or not isinstance(source.get("id"), str) or source["id"] in sources:
            reject("SOURCE_ID_INVALID_OR_DUPLICATE")
        if entry["usage"] not in ("CATALOG", "FIXTURE"):
            reject("SOURCE_USAGE_INVALID")
        sources[source["id"]] = entry
        evidence_hashes[source["id"]] = {"internal": internal_hash,
            "public": proof_hash(args.evidence_dir, source.get("rights", {}).get("evidenceRef")) if isinstance(source.get("rights"), dict) else None}
    records, locations, input_hash = input_records(args.input)
    candidates, ready = [], []
    now = datetime.now(timezone.utc)
    for record, location in zip(records, locations):
        source_id = record.get("sourceId")
        if not isinstance(source_id, str) or source_id not in sources:
            reject("INTERNAL_PERMISSION_REQUIRED")
        entry, hashes = sources[source_id], evidence_hashes[source_id]
        source = entry["source"]
        rule = record | {"status": "DRAFT", "origin": entry["usage"]}
        issues = schema_issues(rule, RULE_SCHEMA) + schema_issues(source, SOURCE_SCHEMA, "source")
        rights = source.get("rights", {})
        if not isinstance(rights, dict) or not all(rights.get(key) is True for key in RIGHTS) or not hashes["public"]:
            issues.append("PUBLIC_RIGHTS_REQUIRED")
        if record.get("brandId") not in {row["id"] for row in ledger["brands"]} or record.get("productId") not in {row["id"] for row in ledger["products"]}:
            issues.append("REFERENCE_INVALID")
        if record.get("placeIds"):
            issues.append("PLACE_EVIDENCE_UNSUPPORTED")
        calculation = record.get("calculation")
        if isinstance(calculation, dict) and calculation.get("kind") == "PERCENT" and type(calculation.get("value")) is int and calculation["value"] > 10000:
            issues.append("BASIS_POINTS_INVALID")
        if calculation is None and not record.get("unsupportedReason"):
            issues.append("CALCULATION_OR_UNSUPPORTED_REASON_REQUIRED")
        try:
            if timestamp(record.get("startsAt")) >= timestamp(record.get("endsAt")) or timestamp(record.get("endsAt")) <= now:
                issues.append("BENEFIT_PERIOD_INVALID_OR_EXPIRED")
            checked = timestamp(source.get("checkedAt"))
            if checked > now or timestamp(source.get("freshUntil")) <= max(now, checked) or timestamp(source.get("rightsUntil")) <= max(now, checked):
                issues.append("SOURCE_PERIOD_INVALID_OR_EXPIRED")
        except ValueError:
            issues.append("PERIOD_UNCONFIRMED")
        disposition = "DEVELOPMENT_ONLY" if entry["usage"] == "FIXTURE" else "BLOCKED" if issues else "DRAFT_READY"
        field_evidence = {key: {"location": location.get(key), "sha256": input_hash, "sourceId": source_id,
            "url": source.get("url"), "documentVersion": source.get("documentVersion"), "checkedAt": source.get("checkedAt")}
            for key, _ in leaves(record)}
        candidates.append({"rule": rule, "disposition": disposition, "issues": sorted(set(issues)), "fieldEvidence": field_evidence})
        if disposition == "DRAFT_READY":
            ready.append(rule)
    catalog = None
    if ready:
        catalog = {"schemaVersion": 1, "semanticsVersion": 1, "releaseId": "draft-" + input_hash[:16],
            "createdAt": now.isoformat().replace("+00:00", "Z"), "brands": ledger["brands"], "products": ledger["products"],
            "sources": [sources[key]["source"] for key in sorted({rule["sourceId"] for rule in ready})],
            "places": [], "rules": ready, "combinations": []}
        if schema_issues(catalog, SCHEMA):
            reject("CATALOG_SCHEMA_INVALID")
    return {"status": "DRAFT", "inputSha256": input_hash, "ledgerSha256": hashlib.sha256(ledger_bytes).hexdigest(),
        "permissionEvidenceHashes": evidence_hashes, "candidates": candidates, "draftCatalog": catalog,
        "humanReviewCompleted": False, "published": False}


def diff(args):
    before_bytes, after_bytes = read_bytes(args.before), read_bytes(args.after)
    before, after = decode_json(before_bytes), decode_json(after_bytes)
    privacy(before, allow_locator=True)
    privacy(after, allow_locator=True)
    if any(not isinstance(value, dict) or value.get("status") != "DRAFT" or not isinstance(value.get("candidates"), list) for value in (before, after)):
        reject("CANDIDATE_OUTPUT_REQUIRED")
    def comparable(value):
        return {"candidates": {row["rule"]["id"]: row for row in value["candidates"]},
                "ledgerSha256": value.get("ledgerSha256"), "permissionEvidenceHashes": value.get("permissionEvidenceHashes")}
    def changed(left, right, path=""):
        if isinstance(left, dict) and isinstance(right, dict):
            return [item for key in sorted(left.keys() | right.keys())
                    for item in changed(left.get(key), right.get(key), path + "/" + key)]
        return [path] if left != right else []
    paths = changed(comparable(before), comparable(after))
    return {"status": "CHANGED" if paths else "UNCHANGED", "changedPaths": paths,
        "beforeSha256": hashlib.sha256(before_bytes).hexdigest(), "afterSha256": hashlib.sha256(after_bytes).hexdigest(),
        "sourceRechecked": False, "humanReviewCompleted": False}


def record_time(args):
    privacy(args.case)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", args.case):
        reject("CASE_ID_INVALID")
    numbers = (args.draft_minutes, args.correction_minutes, args.source_check_minutes, args.review_minutes)
    if any(not math.isfinite(value) or value < 0 for value in numbers) or (args.review_status == "human-complete" and args.review_minutes == 0):
        reject("TIME_RECORD_INVALID")
    record = {"case": args.case, "mode": args.mode, "draftMinutes": args.draft_minutes,
        "correctionMinutes": args.correction_minutes, "sourceCheckMinutes": args.source_check_minutes,
        "reviewMinutes": args.review_minutes, "reviewStatus": args.review_status, "totalMinutes": sum(numbers),
        "recordedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
    path = Path(args.log)
    history = [decode_json(line.encode()) for line in read_bytes(path).decode().splitlines()] if path.exists() else []
    privacy(history)
    for row in history:
        if not isinstance(row, dict) or set(row) != set(record) or row["mode"] not in ("manual", "assisted") or row["reviewStatus"] not in ("pending", "human-complete"):
            reject("TIME_HISTORY_INVALID")
        minutes = [row[key] for key in ("draftMinutes", "correctionMinutes", "sourceCheckMinutes", "reviewMinutes")]
        if any(type(value) not in (int, float) or not math.isfinite(value) or value < 0 for value in minutes) or row["totalMinutes"] != sum(minutes):
            reject("TIME_HISTORY_INVALID")
        if not isinstance(row["case"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", row["case"]) or (row["reviewStatus"] == "human-complete" and row["reviewMinutes"] == 0):
            reject("TIME_HISTORY_INVALID")
        timestamp(row["recordedAt"])
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False) + "\n")
    latest = {row["mode"]: row for row in history + [record] if row.get("case") == args.case}
    recommendation = "MEASUREMENT_PENDING"
    if all(mode in latest and latest[mode]["reviewStatus"] == "human-complete" for mode in ("manual", "assisted")):
        recommendation = "CONTINUE_ASSISTED" if latest["assisted"]["totalMinutes"] < latest["manual"]["totalMinutes"] else "HOLD_ASSISTED"
    return {"record": record, "recommendation": recommendation, "approvalRecorded": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    candidate_parser = commands.add_parser("candidate", help="Permission-gated DRAFT CSV/JSON candidates")
    for name in ("input", "ledger", "evidence-dir"):
        candidate_parser.add_argument("--" + name, required=True)
    diff_parser = commands.add_parser("diff", help="Compare local candidate files; never refresh source verification")
    for name in ("before", "after"):
        diff_parser.add_argument("--" + name, required=True)
    timing = commands.add_parser("record-time", help="Record full authoring, correction, source-check, and human review time")
    for name in ("log", "case"):
        timing.add_argument("--" + name, required=True)
    timing.add_argument("--mode", choices=("manual", "assisted"), required=True)
    timing.add_argument("--review-status", choices=("pending", "human-complete"), required=True)
    for name in ("draft", "correction", "source-check", "review"):
        timing.add_argument("--" + name + "-minutes", type=float, required=True)
    args = parser.parse_args()
    try:
        result = {"candidate": candidate, "diff": diff, "record-time": record_time}[args.command](args)
        print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
        return 0
    except (OSError, UnicodeError, ValueError, TypeError, KeyError, AttributeError, RecursionError, csv.Error) as error:
        code = str(error) if type(error) is ValueError and re.fullmatch(r"[A-Z_]+", str(error)) else "INPUT_INVALID"
        print(json.dumps({"code": code}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
