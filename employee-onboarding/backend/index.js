const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/employees", (req, res) => {
  res.json([
    { id: 1, name: "John Doe", role: "Engineer" },
    { id: 2, name: "Jane Smith", role: "HR" }
  ]);
});

app.listen(4000, () => {
  console.log("Employee API running on port 4000");
});