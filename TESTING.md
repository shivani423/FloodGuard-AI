# FloodGuard AI - Testing checklist

Start first: server (npm run dev), client (npm run dev), simulator (npm run simulate), ML (optional).

1. Admin signup/login: /admin > Sign up (use ADMIN_SIGNUP_CODE) > admin panel opens. Logout, Login again. Wrong password shows an error.
2. Admin > System: Database OK, Sensor nodes 4 of 4 online, ML OK if running, Weather OK with internet, Email OK only after SMTP is set.
3. /dashboard: chart moves, tank fills, status changes. Switch nodes with the dropdown.
4. /map: 4 colored zones, node dots (click for popup), shelter toggle.
5. Severity: Admin > Overview > "Very heavy rain" > dashboard banner rises, reasons mention rain. Admin > Alerts shows a new alert. "Use live weather" resets.
6. Dashboard weather card shows rainfall and hourly bars ("Simulated by admin" while override is on).
7. Dashboard AI card shows a Random Forest model label and "AI risk view" (needs ML service).
8. /subscribe: click map, zone appears, subscribe. Admin > Subscribers shows the entry.
9. Email: set SMTP in server/.env, restart, Admin > System > send test email. Then trigger heavy rain: subscriber gets an email when the zone reaches High/Severe.
10. Broadcast: Admin > Overview > Send broadcast. Admin > Alerts shows type "broadcast".
11. /evacuation: advice text matches severity, "Use my location" sorts shelters, Directions opens Google Maps, checklist ticks.
12. Admin CRUD: add a shelter > appears on /evacuation and /map. Edit a zone/node. Change thresholds in Settings > Save.
13. Dark/light toggle on every page.
14. /history: switch node and range, Export CSV.
15. Stop the simulator: after about 1 minute the sensor badge turns Offline.
