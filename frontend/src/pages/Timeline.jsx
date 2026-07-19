import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getTimeline, CATEGORIES } from "../api/records";

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CATEGORY_ICON = {
  lab_report: "LAB",
  prescription: "RX",
  scan: "SCN",
  vaccination: "VAX",
  appointment: "APT",
  other: "DOC",
};

function formatMonthLabel(key) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Timeline() {
  const [groups, setGroups] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTimeline()
      .then(setGroups)
      .catch(() => setError("Couldn't load your timeline. Is the backend running?"));
  }, []);

  const monthKeys = groups ? Object.keys(groups) : [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Your timeline</h1>
          <p style={{ margin: 0 }}>Every record, in order.</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          + Upload record
        </Link>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {groups && monthKeys.length > 0 && (
        <div className="tab-row">
          <button
            className={`folder-tab ${activeCategory === null ? "active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All records
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`folder-tab ${activeCategory === c.value ? "active" : ""}`}
              onClick={() => setActiveCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {groups === null && !error && <p>Loading your records…</p>}

      {groups && monthKeys.length === 0 && (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Upload your first lab report, prescription, or scan to start your timeline.</p>
          <Link to="/upload" className="btn btn-primary">
            Upload your first record
          </Link>
        </div>
      )}

      {groups && monthKeys.length > 0 && (
        <div className="timeline">
          {monthKeys.map((key) => {
            const records = groups[key].filter(
              (r) => !activeCategory || r.category === activeCategory
            );
            if (records.length === 0) return null;
            return (
              <div key={key} className="timeline-group">
                <div className="timeline-group-label">{formatMonthLabel(key)}</div>
                {records.map((r) => (
                  <Link
                    key={r.id}
                    to={`/records/${r.id}`}
                    className="record-card"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="record-icon">{CATEGORY_ICON[r.category]}</div>
                    <div className="record-info">
                      <div className="record-title">{r.title}</div>
                      <div className="record-meta">
                        {formatDate(r.record_date)} · {CATEGORY_LABEL[r.category]}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
