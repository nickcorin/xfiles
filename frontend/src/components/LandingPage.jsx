import { Archive, FileSearch, Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatReleaseDate(value) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function latestReleaseDate(latestRelease, records) {
  if (!latestRelease) return "Pending";

  const releaseRecord = records.find((record) => record.release_id === latestRelease.id);
  return formatReleaseDate(releaseRecord?.source_metadata?.["Release Date"] || latestRelease.fetched_at);
}

function releaseStats(releases, records) {
  const totalRecords = releases.reduce((total, release) => total + release.record_count, 0) || records.length;
  const latestRelease = releases[0];

  return [
    { label: "Releases", value: releases.length },
    { label: "Released files", value: totalRecords },
    { label: "Latest release", value: latestReleaseDate(latestRelease, records) },
  ];
}

export function LandingPage({ releases, records, onNavigate }) {
  const stats = releaseStats(releases, records);

  return (
    <main className="relative min-h-svh overflow-hidden">
      <section className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 md:px-8">
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-9 text-center">
            <div className="flex max-w-3xl flex-col items-center gap-5">
              <p className="text-sm font-medium uppercase text-muted-foreground">War.gov/UFO archive</p>
              <h2 className="max-w-3xl font-heading text-5xl font-semibold leading-none md:text-7xl">
                The files are open.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Browse, search, and map the public release files without losing their original source links.
              </p>
            </div>

            <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <Card
                  key={item.label}
                  size="sm"
                  className="border-primary/20 bg-card/85 text-center shadow-lg shadow-primary/5 ring-primary/15 backdrop-blur-md"
                >
                  <CardHeader>
                    <CardDescription>{item.label}</CardDescription>
                    <CardTitle className="text-3xl md:text-4xl">{item.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="min-w-40" onClick={() => onNavigate("archive")}>
                <FileSearch data-icon="inline-start" />
                Browse documents
              </Button>
              <Button size="lg" variant="outline" className="min-w-36" onClick={() => onNavigate("archive")}>
                <Archive data-icon="inline-start" />
                View releases
              </Button>
              <Button size="lg" variant="ghost" className="min-w-32" onClick={() => onNavigate("globe")}>
                <Globe2 data-icon="inline-start" />
                Open map
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
