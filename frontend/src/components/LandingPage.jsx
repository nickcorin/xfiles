import { Archive, ArrowRight, FileSearch, Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function releaseStats(releases, records, locations) {
  const totalRecords = releases.reduce((total, release) => total + release.record_count, 0) || records.length;
  return [
    { label: "Released files", value: totalRecords },
    { label: "Releases", value: releases.length },
    { label: "Mapped locations", value: locations.length },
  ];
}

export function LandingPage({ brand, releases, records, locations, onNavigate }) {
  const stats = releaseStats(releases, records, locations);
  const latestRelease = releases[0];

  return (
    <main className="relative min-h-svh overflow-hidden">
      <section className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-5 md:px-8 md:py-7">
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

        <div className="flex flex-1 items-center justify-center py-16">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-9 text-center">
            <div className="flex max-w-3xl flex-col items-center gap-5">
              <p className="text-sm font-medium uppercase text-muted-foreground">Public release analysis</p>
              <h2 className="max-w-3xl font-heading text-5xl font-semibold leading-none md:text-7xl">
                The archive for what was released.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {brand.description}
              </p>
            </div>

            <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <Card
                  key={item.label}
                  size="sm"
                  className="border-primary/20 bg-card/85 text-center shadow-lg shadow-primary/5 ring-primary/15 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-primary/10 hover:ring-primary/30"
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

            <p className="min-h-5 text-sm text-muted-foreground">
              {latestRelease
                ? `Latest release: ${latestRelease.release_label} with ${latestRelease.record_count} files.`
                : "Release metadata will appear once the archive is loaded."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
