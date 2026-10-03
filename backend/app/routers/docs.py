from fastapi import APIRouter, HTTPException
from app.models.schemas import ReadmeRequest, ReadmeResponse, DocstringRequest, DocstringResponse
from app.services.llm_gateway import gateway
from app.services.prompt_loader import render_prompt

router = APIRouter(prefix="/docs", tags=["Documentation"])

@router.post("/readme", response_model=ReadmeResponse)
async def generate_readme(req: ReadmeRequest):
    try:
        system, user_prompt = render_prompt("documentation", {
            "project_name": req.project_name,
            "description": req.description,
            "tech_stack": ", ".join(req.tech_stack),
            "features": "\n".join([f"- {f}" for f in req.features]),
            "code_samples": "\n".join(req.code_samples or [])
        })
        text = await gateway.provider.generate(
            prompt=user_prompt,
            system=system,
            temperature=0.4
        )
        return ReadmeResponse(readme_markdown=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate README: {str(e)}")

@router.post("/docstrings", response_model=DocstringResponse)
async def generate_docstrings(req: DocstringRequest):
    try:
        system = f"You are a code documentation expert. Add comprehensive {req.style} style docstrings and comments to the provided {req.language} code. Do NOT modify any existing logic or variable names. Return the fully documented code only."
        user_prompt = f"<{req.language}>\n{req.code}\n</{req.language}>"
        text = await gateway.provider.generate(
            prompt=user_prompt,
            system=system,
            temperature=0.2
        )
        # Clean any accidental fences if wrapped
        clean_code = gateway.clean_json_string(text)
        return DocstringResponse(annotated_code=clean_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate docstrings: {str(e)}")
