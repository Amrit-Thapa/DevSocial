const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

// cors allowing origin
let allowedOrigins = ["http://localhost:3000"];

//  Connect Database
connectDB();

// init Middleware
app.use(express.json({ extended: false }));

app.use(cors());

app.get("/", (req, res) => res.send("API Running..!!"));

//  Define Routes
app.use("/api/users", require("./routes/api/users"));
app.use("/api/profile", require("./routes/api/profile"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/posts", require("./routes/api/posts"));

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server Started at port ${PORT}`));
