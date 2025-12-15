import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: csv_audit.py <path>", file=sys.stderr)
        return 2

    path = sys.argv[1]

    try:
        import pandas as pd
        import numpy as np
    except Exception as e:  # noqa: BLE001
        print(f"Missing dependency: {e}", file=sys.stderr)
        return 3

    try:
        df = pd.read_csv(path, nrows=5000, dtype=str, encoding_errors="ignore")
    except TypeError:
        # Older pandas may not support encoding_errors
        df = pd.read_csv(path, nrows=5000, dtype=str)
    except Exception as e:  # noqa: BLE001
        print(f"read_csv failed: {e}", file=sys.stderr)
        return 4

    # Normalize blanks to NaN for missingness checks
    df = df.replace(r"^\s*$", np.nan, regex=True)

    row_count = int(df.shape[0])
    column_count = int(df.shape[1])

    headers = [str(c) for c in df.columns.tolist()]
    header_issues = []

    for h in headers:
        if h.strip() == "":
            header_issues.append("(blank)")
        if h.startswith("Unnamed:"):
            header_issues.append(h)

    seen = {}
    duplicate_headers = []
    for h in headers:
        seen[h] = seen.get(h, 0) + 1
    for h, n in seen.items():
        if n > 1:
            duplicate_headers.append(h)

    if row_count == 0:
        missing_row_ratio = 1.0
        missing_cell_ratio = 1.0
    else:
        empty_rows = int(df.isna().all(axis=1).sum())
        missing_row_ratio = float(empty_rows / row_count)

        total_cells = max(1, row_count * max(1, column_count))
        missing_cells = int(df.isna().sum().sum())
        missing_cell_ratio = float(missing_cells / total_cells)

    sample_rows = df.head(50).to_dict(orient="records")

    payload = {
        "row_count": row_count,
        "column_count": column_count,
        "header_issues": header_issues,
        "duplicate_headers": duplicate_headers,
        "missing_row_ratio": missing_row_ratio,
        "missing_cell_ratio": missing_cell_ratio,
        "sample_rows": sample_rows,
    }

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

