import { useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../api/auth";

/**
 * Placeholder minimal de dashboard, doar pentru a verifica
 * că flow-ul de login + redirect + persistență token funcționează.
 *
 * Va fi înlocuit ulterior cu dashboard-urile per rol (guest/receptionist/staff/admin).
 */
function Dashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f8fa",
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          maxWidth: 520,
          width: "100%",
          boxShadow:
            "0 10px 40px -10px rgba(31, 78, 121, 0.18), 0 4px 16px -4px rgba(0,0,0,0.06)",
          border: "1px solid #e2e6ed",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", color: "#1f4e79" }}>
          Bine ai venit, {user?.full_name || "utilizator"}!
        </h1>
        <p style={{ margin: "0 0 20px 0", color: "#5b6478" }}>
          Te-ai autentificat cu succes în Roomly.
        </p>
        {user && (
          <div
            style={{
              background: "#f7f8fa",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#1a1f2c",
            }}
          >
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Rol:</strong> {user.role}</div>
            {user.room_id && <div><strong>Camera:</strong> #{user.room_id}</div>}
          </div>
        )}
        <p style={{ fontSize: 13, color: "#5b6478", margin: "0 0 20px 0" }}>
          Aceasta este o pagină placeholder. Dashboard-urile per rol vor fi
          adăugate ulterior.
        </p>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 16px",
            border: "1.5px solid #1f4e79",
            background: "#fff",
            color: "#1f4e79",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Deconectare
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
