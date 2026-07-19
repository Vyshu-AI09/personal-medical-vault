import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getRecord, updateRecord, deleteRecord, downloadRecordFile, CATEGORIES } from "../api/records";

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getRecord(id)
      .then((r) => {
        setRecord(r);
        setTitle(r.title);
        setCategory(r.category);
        setRecordDate(r.record_date);
        setNotes(r.notes || "");
      })
      .catch(() => setError("Record not found."));
  }, [id]);

  useEffect(() => {
    if (!record) return;
    let objectUrl;
    downloadRecordFile(record.id).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setFileUrl(objectUrl);
    });
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [record?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateRecord(id, {
        title,
        category,
        record_date: recordDate,
        notes,
      });
      setRecord(updated);
      setEditing(false);
    } catch {
      setError("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this record permanently? This can't be undone.")) return;
    await deleteRecord(id);
    navigate("/");
  };

  if (error) {
    return (
      <Layout>
        <div className="form-error-banner">{error}</div>
        <Link to="/" className="btn btn-secondary">
          Back to timeline
        </Link>
      </Layout>
    );
  }

  if (!record) {
    return (
      <Layout>
        <p>Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/" className="btn-text" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Back to timeline
      </Link>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 280 }}>
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="field">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Date on the document</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : "Save changes"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1>{record.title}</h1>
              <p className="mono" style={{ marginBottom: 20 }}>
                {record.record_date} · {CATEGORIES.find((c) => c.value === record.category)?.label}
              </p>
              {record.notes && <p>{record.notes}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                  Edit details
                </button>
                {fileUrl && (
                  <a href={fileUrl} download={`${record.title}.${record.file_type}`} className="btn btn-secondary">
                    Download file
                  </a>
                )}
                <button className="btn btn-text" style={{ color: "var(--danger)" }} onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              padding: 12,
              minHeight: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {fileUrl ? (
              record.file_type === "pdf" ? (
                <iframe src={fileUrl} title="record file" style={{ width: "100%", height: 420, border: "none" }} />
              ) : (
                <img src={fileUrl} alt={record.title} style={{ maxWidth: "100%", borderRadius: 4 }} />
              )
            ) : (
              <p>Loading preview…</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
