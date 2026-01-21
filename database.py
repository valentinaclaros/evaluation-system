from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

SQLALCHEMY_DATABASE_URL = "sqlite:///./performance_evaluation.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TNPSScore(str, enum.Enum):
    PROMOTER = "promoter"
    NEUTRAL = "neutral"
    DETRACTOR = "detractor"
    NULL = "null"


class CriticalityLevel(str, enum.Enum):
    LOW = "baja"
    MEDIUM = "media"
    HIGH = "alta"
    CRITICAL = "crítica"


class CallType(str, enum.Enum):
    CREDIT_CARD = "tarjeta_credito"
    SAVINGS_ACCOUNT = "cuenta_ahorros"


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String)
    position = Column(String)
    hire_date = Column(DateTime, default=datetime.utcnow)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    audits = relationship("CallAudit", back_populates="agent", foreign_keys="CallAudit.agent_id")
    feedbacks = relationship("Feedback", back_populates="agent")


class Auditor(Base):
    __tablename__ = "auditors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    audits = relationship("CallAudit", back_populates="auditor")


class CallAudit(Base):
    __tablename__ = "call_audits"

    id = Column(Integer, primary_key=True, index=True)
    call_date = Column(DateTime, nullable=False)
    audit_date = Column(DateTime, default=datetime.utcnow)
    customer_id = Column(String, nullable=False)
    call_type = Column(String, nullable=False)  # tarjeta_credito o cuenta_ahorros
    
    # Referencias
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    auditor_id = Column(Integer, ForeignKey("auditors.id"), nullable=False)
    
    # Evaluación
    error_type = Column(String)
    error_description = Column(Text)
    criticality_level = Column(String, nullable=False)
    tnps_score = Column(String)
    
    # Notas adicionales
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    agent = relationship("Agent", back_populates="audits", foreign_keys=[agent_id])
    auditor = relationship("Auditor", back_populates="audits")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    feedback_date = Column(DateTime, nullable=False)
    
    # Contenido del feedback
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    action_plan = Column(Text)
    
    # Periodo de análisis
    analysis_start_date = Column(DateTime)  # Fecha inicio para comparar pre-feedback
    analysis_end_date = Column(DateTime)    # Fecha fin para comparar post-feedback
    
    # Métricas
    errors_before = Column(Integer)
    errors_after = Column(Integer)
    improvement_percentage = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    agent = relationship("Agent", back_populates="feedbacks")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

