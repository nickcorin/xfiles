import { Archive, ArrowRight, ExternalLink, FileSearch, Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function releaseStats(releases, records, locations) {
  const totalRecords = releases.reduce((total, release) => total + release.record_count, 0);
  const failedRecords = releases.reduce((total, release) => total + release.failure_count, 0);
  return [
    { label: "Released files", value: totalRecords },
    { label: "Release snapshots", value: releases.length },
    { label: "Mapped records", value: locations.length },
    { label: "Needs retry", value: failedRecords },
    { label: "Search window", value: records.length },
  ];
}

export function LandingPage({ brand, releases, records, locations, onNavigate }) {
  const stats = releaseStats(releases, records, locations);
  const latestReleases = releases.slice(0, 3);

  return (
    <main className="relative min-h-svh overflow-hidden">
      <section className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-between gap-10 p-5 md:p-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{brand.eyebrow}</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">{brand.name}</h1>
          </div>
          <Button variant="outline" onClick={() => onNavigate("archive")}>
            Documents
            <ArrowRight data-icon="inline-end" />
          </Button>
        </header>

        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase text-muted-foreground">Public release analysis</p>
            <h2 className="mt-3 max-w-2xl font-heading text-5xl font-semibold leading-none md:text-7xl">
              The archive for what was released.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {brand.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => onNavigate("archive")}>
                <FileSearch data-icon="inline-start" />
                Browse documents
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate("archive")}>
                <Archive data-icon="inline-start" />
                View releases
              </Button>
              <Button size="lg" variant="ghost" onClick={() => onNavigate("globe")}>
                <Globe2 data-icon="inline-start" />
                Open map
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {stats.map((item) => (
              <Card key={item.label} size="sm" className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-3xl">{item.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          {latestReleases.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur md:col-span-3">
              <CardHeader>
                <CardTitle>No release snapshots</CardTitle>
                <CardDescription>Release metadata will appear here once the archive is loaded.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            latestReleases.map((release) => (
              <Card key={release.id} className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>{release.release_label}</CardTitle>
                  <CardDescription>{release.title}</CardDescription>
                  <CardAction>
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Open original release">
                      <a href={release.source_url} target="_blank" rel="noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{release.record_count} records</span>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("archive")}>
                    Review
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
