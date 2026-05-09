import { Archive, Download, Globe2, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ArchivePage } from "@/components/ArchivePage";
import { FilterBar } from "@/components/FilterBar";
import { GlobePage } from "@/components/GlobePage";
import { ReaderPage } from "@/components/ReaderPage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

export function App() {
  const [view, setView] = useState("archive");
  const [releases, setReleases] = useState([]);
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [fileTypes, setFileTypes] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function openRecord(recordId, nextView = "reader") {
    const detail = await api(`/api/records/${recordId}`);
    setSelectedRecord(detail);
    setView(nextView);
  }

  async function loadArchive(nextQuery = query) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (category) params.set("category", category);
      if (reviewState) params.set("review_state", reviewState);
      if (downloadStatus) params.set("download_status", downloadStatus);
      if (fileType) params.set("file_type", fileType);

      const [releaseData, recordData, locationData, fileTypeData] = await Promise.all([
        api("/api/releases"),
        api(`/api/records?${params.toString()}`),
        api("/api/locations"),
        api("/api/file-types"),
      ]);

      setReleases(releaseData);
      setRecords(recordData);
      setLocations(locationData);
      setFileTypes(fileTypeData);
      if (fileType && !fileTypeData.some((option) => option.value === fileType)) {
        setFileType("");
      }
      if (recordData.length === 0) {
        setSelectedRecord(null);
      } else if (selectedRecord == null || !recordData.some((record) => record.id === selectedRecord.id)) {
        const detail = await api(`/api/records/${recordData[0].id}`);
        setSelectedRecord(detail);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadArchive(query);
    }, query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [query, category, reviewState, downloadStatus, fileType]);

  const categories = useMemo(() => {
    const all = records.flatMap((record) => record.categories);
    return [...new Set(all)].sort();
  }, [records]);

  const selectedIndex = useMemo(
    () => records.findIndex((record) => record.id === selectedRecord?.id),
    [records, selectedRecord]
  );

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1800px] flex-col gap-4 p-3 md:p-5">
      <header className="flex flex-col gap-4 rounded-lg border bg-card/80 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-md border bg-primary text-xl font-black text-primary-foreground shadow-sm">
            X
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              PURSUE UAP Archive
            </p>
            <h1 className="font-heading text-2xl font-medium md:text-3xl">
              The files are open.
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="archive">
                <Archive data-icon="inline-start" />
                Archive
              </TabsTrigger>
              <TabsTrigger value="reader">
                <Search data-icon="inline-start" />
                Reader
              </TabsTrigger>
              <TabsTrigger value="globe">
                <Globe2 data-icon="inline-start" />
                Globe
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadArchive()} disabled={loading}>
              {loading ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
              Refresh
            </Button>
            <Button onClick={ingest} disabled={loading}>
              <Download data-icon="inline-start" />
              Ingest
            </Button>
          </div>
        </div>
      </header>

      <FilterBar
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        reviewState={reviewState}
        setReviewState={setReviewState}
        downloadStatus={downloadStatus}
        setDownloadStatus={setDownloadStatus}
        fileType={fileType}
        setFileType={setFileType}
        categories={categories}
        fileTypes={fileTypes}
      />

      {message ? (
        <p className="rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground">{message}</p>
      ) : null}

      {view === "archive" ? (
        <ArchivePage
          releases={releases}
          records={records}
          selectedRecord={selectedRecord}
          onSelectRecord={(recordId) => openRecord(recordId, "reader")}
        />
      ) : null}
      {view === "reader" ? (
        <ReaderPage
          records={records}
          selectedRecord={selectedRecord}
          selectedIndex={selectedIndex}
          onOpenRecord={(recordId) => openRecord(recordId, "reader")}
        />
      ) : null}
      {view === "globe" ? (
        <GlobePage locations={locations} onOpenRecord={(recordId) => openRecord(recordId, "reader")} />
      ) : null}
    </main>
  );
}
