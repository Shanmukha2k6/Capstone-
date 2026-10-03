from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

# Health
class HealthResponse(BaseModel):
    status: str
    version: str
    provider: str

# GitHub discovery
class RepositorySummary(BaseModel):
    full_name: str
    description: Optional[str] = None
    default_branch: str
    language: Optional[str] = None
    stars: int = 0

class TopicRepositoriesResponse(BaseModel):
    topic: str
    total_count: int
    incomplete_results: bool = False
    repositories: List[RepositorySummary]

class MalwareScanRequest(BaseModel):
    max_files: int = Field(default=12, ge=1, le=30)

class MalwareFinding(BaseModel):
    file_path: str
    line_start: int = Field(ge=1)
    line_end: int = Field(ge=1)
    title: str = Field(max_length=200)
    severity: Literal["critical", "high", "medium", "low"]
    category: Literal["credential_theft", "data_exfiltration", "persistence", "remote_execution", "destructive_behavior", "cryptomining", "obfuscation", "supply_chain", "other_suspicious_behavior"]
    evidence: str = Field(max_length=1200)
    explanation: str = Field(max_length=3000)
    recommendation: str = Field(max_length=2000)
    confidence: float = Field(ge=0, le=1)

class MalwareModelResult(BaseModel):
    summary: str = Field(max_length=3000)
    findings: List[MalwareFinding] = Field(max_length=100)

class SkippedScanFile(BaseModel):
    path: str
    reason: str

class MalwareScanResponse(BaseModel):
    repository: str
    revision: str
    branch: str
    provider: Literal["gemini"] = "gemini"
    model: str
    verdict: Literal["suspicious", "no_indicators_in_scanned_files", "inconclusive"]
    summary: str
    findings: List[MalwareFinding]
    analyzed_files: List[str]
    eligible_files: int
    available_text_files: int
    skipped_count: int
    skipped_files: List[SkippedScanFile]
    unverified_findings: int
    limitations: List[str]

# Code Explanation
class ExplainRequest(BaseModel):
    code: str = Field(..., max_length=25000, description="Source code to explain")
    language: str = Field(default="python", description="Programming language")
    level: str = Field(default="intermediate", description="beginner | intermediate | expert")

class LineNote(BaseModel):
    line: int
    note: str

class ExplainResponse(BaseModel):
    purpose: str
    walkthrough: List[str]
    key_concepts: List[str]
    time_complexity: str
    space_complexity: str
    pitfalls: List[str]
    line_notes: Optional[List[LineNote]] = []

# Bug & Security Detection
class BugScanRequest(BaseModel):
    code: str = Field(..., max_length=25000)
    language: str = Field(default="python")

class Finding(BaseModel):
    id: Optional[str] = None
    title: str
    severity: str = Field(description="critical | high | medium | low")
    category: str
    cwe: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    explanation: str
    fix: str
    fixed_code: Optional[str] = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)

class BugScanResponse(BaseModel):
    findings: List[Finding]
    summary: str

# Refactoring
class RefactorRequest(BaseModel):
    code: str = Field(..., max_length=25000)
    language: str = Field(default="python")
    focus: str = Field(default="all", description="readability | performance | maintainability | all")

class RefactorSuggestion(BaseModel):
    id: Optional[str] = None
    title: str
    impact: str = Field(description="high | medium | low")
    category: str
    rationale: str
    before_code: str
    after_code: str
    risk_level: str = Field(description="low | medium | high")

class RefactorResponse(BaseModel):
    suggestions: List[RefactorSuggestion]
    summary: str

# Quality Scorecard
class QualityRequest(BaseModel):
    code: str = Field(..., max_length=25000)
    language: str = Field(default="python")

class QualityDimensions(BaseModel):
    maintainability: int = Field(ge=0, le=100)
    security: int = Field(ge=0, le=100)
    complexity: int = Field(ge=0, le=100)
    documentation: int = Field(ge=0, le=100)

class QualityMetrics(BaseModel):
    loc: int
    comment_ratio: float
    cyclomatic_complexity: int

class QualityResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    dimensions: QualityDimensions
    metrics: QualityMetrics
    recommendations: List[str]

# Documentation
class ReadmeRequest(BaseModel):
    project_name: str
    description: str
    tech_stack: List[str]
    features: List[str]
    code_samples: Optional[List[str]] = []

class ReadmeResponse(BaseModel):
    readme_markdown: str

class DocstringRequest(BaseModel):
    code: str = Field(..., max_length=25000)
    language: str = Field(default="python")
    style: str = Field(default="google", description="google | numpy | jsdoc | javadoc")

class DocstringResponse(BaseModel):
    annotated_code: str

# Chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    repo_name: Optional[str] = "Repository"
    messages: List[ChatMessage]
    context: Optional[str] = None
