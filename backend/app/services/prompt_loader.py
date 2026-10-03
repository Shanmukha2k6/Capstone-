import os
import yaml
from pathlib import Path
from typing import Dict, Any, Tuple

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

def load_prompt_template(name: str) -> Dict[str, Any]:
    file_path = PROMPTS_DIR / f"{name}.yaml"
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt template {name}.yaml not found in {PROMPTS_DIR}")
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def render_prompt(name: str, variables: Dict[str, Any]) -> Tuple[str, str]:
    """Returns (system_instruction, rendered_user_prompt)."""
    data = load_prompt_template(name)
    system = data.get("system", "").strip()
    template = data.get("template", "")

    for key, val in variables.items():
        placeholder = "{{" + key + "}}"
        template = template.replace(placeholder, str(val))
        system = system.replace(placeholder, str(val))

    return system, template.strip()
