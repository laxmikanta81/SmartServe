from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="PlateAI / FoodWise Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# IN-MEMORY DATABASE (Step 4)
# ==========================================
users_db = [
    {"email": "admin@canteen.org", "password": "password123", "name": "Maya Sharma", "role": "Admin/Canteen Manager"},
    {"email": "ngo@feedingindia.org", "password": "password123", "name": "Feeding India NGO", "role": "Recipient/NGO"},
    {"email": "system@ai.org", "password": "password123", "name": "PlateAI AutoSystem", "role": "System/AI"}
]

attendance_db = [
    {"date": "2026-08-10", "day": "Monday", "attendance": 850, "event": False, "holiday": False, "meal_type": "Lunch"},
    {"date": "2026-08-11", "day": "Tuesday", "attendance": 870, "event": True, "holiday": False, "meal_type": "Lunch"},
    {"date": "2026-08-12", "day": "Wednesday", "attendance": 820, "event": False, "holiday": False, "meal_type": "Lunch"},
]

surplus_db = [
    {
        "id": 1,
        "dish": "Steamed Rice & Veg Curry",
        "prepared_qty": 450,
        "consumed_qty": 410,
        "surplus_qty": 40,
        "prep_time": "12:00 PM",
        "storage_temp_c": 62.0,  # Hot holding >= 60°C is safe
        "safety_status": "🟢 Eligible for redistribution",
        "verified": True
    },
    {
        "id": 2,
        "dish": "Dal Tadka",
        "prepared_qty": 200,
        "consumed_qty": 185,
        "surplus_qty": 15,
        "prep_time": "12:30 PM",
        "storage_temp_c": 28.0,  # Danger zone if left too long
        "safety_status": "🟡 Needs verification",
        "verified": False
    }
]

recipients_db = [
    {"id": 1, "name": "Feeding India Shelter", "distance_km": 2.4, "capacity": 50, "meal_req": "Lunch", "verified": True},
    {"id": 2, "name": "Robin Hood Army Hub", "distance_km": 4.1, "capacity": 80, "meal_req": "Lunch", "verified": True},
    {"id": 3, "name": "City Care Orphanage", "distance_km": 6.8, "capacity": 30, "meal_req": "Dinner", "verified": False}
]

redistributions_db = []

# ==========================================
# REQUEST MODELS
# ==========================================
class AuthReq(BaseModel):
    email: str
    password: str
    role: Optional[str] = "Admin/Canteen Manager"

class AttendanceReq(BaseModel):
    date: str
    day: str
    attendance: int
    event: bool
    holiday: bool
    meal_type: str

class ForecastReq(BaseModel):
    attendance: int
    day: str
    event: bool
    holiday: bool
    temperature_c: float
    rain: bool
    meal_type: str

class SafetyCheckReq(BaseModel):
    dish: str
    prepared_qty: int
    consumed_qty: int
    prep_time: str
    storage_temp_c: float

class MatchReq(BaseModel):
    surplus_id: int
    recipient_id: int

# ==========================================
# ENDPOINTS
# ==========================================

# Step 1: Authentication
@app.post("/api/auth/login")
def login(data: AuthReq):
    user = next((u for u in users_db if u["email"].lower() == data.email.lower()), None)
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials. Try admin@canteen.org / password123")
    return {"message": "Success", "user": {"email": user["email"], "name": user["name"], "role": data.role or user["role"]}}

@app.post("/api/auth/register")
def register(data: AuthReq):
    users_db.append({"email": data.email, "password": data.password, "name": data.email.split("@")[0].title(), "role": data.role})
    return {"message": "Registered", "user": {"email": data.email, "name": data.email.split("@")[0].title(), "role": data.role}}

# Step 6: Attendance Management
@app.get("/api/attendance")
def get_attendance():
    return attendance_db

@app.post("/api/attendance")
def add_attendance(data: AttendanceReq):
    entry = data.dict()
    attendance_db.append(entry)
    return {"message": "Attendance recorded", "data": entry}

# Step 7 & 8 & 9: AI Demand Forecast & Explainable Recommendation
@app.post("/api/forecast")
def calculate_forecast(req: ForecastReq):
    # Base calculation formula
    base_demand = req.attendance * 0.88  # ~88% average turnout rate
    
    # Explanations list
    reasons = [f"Base calculation uses ~88% standard turnout rate from attendance of {req.attendance}."]
    
    if req.holiday:
        base_demand *= 0.5
        reasons.append("Holiday flag detected: Expected turnout reduced by 50%.")
    elif req.event:
        base_demand *= 1.12
        reasons.append("Campus event active: Expected turnout increased by 12%.")

    if req.rain:
        base_demand *= 1.05
        reasons.append("Rain predicted: Canteen turnout increases due to limited outdoor dining options.")

    if req.temperature_c > 35.0:
        base_demand *= 0.95
        reasons.append("High outdoor temperature (>35°C): Light meal preference detected.")

    predicted_demand = round(base_demand)
    safety_buffer = round(predicted_demand * 0.04)  # 4% safety buffer
    recommended_prep = predicted_demand + safety_buffer

    return {
        "predicted_demand": predicted_demand,
        "safety_buffer": safety_buffer,
        "recommended_prep": recommended_prep,
        "explainability": reasons,
        "weather_inputs": {
            "temperature_c": req.temperature_c,
            "rain": req.rain,
            "condition": "Rainy / Overcast" if req.rain else "Clear Sky"
        }
    }

# Step 10 & 11: Surplus Management & Food Safety Rules
@app.get("/api/surplus")
def get_surplus():
    return surplus_db

@app.post("/api/surplus")
def add_surplus(req: SafetyCheckReq):
    surplus_qty = max(0, req.prepared_qty - req.consumed_qty)
    
    # Food Safety Rules: Hot holding >= 60°C or Cold storage <= 4°C
    if req.storage_temp_c >= 60.0 or req.storage_temp_c <= 4.0:
        status_label = "🟢 Eligible for redistribution"
        verified = True
    elif 15.0 <= req.storage_temp_c < 60.0:
        status_label = "🟡 Needs verification"
        verified = False
    else:
        status_label = "🔴 Not eligible"
        verified = False

    item = {
        "id": len(surplus_db) + 1,
        "dish": req.dish,
        "prepared_qty": req.prepared_qty,
        "consumed_qty": req.consumed_qty,
        "surplus_qty": surplus_qty,
        "prep_time": req.prep_time,
        "storage_temp_c": req.storage_temp_c,
        "safety_status": status_label,
        "verified": verified
    }
    surplus_db.insert(0, item)
    return {"message": "Surplus logged", "item": item}

# Step 12: Recipient Matching
@app.get("/api/recipients")
def get_recipients():
    return recipients_db

@app.post("/api/redistribution/match")
def match_recipient(req: MatchReq):
    surplus_item = next((s for s in surplus_db if s["id"] == req.surplus_id), None)
    recipient = next((r for r in recipients_db if r["id"] == req.recipient_id), None)

    if not surplus_item or not recipient:
        raise HTTPException(status_code=404, detail="Item or Recipient not found")

    # Match score calculation
    score = 100
    if recipient["distance_km"] > 5.0:
        score -= 20
    if recipient["capacity"] < surplus_item["surplus_qty"]:
        score -= 30
    if not surplus_item["verified"]:
        score -= 50

    record = {
        "id": len(redistributions_db) + 1,
        "surplus_id": surplus_item["id"],
        "dish": surplus_item["dish"],
        "quantity": surplus_item["surplus_qty"],
        "recipient_name": recipient["name"],
        "match_score": f"{max(0, score)}%",
        "status": "Redistributed",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    redistributions_db.append(record)
    surplus_item["safety_status"] = "✅ Claimed & Dispatched"
    return {"message": "Matched and dispatched successfully", "record": record}

# Step 14: Analytics & Impact Dashboard
@app.get("/api/analytics")
def get_analytics():
    return {
        "impact": {
            "food_saved_kg": 245,
            "meals_saved": 4820,
            "money_saved_inr": "₹32,500",
            "co2_avoided_kg": 540,
            "waste_reduction_pct": "31%"
        },
        "before_vs_after": [
            {"month": "Week 1", "before_ai_surplus": 15.2, "after_ai_surplus": 7.1},
            {"month": "Week 2", "before_ai_surplus": 14.8, "after_ai_surplus": 6.8},
            {"month": "Week 3", "before_ai_surplus": 16.0, "after_ai_surplus": 6.5},
            {"month": "Week 4", "before_ai_surplus": 15.5, "after_ai_surplus": 5.9},
        ]
    }