const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // The token stays in the Authorization header. Accepting it from the query
  // string would leak it into server access logs, browser history and Referer
  // headers; downloads send it through the axios instance instead.
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

module.exports = authenticateToken;
