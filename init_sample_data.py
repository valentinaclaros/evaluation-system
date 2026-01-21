"""
Script para inicializar la base de datos con datos de ejemplo
Ejecutar: python init_sample_data.py
"""

import sys
from datetime import datetime, timedelta
import random
from database import init_db, SessionLocal, Agent, Auditor, CallAudit, Feedback

# Sample data
AGENT_NAMES = [
    ("Ana García", "ana.garcia@empresa.com", "Servicio al Cliente", "Agente Senior"),
    ("Carlos Rodríguez", "carlos.rodriguez@empresa.com", "Servicio al Cliente", "Agente"),
    ("María López", "maria.lopez@empresa.com", "Retención", "Agente Senior"),
    ("Juan Martínez", "juan.martinez@empresa.com", "Servicio al Cliente", "Agente"),
    ("Laura Fernández", "laura.fernandez@empresa.com", "Retención", "Agente Junior"),
]

AUDITOR_NAMES = [
    ("Sistema de Calidad", "calidad@empresa.com"),
    ("Roberto Sánchez", "roberto.sanchez@empresa.com"),
]

ERROR_TYPES = [
    "Falta de verificación de identidad",
    "No ofreció alternativas",
    "Información incorrecta sobre políticas",
    "Tono inadecuado",
    "No siguió el script de retención",
    "Falta de empatía",
    "Tiempo de espera excesivo",
    "No escaló correctamente",
    "Error en el proceso de cancelación",
    "No documentó correctamente la llamada",
]

TNPS_SCORES = ["promoter", "neutral", "detractor", "null"]
CRITICALITY_LEVELS = ["baja", "media", "alta", "crítica"]
CALL_TYPES = ["tarjeta_credito", "cuenta_ahorros"]

FEEDBACK_TITLES = [
    "Mejora en verificación de identidad",
    "Técnicas de retención",
    "Mejora en manejo de objeciones",
    "Comunicación empática",
    "Cumplimiento de políticas",
]

def create_sample_data():
    """Create sample data for the system"""
    print("🚀 Inicializando base de datos...")
    
    # Initialize database
    init_db()
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_agents = db.query(Agent).count()
        if existing_agents > 0:
            print("⚠️  La base de datos ya contiene datos.")
            response = input("¿Deseas eliminar todos los datos y empezar de nuevo? (s/n): ")
            if response.lower() != 's':
                print("❌ Operación cancelada.")
                return
            
            # Clear existing data
            print("🗑️  Eliminando datos existentes...")
            db.query(Feedback).delete()
            db.query(CallAudit).delete()
            db.query(Agent).delete()
            db.query(Auditor).delete()
            db.commit()
        
        # Create agents
        print("\n👥 Creando agentes...")
        agents = []
        for name, email, dept, position in AGENT_NAMES:
            agent = Agent(
                name=name,
                email=email,
                department=dept,
                position=position,
                hire_date=datetime.utcnow() - timedelta(days=random.randint(180, 730))
            )
            db.add(agent)
            agents.append(agent)
            print(f"   ✓ {name} - {position}")
        
        db.commit()
        
        # Create auditors
        print("\n🔍 Creando auditores...")
        auditors = []
        for name, email in AUDITOR_NAMES:
            auditor = Auditor(name=name, email=email)
            db.add(auditor)
            auditors.append(auditor)
            print(f"   ✓ {name}")
        
        db.commit()
        
        # Create call audits
        print("\n📞 Creando auditorías de llamadas...")
        audits_count = 50
        base_date = datetime.utcnow() - timedelta(days=90)
        
        for i in range(audits_count):
            agent = random.choice(agents)
            auditor = random.choice(auditors)
            call_date = base_date + timedelta(days=random.randint(0, 89), 
                                             hours=random.randint(8, 18),
                                             minutes=random.randint(0, 59))
            
            # Some calls have errors, some don't
            has_error = random.random() < 0.3  # 30% of calls have errors
            
            audit = CallAudit(
                call_date=call_date,
                audit_date=call_date + timedelta(days=random.randint(1, 3)),
                customer_id=f"CUST{1000 + i}",
                call_type=random.choice(CALL_TYPES),
                agent_id=agent.id,
                auditor_id=auditor.id,
                error_type=random.choice(ERROR_TYPES) if has_error else None,
                error_description=f"Descripción detallada del error en la llamada {i+1}" if has_error else None,
                criticality_level=random.choice(CRITICALITY_LEVELS) if has_error else "baja",
                tnps_score=random.choice(TNPS_SCORES),
                notes=f"Notas adicionales sobre la llamada {i+1}"
            )
            db.add(audit)
        
        db.commit()
        print(f"   ✓ {audits_count} auditorías creadas")
        
        # Create feedbacks
        print("\n💬 Creando feedbacks...")
        feedbacks_count = 10
        
        for i in range(feedbacks_count):
            agent = random.choice(agents)
            feedback_date = datetime.utcnow() - timedelta(days=random.randint(10, 60))
            
            feedback = Feedback(
                agent_id=agent.id,
                feedback_date=feedback_date,
                title=random.choice(FEEDBACK_TITLES),
                description=f"Feedback detallado para {agent.name}. Se identificaron áreas de mejora en el manejo de llamadas. Se recomienda revisar los procedimientos y aplicar las técnicas de comunicación efectiva discutidas en la sesión.",
                action_plan=f"1. Revisar manual de procedimientos\n2. Practicar técnicas de comunicación\n3. Aplicar cambios en próximas llamadas\n4. Seguimiento en 30 días"
            )
            db.add(feedback)
            db.commit()
            
            # Analyze some feedbacks
            if i < 5:  # Analyze first 5 feedbacks
                # Count errors before
                errors_before = db.query(CallAudit).filter(
                    CallAudit.agent_id == agent.id,
                    CallAudit.call_date >= feedback_date - timedelta(days=30),
                    CallAudit.call_date < feedback_date,
                    CallAudit.error_type.isnot(None)
                ).count()
                
                # Count errors after
                errors_after = db.query(CallAudit).filter(
                    CallAudit.agent_id == agent.id,
                    CallAudit.call_date > feedback_date,
                    CallAudit.call_date <= feedback_date + timedelta(days=30),
                    CallAudit.error_type.isnot(None)
                ).count()
                
                # Calculate improvement
                if errors_before > 0:
                    improvement = ((errors_before - errors_after) / errors_before) * 100
                else:
                    improvement = 0
                
                feedback.analysis_start_date = feedback_date - timedelta(days=30)
                feedback.analysis_end_date = feedback_date + timedelta(days=30)
                feedback.errors_before = errors_before
                feedback.errors_after = errors_after
                feedback.improvement_percentage = improvement
                
                db.commit()
                print(f"   ✓ Feedback para {agent.name} (Mejora: {improvement:.1f}%)")
            else:
                print(f"   ✓ Feedback para {agent.name} (Pendiente análisis)")
        
        print("\n" + "="*60)
        print("✅ Base de datos inicializada exitosamente!")
        print("="*60)
        print(f"\n📊 Resumen:")
        print(f"   • {len(agents)} agentes creados")
        print(f"   • {len(auditors)} auditores creados")
        print(f"   • {audits_count} auditorías de llamadas creadas")
        print(f"   • {feedbacks_count} feedbacks creados")
        print(f"\n🚀 Ahora puedes iniciar el servidor con: python main.py")
        print(f"   Y visitar: http://localhost:8000\n")
        
    except Exception as e:
        print(f"\n❌ Error al crear datos de ejemplo: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()

