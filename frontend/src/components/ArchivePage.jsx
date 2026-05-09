import { ExternalLink, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RecordList } from "@/components/RecordList";

export function ArchivePage({ releases, records, selectedRecord, onSelectRecord }) {
  const recordCount = releases.reduce((total, release) => total + release.record_count, 0);
  const failureCount = releases.reduce((total, release) => total + release.failure_count, 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Records</CardDescription>
              <CardTitle className="text-2xl">{recordCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl">{failureCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="rounded-lg border bg-card/70 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Releases
          </div>
          <div className="flex flex-col gap-2">
            {releases.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No release snapshots yet.
              </p>
            ) : (
              releases.map((release) => (
                <Card key={release.id} size="sm">
                  <CardHeader>
                    <CardTitle>{release.release_label}</CardTitle>
                    <CardDescription>{release.title}</CardDescription>
                    <CardAction>
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Open source release">
                        <a href={release.source_url} target="_blank" rel="noreferrer">
                          <ExternalLink />
                        </a>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{release.record_count} records</Badge>
                    {release.failure_count ? (
                      <Badge variant="destructive">{release.failure_count} failed</Badge>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="rounded-lg border bg-card/70 p-3">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <h2 className="font-heading text-lg font-medium">Records</h2>
            <p className="text-sm text-muted-foreground">{records.length} matching source records</p>
          </div>
          {selectedRecord ? <Badge variant="outline">Selected #{selectedRecord.id}</Badge> : null}
        </div>
        <Separator className="mb-3" />
        <RecordList records={records} selectedRecord={selectedRecord} onSelect={onSelectRecord} />
      </section>
    </section>
  );
}
