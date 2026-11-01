"""FloodGuard ML service.

IMPORTANT: models SYNTHETIC (sample) data par train hote hain, asli flood data par nahi.
Ye prototype/demo hai. Asli deployment ke liye historical sensor + rainfall data se retrain karna hoga.
"""
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

SEVERITIES = ["low", "moderate", "high", "severe"]
rng = np.random.default_rng(42)


def rule_score(level_pct, rate_pct, rain_now, rain24, vul):
    """Expert rules (server ke risk.js jaisi) - synthetic labels banane ke liye."""
    s = np.where(level_pct >= 73, 4, np.where(level_pct >= 50, 2, 0))
    s = s + np.where(rate_pct > 10, 2, np.where(rate_pct > 3.3, 1, 0))
    s = s + np.where(rain24 >= 115.6, 2, np.where(rain24 >= 64.5, 1, 0))
    s = s + (rain_now >= 7.5)
    s = s + ((vul >= 3) & (s > 0))
    return s


def synth(n=6000):
    level = rng.uniform(0, 100, n)                       # tank level %
    rate = rng.normal(1.5, 3.0, n)                       # % per minute
    rain_now = rng.exponential(2.5, n)                   # mm/h
    rain6 = rain_now * rng.uniform(1, 6, n) + rng.exponential(5, n)
    rain24 = rain6 * rng.uniform(1, 4, n)
    vul = rng.integers(1, 4, n)
    push = 0.02 * rain_now + 0.01 * rain6 / 6            # rain se extra rise (% per min)
    d10 = 10 * (0.9 * rate + push) + rng.normal(0, 1, n)
    d30 = 30 * (0.6 * rate + push) + rng.normal(0, 2, n)
    return level, rate, rain_now, rain6, rain24, vul, d10, d30


def train():
    level, rate, rn, r6, r24, vul, d10, d30 = synth()
    reg = RandomForestRegressor(n_estimators=60, max_depth=10, random_state=0, n_jobs=-1)
    reg.fit(np.c_[level, rate, rn, r6], np.c_[d10, d30])
    score = rule_score(level, rate, rn, r24, vul)
    y = np.where(score >= 6, 3, np.where(score >= 4, 2, np.where(score >= 2, 1, 0)))
    flip = rng.random(len(y)) < 0.04                      # thoda label noise
    y = np.where(flip, np.clip(y + rng.integers(-1, 2, len(y)), 0, 3), y)
    clf = RandomForestClassifier(n_estimators=60, max_depth=8, random_state=0, n_jobs=-1)
    clf.fit(np.c_[level, rate, rn, r24, vul], y)
    return reg, clf


REG, CLF = train()
app = FastAPI(title="FloodGuard ML")


class Point(BaseModel):
    t: float       # timestamp (ms)
    level: float   # water level (cm)


class Rain(BaseModel):
    now: float = 0
    next6h: float = 0
    next24h: float = 0


class Req(BaseModel):
    points: list[Point]
    tankHeightCm: float = 30
    rain: Rain = Field(default_factory=Rain)
    vulnerability: int = 2


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
def predict(req: Req):
    pts = req.points
    if len(pts) < 5:
        return {"insufficient": True}
    t0 = pts[0].t
    xs = np.array([(p.t - t0) / 60000 for p in pts])
    ys = np.array([p.level for p in pts])
    slope = float(np.polyfit(xs, ys, 1)[0]) if np.ptp(xs) > 0 else 0.0   # cm/min
    tank = req.tankHeightCm
    lvl_pct = float(ys[-1] / tank * 100)
    rate_pct = slope / tank * 100
    d10, d30 = REG.predict([[lvl_pct, rate_pct, req.rain.now, req.rain.next6h]])[0]
    in10 = float(np.clip(lvl_pct + d10, 0, 100) * tank / 100)
    in30 = float(np.clip(lvl_pct + d30, 0, 100) * tank / 100)
    sev = int(CLF.predict([[lvl_pct, rate_pct, req.rain.now, req.rain.next24h, req.vulnerability]])[0])
    return {
        "ratePerMin": slope,
        "in10": in10,
        "in30": in30,
        "severityML": SEVERITIES[sev],
        "model": "Random Forest trained on synthetic sample data (demo)",
    }
