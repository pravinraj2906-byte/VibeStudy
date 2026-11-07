import os
import pytest
from app.services.scanners.builtin_ast_adapter import BuiltinAstScanner

BENCHMARK_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "benchmark_dataset")
)

# Ground truth dataset mapping: filename -> is_vulnerable (bool), category (str)
GROUND_TRUTH = {
    "01_idor_vulnerable.py": {"is_vulnerable": True, "category": "idor"},
    "02_idor_safe.py": {"is_vulnerable": False, "category": "idor"},
    "03_secret_vulnerable.py": {"is_vulnerable": True, "category": "secret"},
    "04_secret_safe.py": {"is_vulnerable": False, "category": "secret"},
    "05_xss_vulnerable.tsx": {"is_vulnerable": True, "category": "xss"},
    "06_xss_safe.tsx": {"is_vulnerable": False, "category": "xss"},
    "07_dependency_vulnerable.json": {"is_vulnerable": True, "category": "dependency"},
    "08_dependency_safe.json": {"is_vulnerable": False, "category": "dependency"},
    "09_cors_vulnerable.py": {"is_vulnerable": True, "category": "config"},
    "10_cors_safe.py": {"is_vulnerable": False, "category": "config"},
}

def test_security_benchmark_suite_metrics():
    """
    11.7 Security Benchmark Evaluation:
    Evaluates detection against a labeled ground-truth dataset across 5 core security categories.
    Calculates empirical TP, FP, TN, FN, Precision, Recall, and Accuracy.
    """
    scanner = BuiltinAstScanner()
    assert os.path.exists(BENCHMARK_DIR), f"Benchmark dataset missing at {BENCHMARK_DIR}"

    # Scan the benchmark directory
    res = scanner.scan(BENCHMARK_DIR)
    assert res.status == "completed"

    tp = 0
    fp = 0
    tn = 0
    fn = 0
    case_results = []

    for filename, truth in GROUND_TRUTH.items():
        file_path = os.path.join(BENCHMARK_DIR, filename)
        assert os.path.exists(file_path), f"Benchmark case file missing: {filename}"

        # Match findings for this specific benchmark file
        findings = [
            f for f in res.findings
            if f.file_path == filename or f.file_path.endswith("/" + filename) or f.file_path.endswith("\\" + filename)
        ]
        has_detection = len(findings) > 0
        expected_vulnerable = truth["is_vulnerable"]

        if expected_vulnerable and has_detection:
            tp += 1
            classification = "TP (True Positive)"
        elif not expected_vulnerable and not has_detection:
            tn += 1
            classification = "TN (True Negative)"
        elif not expected_vulnerable and has_detection:
            fp += 1
            classification = "FP (False Positive)"
        else:
            fn += 1
            classification = "FN (False Negative)"

        case_results.append({
            "file": filename,
            "category": truth["category"],
            "expected_vulnerable": expected_vulnerable,
            "detected": has_detection,
            "classification": classification,
            "findings_count": len(findings)
        })

    total_samples = len(GROUND_TRUTH)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    accuracy = (tp + tn) / total_samples

    print("\n=== SECURITY SCANNER BENCHMARK METRICS ===")
    print(f"Total Labeled Cases: {total_samples}")
    print(f"True Positives (TP): {tp} (Vulnerable cases correctly detected)")
    print(f"True Negatives (TN): {tn} (Remediated cases correctly passed)")
    print(f"False Positives (FP): {fp} (False alarms on safe code)")
    print(f"False Negatives (FN): {fn} (Missed vulnerabilities)")
    print(f"Empirical Precision: {precision * 100:.1f}%")
    print(f"Empirical Recall:    {recall * 100:.1f}%")
    print(f"Empirical Accuracy:  {accuracy * 100:.1f}%")
    print("===========================================")

    # Empirical threshold assertions:
    # 1. Zero false positives on safe code
    assert fp == 0, f"Expected 0 false positives, got {fp}"
    # 2. Perfect recall on vulnerable benchmark cases
    assert fn == 0, f"Expected 0 false negatives, got {fn}"
    # 3. Precision and recall must be 100% on this standardized suite
    assert precision == 1.0
    assert recall == 1.0
    assert accuracy == 1.0
