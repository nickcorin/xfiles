import { Archive, BookOpen, Database, Globe2, Home } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ArchivePage } from "@/components/ArchivePage";
import { FilterBar } from "@/components/FilterBar";
import { GlobePage } from "@/components/GlobePage";
import { InteractiveGridBackground } from "@/components/InteractiveGridBackground";
import { LandingPage } from "@/components/LandingPage";
import { ReaderPage } from "@/components/ReaderPage";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

const navigationIcons = {
  home: Home,
  archive: Archive,
  reader: BookOpen,
  globe: Globe2,
};

const emptyFilters = {
  category: "",
  review_state: "",
  download_status: "",
  file_type: "",
};

function metricCards(releases, records, locations) {
  const totalRecords = releases.reduce((total, release) => total + release.record_count, 0);
  const failedRecords = releases.reduce((total, release) => total + release.failure_count, 0);
  return [
    { label: "Released", value: totalRecords },
    { label: "In view", value: records.length },
    { label: "Mapped", value: locations.length },
    { label: "Failed", value: failedRecords },
  ];
}

export function App() {
  const [view, setView] = useState("home");
  const [interfaceData, setInterfaceData] = useState(null);
  const [releases, setReleases] = useState([]);
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
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
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const [nextInterfaceData, releaseData, recordData, locationData] = await Promise.all([
        api("/api/ui"),
        api("/api/releases"),
        api(`/api/records?${params.toString()}`),
        api("/api/locations"),
      ]);

      setInterfaceData(nextInterfaceData);
      setReleases(releaseData);
      setRecords(recordData);
      setLocations(locationData);
      setFilters((currentFilters) => sanitizeFilters(currentFilters, nextInterfaceData.filters));
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

  function setFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadArchive(query);
    }, query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [query, filters]);

  const selectedIndex = useMemo(
    () => records.findIndex((record) => record.id === selectedRecord?.id),
    [records, selectedRecord]
  );

  useEffect(() => {
    if (interfaceData) {
      document.title = interfaceData.brand.name;
    }
  }, [interfaceData]);

  const activeNavigation = interfaceData?.navigation.find((item) => item.value === view);
  const stats = metricCards(releases, records, locations);

  if (!interfaceData) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Loading archive interface.
        </div>
      </main>
    );
  }

  if (view === "home") {
    return (
      <>
        <InteractiveGridBackground />
        <LandingPage
          brand={interfaceData.brand}
          releases={releases}
          records={records}
          locations={locations}
          onNavigate={setView}
        />
      </>
    );
  }

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-[1840px] gap-4 p-3 lg:grid-cols-[280px_minmax(0,1fr)] md:p-5">
      <aside className="flex flex-col gap-4 rounded-lg border bg-card/80 p-4 shadow-sm backdrop-blur lg:sticky lg:top-5 lg:h-[calc(100svh-2.5rem)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{interfaceData.brand.eyebrow}</p>
            <h1 className="mt-1 font-heading text-3xl font-semibold">{interfaceData.brand.name}</h1>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="grid h-auto grid-cols-1 gap-1 bg-muted/30 p-1">
              {interfaceData.navigation.map((item) => {
                const Icon = navigationIcons[item.value] || Database;
                return (
                  <TabsTrigger key={item.value} value={item.value} className="justify-start">
                    <Icon data-icon="inline-start" />
                    {item.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{interfaceData.brand.description}</p>

        <div className="grid grid-cols-2 gap-2">
          {stats.map((item) => (
            <Card key={item.label} size="sm">
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-xl">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-lg border bg-card/70 p-4 shadow-sm backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {loading ? <Badge variant="secondary">Syncing</Badge> : <Badge variant="outline">Live API</Badge>}
              {message ? <Badge variant="destructive">API notice</Badge> : null}
            </div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              {activeNavigation?.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeNavigation?.description}</p>
          </div>
          {message ? <p className="max-w-xl text-sm text-muted-foreground">{message}</p> : null}
        </header>

        {view === "archive" ? (
          <FilterBar
            query={query}
            setQuery={setQuery}
            filters={filters}
            setFilter={setFilter}
            filterGroups={interfaceData.filters}
          />
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
      </section>
    </main>
  );
}

function sanitizeFilters(currentFilters, filterGroups) {
  let changed = false;
  const nextFilters = filterGroups.reduce((next, group) => {
    const currentValue = currentFilters[group.value] || "";
    const values = new Set(group.options.map((option) => option.value));
    if (currentValue && !values.has(currentValue)) {
      changed = true;
      return { ...next, [group.value]: "" };
    }
    return next;
  }, currentFilters);
  return changed ? nextFilters : currentFilters;
}
