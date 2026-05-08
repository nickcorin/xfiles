import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  Download,
  ExternalLink,
  FileSearch,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
}

function App() {
  const [view, setView] = useState("archive");
  const [releases, setReleases] = useState([]);
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadArchive(nextQuery = query) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (category) params.set("category", category);
      if (reviewState) params.set("review_state", reviewState);
      if (downloadStatus) params.set("download_status", downloadStatus);
      const [releaseData, recordData, locationData] = await Promise.all([
        api("/api/releases"),
        api(`/api/records?${params.toString()}`),
        api("/api/locations"),
      ]);
      setReleases(releaseData);
      setRecords(recordData);
      setLocations(locationData);
      if (recordData.length > 0 && selectedRecord == null) {
        await openRecord(recordData[0].id);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function ingest() {
    setLoading(true);
    setMessage("Ingesting release page");
    try {
      await api("/api/ingest", { method: "POST", body: JSON.stringify({}) });
      await loadArchive();
      setMessage("Release ingested");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openRecord(recordId) {
    const detail = await api(`/api/records/${recordId}`);
    setSelectedRecord(detail);
  }

  useEffect(() => {
    loadArchive();
  }, []);

  const categories = useMemo(() => {
    const all = records.flatMap((record) => record.categories);
    return [...new Set(all)].sort();
  }, [records]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">X</div>
          <div>
            <p className="eyebrow">PURSUE UAP Archive</p>
            <h1>The files are open.</h1>
          </div>
        </div>
        <nav className="views" aria-label="Views">
          <button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}>
            <Archive size={18} /> Archive
          </button>
          <button className={view === "globe" ? "active" : ""} onClick={() => setView("globe")}>
            <Globe2 size={18} /> Globe
          </button>
        </nav>
      </header>

      <section className="toolbar">
        <label className="searchbox">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadArchive(event.currentTarget.value);
            }}
            placeholder="Search records, extracted text, notes"
          />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={reviewState} onChange={(event) => setReviewState(event.target.value)}>
          <option value="">All review states</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="follow-up">Follow-up</option>
        </select>
        <select value={downloadStatus} onChange={(event) => setDownloadStatus(event.target.value)}>
          <option value="">All download states</option>
          <option value="downloaded">Downloaded</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={() => loadArchive()} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
          Refresh
        </button>
        <button className="primary" onClick={ingest} disabled={loading}>
          <Download size={18} />
          Ingest
        </button>
      </section>

      {message ? <p className="status-line">{message}</p> : null}

      {view === "archive" ? (
        <ArchiveView
          releases={releases}
          records={records}
          selectedRecord={selectedRecord}
          openRecord={openRecord}
        />
      ) : (
        <GlobeView
          locations={locations}
          openRecord={async (recordId) => {
            await openRecord(recordId);
            setView("archive");
          }}
        />
      )}
    </main>
  );
}

function ArchiveView({ releases, records, selectedRecord, openRecord }) {
  return (
    <section className="workspace">
      <aside className="release-rail">
        <div className="panel-header">
          <ShieldCheck size={18} />
          <h2>Releases</h2>
        </div>
        {releases.length === 0 ? (
          <p className="muted">No release snapshots.</p>
        ) : (
          releases.map((release) => (
            <article className="release-row" key={release.id}>
              <strong>{release.release_label}</strong>
              <span>
                {release.record_count} records
                {release.failure_count ? ` · ${release.failure_count} failed` : ""}
              </span>
              <a href={release.source_url} target="_blank" rel="noreferrer">
                Source <ExternalLink size={14} />
              </a>
            </article>
          ))
        )}
      </aside>

      <section className="record-list">
        <div className="panel-header">
          <FileSearch size={18} />
          <h2>Records</h2>
        </div>
        {records.length === 0 ? (
          <p className="muted">No records found.</p>
        ) : (
          records.map((record) => (
            <button
              className={`record-row ${selectedRecord?.id === record.id ? "selected" : ""}`}
              key={record.id}
              onClick={() => openRecord(record.id)}
            >
              <span className="record-title">{record.title}</span>
              <span className="record-meta">
                {record.release_label} · {record.media_type || "source listed"}
              </span>
              <span className="chips">
                <em className={record.download_status === "failed" ? "danger" : ""}>
                  {record.download_status}
                </em>
                {record.incident_location ? <em>{record.incident_location}</em> : null}
                <em>{record.review_state}</em>
              </span>
              {record.match_reasons.length > 0 ? (
                <span className="match">Matched {record.match_reasons.join(", ")}</span>
              ) : null}
            </button>
          ))
        )}
      </section>

      <RecordDetail record={selectedRecord} />
    </section>
  );
}

function RecordDetail({ record }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(record);

  useEffect(() => {
    setCurrentRecord(record);
  }, [record]);

  async function addNote() {
    if (!currentRecord || !note.trim()) return;
    setSaving(true);
    try {
      await api(`/api/records/${currentRecord.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note, author: "analyst", source: "human" }),
      });
      const updated = await api(`/api/records/${currentRecord.id}`);
      setCurrentRecord(updated);
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  if (!currentRecord) {
    return (
      <section className="detail empty">
        <p>Select a record.</p>
      </section>
    );
  }

  const fileUrl = `${API_BASE_URL}/api/records/${currentRecord.id}/file`;
  return (
    <section className="detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{currentRecord.release_label}</p>
          <h2>{currentRecord.title}</h2>
        </div>
        <a className="icon-link" href={currentRecord.source_url} target="_blank" rel="noreferrer">
          Source <ExternalLink size={16} />
        </a>
      </div>

      {currentRecord.content_hash ? (
        <div className="provenance">
          <span>SHA-256</span>
          <code>{currentRecord.content_hash}</code>
        </div>
      ) : null}

      <FilePreview record={currentRecord} fileUrl={fileUrl} />

      <section className="metadata-grid">
        <Meta label="Agency" value={currentRecord.source_metadata.Agency} />
        <Meta label="Download status" value={currentRecord.download_status} />
        <Meta label="Failure reason" value={currentRecord.failure_reason} />
        <Meta label="Incident date" value={currentRecord.incident_date} />
        <Meta label="Incident location" value={currentRecord.incident_location} />
        <Meta label="Location source" value={currentRecord.location_source} />
        <Meta label="Review" value={currentRecord.review_state} />
        <Meta label="Filename" value={currentRecord.original_filename} />
      </section>

      <section className="text-panel">
        <h3>Extracted text</h3>
        <pre>{currentRecord.extracted_text || "No extractable text."}</pre>
      </section>

      <section className="notes">
        <h3>Notes</h3>
        <div className="note-input">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          <button onClick={addNote} disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={18} /> : null}
            Add note
          </button>
        </div>
        {currentRecord.notes?.map((item) => (
          <article className="note" key={item.id}>
            <p>{item.body}</p>
            <span>
              {item.author} · {item.source}
            </span>
          </article>
        ))}
      </section>
    </section>
  );
}

function FilePreview({ record, fileUrl }) {
  if (record.download_status === "failed") {
    return (
      <div className="download-link unavailable">
        <span>Download failed</span>
        <small>{record.failure_reason || "The source record can be retried on the next ingest."}</small>
      </div>
    );
  }
  if (!record.media_type) {
    return (
      <a className="download-link" href={fileUrl}>
        <Download size={18} /> Download preserved file
      </a>
    );
  }
  if (record.media_type.startsWith("image/")) {
    return <img className="preview" src={fileUrl} alt={record.title} />;
  }
  if (record.media_type.startsWith("video/")) {
    return <video className="preview" src={fileUrl} controls />;
  }
  if (record.media_type === "application/pdf") {
    return <iframe className="preview" src={fileUrl} title={record.title} />;
  }
  return (
    <a className="download-link" href={fileUrl}>
      <Download size={18} /> Download preserved file
    </a>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "Unknown"}</strong>
    </div>
  );
}

function GlobeView({ locations, openRecord }) {
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    let isMounted = true;
    import("mapbox-gl").then((module) => {
      if (!isMounted || !containerRef.current) return;
      const mapbox = module.default;
      mapbox.accessToken = MAPBOX_TOKEN;
      mapboxRef.current = mapbox;
      mapRef.current = new mapbox.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-96, 38],
        zoom: 1.5,
        projection: "globe",
      });
      mapRef.current.addControl(new mapbox.NavigationControl({ visualizePitch: true }));
      mapRef.current.on("style.load", () => {
        mapRef.current.setFog({
          color: "rgb(7, 14, 10)",
          "high-color": "rgb(15, 60, 44)",
          "space-color": "rgb(0, 0, 0)",
        });
        setMapReady(true);
      });
    });
    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapboxRef.current) return;
    const mapbox = mapboxRef.current;
    const markers = locations.map((location) => {
      const marker = document.createElement("button");
      marker.className = `map-marker ${location.location_source === "inferred" ? "inferred" : ""}`;
      marker.title = location.title;
      marker.addEventListener("click", () => openRecord(location.id));
      return new mapbox.Marker(marker)
        .setLngLat([location.longitude, location.latitude])
        .addTo(mapRef.current);
    });
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [locations, mapReady, openRecord]);

  return (
    <section className="globe-workspace">
      <div className="globe-panel">
        {MAPBOX_TOKEN ? (
          <div className="globe" ref={containerRef} />
        ) : (
          <div className="globe missing-token">
            <Globe2 size={48} />
            <p>Mapbox token missing.</p>
          </div>
        )}
      </div>
      <aside className="location-list">
        <div className="panel-header">
          <MapPin size={18} />
          <h2>Locations</h2>
        </div>
        {locations.length === 0 ? (
          <p className="muted">No geocoded records.</p>
        ) : (
          locations.map((location) => (
            <button key={location.id} className="location-row" onClick={() => openRecord(location.id)}>
              <strong>{location.incident_location || location.title}</strong>
              <span>
                {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
              </span>
              <em>{location.location_source || "unknown"}</em>
            </button>
          ))
        )}
      </aside>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
