import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="wordmark">
          <span className="wordmark-seal">V</span>
          Vault
        </Link>
        {user && (
          <div className="topbar-user">
            <span>{user.full_name || user.email}</span>
            <button className="btn btn-text" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
