from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TNPSScoreEnum(str, Enum):
    PROMOTER = "promoter"
    NEUTRAL = "neutral"
    DETRACTOR = "detractor"
    NULL = "null"


class CriticalityLevelEnum(str, Enum):
    LOW = "baja"
    MEDIUM = "media"
    HIGH = "alta"
    CRITICAL = "crítica"


class CallTypeEnum(str, Enum):
    CREDIT_CARD = "tarjeta_credito"
    SAVINGS_ACCOUNT = "cuenta_ahorros"


# Agent Schemas
class AgentBase(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None
    position: Optional[str] = None


class AgentCreate(AgentBase):
    pass


class AgentResponse(AgentBase):
    id: int
    hire_date: datetime
    active: int
    created_at: datetime

    class Config:
        from_attributes = True


# Auditor Schemas
class AuditorBase(BaseModel):
    name: str
    email: EmailStr


class AuditorCreate(AuditorBase):
    pass


class AuditorResponse(AuditorBase):
    id: int
    active: int
    created_at: datetime

    class Config:
        from_attributes = True


# Call Audit Schemas
class CallAuditBase(BaseModel):
    call_date: datetime
    customer_id: str
    call_type: CallTypeEnum
    agent_id: int
    auditor_id: int
    error_type: Optional[str] = None
    error_description: Optional[str] = None
    criticality_level: CriticalityLevelEnum
    tnps_score: Optional[TNPSScoreEnum] = None
    notes: Optional[str] = None


class CallAuditCreate(CallAuditBase):
    pass


class CallAuditResponse(CallAuditBase):
    id: int
    audit_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CallAuditDetailResponse(CallAuditResponse):
    agent: AgentResponse
    auditor: AuditorResponse

    class Config:
        from_attributes = True


# Feedback Schemas
class FeedbackBase(BaseModel):
    agent_id: int
    feedback_date: datetime
    title: str
    description: str
    action_plan: Optional[str] = None


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    action_plan: Optional[str] = None
    analysis_start_date: Optional[datetime] = None
    analysis_end_date: Optional[datetime] = None


class FeedbackResponse(FeedbackBase):
    id: int
    analysis_start_date: Optional[datetime] = None
    analysis_end_date: Optional[datetime] = None
    errors_before: Optional[int] = None
    errors_after: Optional[int] = None
    improvement_percentage: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackDetailResponse(FeedbackResponse):
    agent: AgentResponse

    class Config:
        from_attributes = True


# Analytics Schemas
class AgentPerformanceMetrics(BaseModel):
    agent_id: int
    agent_name: str
    total_calls: int
    total_errors: int
    error_rate: float
    critical_errors: int
    promoter_count: int
    neutral_count: int
    detractor_count: int
    null_count: int
    tnps_score: Optional[float] = None
    average_criticality: str
    improvement_trend: Optional[str] = None


class FeedbackImpactAnalysis(BaseModel):
    feedback_id: int
    agent_name: str
    feedback_date: datetime
    errors_before: int
    errors_after: int
    improvement_percentage: float
    calls_analyzed_before: int
    calls_analyzed_after: int
    status: str  # "mejoró", "empeoró", "sin cambio"


class DashboardStats(BaseModel):
    total_agents: int
    total_audits: int
    total_feedbacks: int
    average_error_rate: float
    critical_errors_count: int
    tnps_promoter_percentage: float
    tnps_detractor_percentage: float
    agents_with_improvement: int
    agents_needing_attention: int

