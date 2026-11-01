export default function deviceAuth(req, res, next) {
  if (req.headers["x-api-key"] !== process.env.DEVICE_API_KEY)
    return res.status(401).json({ error: "Invalid API key" });
  next();
}
