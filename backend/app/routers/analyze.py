from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ExplainRequest, ExplainResponse,
    BugScanRequest, BugScanResponse,
    RefactorRequest, RefactorResponse,
    QualityRequest, QualityResponse
)
from app.services.llm_gateway import gateway
from app.services.prompt_loader import render_prompt

router = APIRouter(prefix="/analyze", tags=["Analyze"])

@router.post("/explain", response_model=ExplainResponse)
async def explain_code(req: ExplainRequest):
    try:
        system, user_prompt = render_prompt("code_explanation", {
            "level": req.level,
            "language": req.language,
            "code": req.code
        })
        return await gateway.generate_json(
            prompt=user_prompt,
            model_cls=ExplainResponse,
            system=system,
            temperature=0.3
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to explain code: {str(e)}")

@router.post("/bugs", response_model=BugScanResponse)
async def scan_bugs(req: BugScanRequest):
    try:
        system, user_prompt = render_prompt("bug_detection", {
            "language": req.language,
            "code": req.code
        })
        return await gateway.generate_json(
            prompt=user_prompt,
            model_cls=BugScanResponse,
            system=system,
            temperature=0.1
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan bugs: {str(e)}")

@router.post("/refactor", response_model=RefactorResponse)
async def suggest_refactor(req: RefactorRequest):
    try:
        system, user_prompt = render_prompt("refactoring", {
            "focus": req.focus,
            "language": req.language,
            "code": req.code
        })
        return await gateway.generate_json(
            prompt=user_prompt,
            model_cls=RefactorResponse,
            system=system,
            temperature=0.2
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate refactoring: {str(e)}")

@router.post("/quality", response_model=QualityResponse)
async def analyze_quality(req: QualityRequest):
    try:
        system, user_prompt = render_prompt("quality", {
            "language": req.language,
            "code": req.code
        })
        return await gateway.generate_json(
            prompt=user_prompt,
            model_cls=QualityResponse,
            system=system,
            temperature=0.1
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score quality: {str(e)}")
