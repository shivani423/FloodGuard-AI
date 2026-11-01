# FloodGuard AI

IoT + AI/ML + MERN prototype for heavy-rainfall early warning and flood-risk monitoring (ESP32 + HC-SR04).
Prototype / demo only. Not a replacement for official flood warning systems.
Zones, shelters and simulated nodes are SAMPLE data. The ML model is trained on SYNTHETIC data.

## Modules
Risk map, 4-level severity, location-based email warnings, admin dashboard, evacuation support,
weather (Open-Meteo) + admin rain simulation, rainfall-aware ML prediction.

## Run (separate terminals)
1. Server:  cd server && npm install && npm run dev
2. Client:  cd client && npm install && npm run dev      -> http://localhost:5173
3. Fake nodes: cd server && npm run simulate              (real ESP32 ke baad: npm run simulate:virtual)
4. ML (optional): cd ml-service && pip install -r requirements.txt && uvicorn app:app --port 8000

Server `.env` mein ye add karo (server/.env.example dekho): JWT_SECRET, ADMIN_SIGNUP_CODE.
Admin: /admin par Sign up karo (signup code = ADMIN_SIGNUP_CODE). Testing: TESTING.md dekho.
