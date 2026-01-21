from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
import database
import schemas

app = FastAPI(title="Sistema de Evaluación del Desempeño")

# Initialize database
database.init_db()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Root endpoint - serve the main HTML page
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


# ===== AGENTS ENDPOINTS =====
@app.post("/api/agents/", response_model=schemas.AgentResponse)
def create_agent(agent: schemas.AgentCreate, db: Session = Depends(database.get_db)):
    db_agent = database.Agent(**agent.dict())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent


@app.get("/api/agents/", response_model=List[schemas.AgentResponse])
def get_agents(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(database.get_db)
):
    query = db.query(database.Agent)
    if active_only:
        query = query.filter(database.Agent.active == 1)
    agents = query.offset(skip).limit(limit).all()
    return agents


@app.get("/api/agents/{agent_id}", response_model=schemas.AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(database.get_db)):
    agent = db.query(database.Agent).filter(database.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    return agent


@app.put("/api/agents/{agent_id}/deactivate")
def deactivate_agent(agent_id: int, db: Session = Depends(database.get_db)):
    agent = db.query(database.Agent).filter(database.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    agent.active = 0
    db.commit()
    return {"message": "Agente desactivado exitosamente"}


# ===== AUDITORS ENDPOINTS =====
@app.post("/api/auditors/", response_model=schemas.AuditorResponse)
def create_auditor(auditor: schemas.AuditorCreate, db: Session = Depends(database.get_db)):
    db_auditor = database.Auditor(**auditor.dict())
    db.add(db_auditor)
    db.commit()
    db.refresh(db_auditor)
    return db_auditor


@app.get("/api/auditors/", response_model=List[schemas.AuditorResponse])
def get_auditors(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(database.get_db)
):
    query = db.query(database.Auditor)
    if active_only:
        query = query.filter(database.Auditor.active == 1)
    auditors = query.offset(skip).limit(limit).all()
    return auditors


# ===== CALL AUDITS ENDPOINTS =====
@app.post("/api/audits/", response_model=schemas.CallAuditResponse)
def create_audit(audit: schemas.CallAuditCreate, db: Session = Depends(database.get_db)):
    # Verify agent exists
    agent = db.query(database.Agent).filter(database.Agent.id == audit.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    # Verify auditor exists
    auditor = db.query(database.Auditor).filter(database.Auditor.id == audit.auditor_id).first()
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditor no encontrado")
    
    db_audit = database.CallAudit(**audit.dict())
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit


@app.get("/api/audits/", response_model=List[schemas.CallAuditDetailResponse])
def get_audits(
    skip: int = 0,
    limit: int = 100,
    agent_id: Optional[int] = None,
    auditor_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    criticality: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(database.CallAudit)
    
    if agent_id:
        query = query.filter(database.CallAudit.agent_id == agent_id)
    if auditor_id:
        query = query.filter(database.CallAudit.auditor_id == auditor_id)
    if start_date:
        query = query.filter(database.CallAudit.call_date >= start_date)
    if end_date:
        query = query.filter(database.CallAudit.call_date <= end_date)
    if criticality:
        query = query.filter(database.CallAudit.criticality_level == criticality)
    
    audits = query.order_by(database.CallAudit.call_date.desc()).offset(skip).limit(limit).all()
    return audits


@app.get("/api/audits/{audit_id}", response_model=schemas.CallAuditDetailResponse)
def get_audit(audit_id: int, db: Session = Depends(database.get_db)):
    audit = db.query(database.CallAudit).filter(database.CallAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    return audit


# ===== FEEDBACKS ENDPOINTS =====
@app.post("/api/feedbacks/", response_model=schemas.FeedbackResponse)
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(database.get_db)):
    # Verify agent exists
    agent = db.query(database.Agent).filter(database.Agent.id == feedback.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    db_feedback = database.Feedback(**feedback.dict())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback


@app.get("/api/feedbacks/", response_model=List[schemas.FeedbackDetailResponse])
def get_feedbacks(
    skip: int = 0,
    limit: int = 100,
    agent_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(database.Feedback)
    
    if agent_id:
        query = query.filter(database.Feedback.agent_id == agent_id)
    
    feedbacks = query.order_by(database.Feedback.feedback_date.desc()).offset(skip).limit(limit).all()
    return feedbacks


@app.get("/api/feedbacks/{feedback_id}", response_model=schemas.FeedbackDetailResponse)
def get_feedback(feedback_id: int, db: Session = Depends(database.get_db)):
    feedback = db.query(database.Feedback).filter(database.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback no encontrado")
    return feedback


@app.put("/api/feedbacks/{feedback_id}", response_model=schemas.FeedbackResponse)
def update_feedback(
    feedback_id: int,
    feedback_update: schemas.FeedbackUpdate,
    db: Session = Depends(database.get_db)
):
    feedback = db.query(database.Feedback).filter(database.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback no encontrado")
    
    for key, value in feedback_update.dict(exclude_unset=True).items():
        setattr(feedback, key, value)
    
    feedback.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(feedback)
    return feedback


@app.post("/api/feedbacks/{feedback_id}/analyze")
def analyze_feedback_impact(
    feedback_id: int,
    days_before: int = 30,
    days_after: int = 30,
    db: Session = Depends(database.get_db)
):
    """
    Analiza el impacto del feedback comparando errores antes y después
    """
    feedback = db.query(database.Feedback).filter(database.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback no encontrado")
    
    feedback_date = feedback.feedback_date
    start_date = feedback_date - timedelta(days=days_before)
    end_date = feedback_date + timedelta(days=days_after)
    
    # Count errors before feedback
    errors_before = db.query(database.CallAudit).filter(
        and_(
            database.CallAudit.agent_id == feedback.agent_id,
            database.CallAudit.call_date >= start_date,
            database.CallAudit.call_date < feedback_date,
            database.CallAudit.error_type.isnot(None)
        )
    ).count()
    
    # Count errors after feedback
    errors_after = db.query(database.CallAudit).filter(
        and_(
            database.CallAudit.agent_id == feedback.agent_id,
            database.CallAudit.call_date > feedback_date,
            database.CallAudit.call_date <= end_date,
            database.CallAudit.error_type.isnot(None)
        )
    ).count()
    
    # Calculate improvement
    if errors_before > 0:
        improvement = ((errors_before - errors_after) / errors_before) * 100
    else:
        improvement = 0
    
    # Update feedback record
    feedback.analysis_start_date = start_date
    feedback.analysis_end_date = end_date
    feedback.errors_before = errors_before
    feedback.errors_after = errors_after
    feedback.improvement_percentage = improvement
    feedback.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(feedback)
    
    return {
        "feedback_id": feedback_id,
        "agent_id": feedback.agent_id,
        "errors_before": errors_before,
        "errors_after": errors_after,
        "improvement_percentage": round(improvement, 2),
        "status": "mejoró" if improvement > 0 else "empeoró" if improvement < 0 else "sin cambio"
    }


# ===== ANALYTICS ENDPOINTS =====
@app.get("/api/analytics/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    total_agents = db.query(database.Agent).filter(database.Agent.active == 1).count()
    total_audits = db.query(database.CallAudit).count()
    total_feedbacks = db.query(database.Feedback).count()
    
    # Calculate average error rate
    total_calls = total_audits
    total_errors = db.query(database.CallAudit).filter(
        database.CallAudit.error_type.isnot(None)
    ).count()
    avg_error_rate = (total_errors / total_calls * 100) if total_calls > 0 else 0
    
    # Critical errors
    critical_errors = db.query(database.CallAudit).filter(
        database.CallAudit.criticality_level == "crítica"
    ).count()
    
    # TNPS calculations
    promoters = db.query(database.CallAudit).filter(
        database.CallAudit.tnps_score == "promoter"
    ).count()
    detractors = db.query(database.CallAudit).filter(
        database.CallAudit.tnps_score == "detractor"
    ).count()
    
    total_tnps_responses = db.query(database.CallAudit).filter(
        database.CallAudit.tnps_score.in_(["promoter", "neutral", "detractor"])
    ).count()
    
    promoter_pct = (promoters / total_tnps_responses * 100) if total_tnps_responses > 0 else 0
    detractor_pct = (detractors / total_tnps_responses * 100) if total_tnps_responses > 0 else 0
    
    # Agents with improvement
    agents_improved = db.query(database.Feedback).filter(
        database.Feedback.improvement_percentage > 0
    ).distinct(database.Feedback.agent_id).count()
    
    # Agents needing attention (high error rate)
    agents_needing_attention = 0
    
    return {
        "total_agents": total_agents,
        "total_audits": total_audits,
        "total_feedbacks": total_feedbacks,
        "average_error_rate": round(avg_error_rate, 2),
        "critical_errors_count": critical_errors,
        "tnps_promoter_percentage": round(promoter_pct, 2),
        "tnps_detractor_percentage": round(detractor_pct, 2),
        "agents_with_improvement": agents_improved,
        "agents_needing_attention": agents_needing_attention
    }


@app.get("/api/analytics/agents/{agent_id}/performance")
def get_agent_performance(
    agent_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(database.get_db)
):
    agent = db.query(database.Agent).filter(database.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    query = db.query(database.CallAudit).filter(database.CallAudit.agent_id == agent_id)
    
    if start_date:
        query = query.filter(database.CallAudit.call_date >= start_date)
    if end_date:
        query = query.filter(database.CallAudit.call_date <= end_date)
    
    audits = query.all()
    total_calls = len(audits)
    
    if total_calls == 0:
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "total_calls": 0,
            "total_errors": 0,
            "error_rate": 0,
            "message": "No hay datos de auditoría para este agente en el periodo seleccionado"
        }
    
    total_errors = sum(1 for a in audits if a.error_type)
    error_rate = (total_errors / total_calls * 100)
    
    critical_errors = sum(1 for a in audits if a.criticality_level == "crítica")
    
    promoter_count = sum(1 for a in audits if a.tnps_score == "promoter")
    neutral_count = sum(1 for a in audits if a.tnps_score == "neutral")
    detractor_count = sum(1 for a in audits if a.tnps_score == "detractor")
    null_count = sum(1 for a in audits if a.tnps_score == "null" or not a.tnps_score)
    
    # Calculate TNPS
    total_tnps = promoter_count + neutral_count + detractor_count
    if total_tnps > 0:
        tnps_score = ((promoter_count - detractor_count) / total_tnps) * 100
    else:
        tnps_score = None
    
    # Error distribution by type
    error_types = {}
    for audit in audits:
        if audit.error_type:
            error_types[audit.error_type] = error_types.get(audit.error_type, 0) + 1
    
    return {
        "agent_id": agent_id,
        "agent_name": agent.name,
        "total_calls": total_calls,
        "total_errors": total_errors,
        "error_rate": round(error_rate, 2),
        "critical_errors": critical_errors,
        "promoter_count": promoter_count,
        "neutral_count": neutral_count,
        "detractor_count": detractor_count,
        "null_count": null_count,
        "tnps_score": round(tnps_score, 2) if tnps_score is not None else None,
        "error_distribution": error_types
    }


@app.get("/api/analytics/agents/ranking")
def get_agents_ranking(
    limit: int = 10,
    order_by: str = "error_rate",  # error_rate, tnps_score, total_calls
    db: Session = Depends(database.get_db)
):
    """
    Returns a ranking of agents based on different metrics
    """
    agents = db.query(database.Agent).filter(database.Agent.active == 1).all()
    
    agent_metrics = []
    for agent in agents:
        audits = db.query(database.CallAudit).filter(
            database.CallAudit.agent_id == agent.id
        ).all()
        
        total_calls = len(audits)
        if total_calls == 0:
            continue
        
        total_errors = sum(1 for a in audits if a.error_type)
        error_rate = (total_errors / total_calls * 100)
        
        promoter_count = sum(1 for a in audits if a.tnps_score == "promoter")
        neutral_count = sum(1 for a in audits if a.tnps_score == "neutral")
        detractor_count = sum(1 for a in audits if a.tnps_score == "detractor")
        
        total_tnps = promoter_count + neutral_count + detractor_count
        tnps_score = ((promoter_count - detractor_count) / total_tnps * 100) if total_tnps > 0 else 0
        
        agent_metrics.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "department": agent.department,
            "total_calls": total_calls,
            "error_rate": round(error_rate, 2),
            "tnps_score": round(tnps_score, 2)
        })
    
    # Sort based on order_by parameter
    if order_by == "error_rate":
        agent_metrics.sort(key=lambda x: x["error_rate"])
    elif order_by == "tnps_score":
        agent_metrics.sort(key=lambda x: x["tnps_score"], reverse=True)
    elif order_by == "total_calls":
        agent_metrics.sort(key=lambda x: x["total_calls"], reverse=True)
    
    return agent_metrics[:limit]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

