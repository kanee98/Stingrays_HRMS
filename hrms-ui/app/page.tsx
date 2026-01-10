export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>HRMS Dashboard</h1>

      <nav style={{ marginTop: 20 }}>
        <a href="http://localhost:3001">Employees</a> |{" "}
        <a href="#">Payroll (coming)</a>
      </nav>
    </main>
  );
}