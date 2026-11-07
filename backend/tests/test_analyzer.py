import tempfile
import json
from pathlib import Path
from app.services.analyzer_service import CodebaseAnalyzer

def test_secret_masking():
    google_fixture = "AIza" + "SyD84kd93kd02kd92kd02kd92kd02kd"
    github_fixture = "gh" + "p_123456789012345678901234567890123456"
    raw_code = f'const apiKey = "{google_fixture}"; const token = "{github_fixture}";'
    masked = CodebaseAnalyzer.mask_secrets(raw_code)
    assert "AIzaSy" not in masked
    assert "ghp_" not in masked
    assert "[REDACTED_SECRET]" in masked

def test_stack_analysis_react_vite():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        pkg_json = {
            "name": "sample-vite-app",
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            "devDependencies": {
                "typescript": "^5.0.0",
                "vite": "^5.0.0"
            }
        }
        (tmp_path / "package.json").write_text(json.dumps(pkg_json), encoding="utf-8")
        
        stack = CodebaseAnalyzer.analyze_stack(tmp_path)
        assert stack["framework"] == "React (Vite)"
        assert stack["language"] == "TypeScript"
        assert "react" in stack["dependencies"]

def test_component_and_route_discovery():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        app_file = tmp_path / "App.tsx"
        app_file.write_text("""
import React from 'react';
import { Routes, Route } from 'react-router-dom';

export function DashboardHeader() {
    return <h1>Header</h1>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/overview" element={<div />} />
            <Route path="/audit" element={<div />} />
        </Routes>
    );
}
""", encoding="utf-8")
        
        components = CodebaseAnalyzer.discover_components(tmp_path)
        comp_names = [c["name"] for c in components]
        assert "DashboardHeader" in comp_names
        assert "App" in comp_names

        routes = CodebaseAnalyzer.discover_routes(tmp_path)
        fe_routes = [r["path"] for r in routes["frontend"]]
        assert "/overview" in fe_routes
        assert "/audit" in fe_routes
