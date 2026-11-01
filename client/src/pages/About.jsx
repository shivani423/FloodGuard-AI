import { Card } from "../components/ui.jsx";

export default function About() {
  return (
    <Card title="About FloodGuard AI" className="max-w-2xl">
      <div className="space-y-3 text-slate-300">
        <p>FloodGuard AI is an IoT + AI/ML + MERN prototype for heavy-rainfall early warning and flood-risk monitoring.</p>
        <p>ESP32 sensor nodes with HC-SR04 ultrasonic sensors measure water level. The Node.js server stores readings in MongoDB, combines them with rainfall data and forecasts, classifies flood severity per zone (Low, Moderate, High, Severe), and streams everything live to this dashboard and the risk map.</p>
        <p>People can subscribe to location-based email warnings and find the nearest shelter. Admins manage nodes, zones and shelters and can broadcast alerts.</p>
        <p className="text-sm text-yellow-400">Disclaimer: this is a prototype. Zones, shelters and most nodes shown are sample or simulated data. The AI model is trained on synthetic data and gives estimates only. It is not a replacement for official flood warning systems.</p>
      </div>
    </Card>
  );
}
