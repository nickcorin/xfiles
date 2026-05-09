import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RecordList } from "@/components/RecordList";

export function ArchivePage({ releases, records, selectedRecord, onSelectRecord }) {
  return (
    <section className="rounded-lg border border-primary/20 bg-card/85 p-3 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-1 pb-3">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <h2 className="font-heading text-lg font-medium">Documents</h2>
            <p className="text-sm text-muted-foreground">{records.length} matching source records</p>
          </div>
          {selectedRecord ? <Badge variant="outline">Selected #{selectedRecord.id}</Badge> : null}
        </div>
        {releases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {releases.map((release) => (
              <Button key={release.id} asChild variant="outline" size="sm">
                <a href={release.source_url} target="_blank" rel="noreferrer">
                  {release.release_label}
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No release snapshots yet.
          </p>
        )}
      </div>
      <Separator className="mb-3" />
      <RecordList records={records} selectedRecord={selectedRecord} onSelect={onSelectRecord} />
    </section>
  );
}
