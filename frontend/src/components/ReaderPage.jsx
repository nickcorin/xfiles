import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { DocumentPreview } from "@/components/DocumentPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { fileLabel, recordAgency, shortHash } from "@/lib/records";

function MetadataItem({ label, value }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value || "Unknown"}</dd>
    </div>
  );
}

export function ReaderPage({ records, selectedRecord, selectedIndex, onOpenRecord }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(selectedRecord);

  useEffect(() => {
    setCurrentRecord(selectedRecord);
    setNote("");
  }, [selectedRecord]);

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
      <section className="grid min-h-[56vh] place-items-center rounded-lg border border-dashed border-primary/20 bg-card/85 p-8 text-center shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
        <div>
          <h2 className="font-heading text-2xl font-medium">No document selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose a record from the archive to open the reader.</p>
        </div>
      </section>
    );
  }

  const previousRecord = selectedIndex > 0 ? records[selectedIndex - 1] : null;
  const nextRecord = selectedIndex >= 0 && selectedIndex < records.length - 1 ? records[selectedIndex + 1] : null;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-lg border border-primary/20 bg-card/85 p-3 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-3 p-1 pb-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={currentRecord.download_status === "failed" ? "destructive" : "secondary"}>
                {fileLabel(currentRecord)}
              </Badge>
              <Badge variant="outline">{recordAgency(currentRecord)}</Badge>
              {currentRecord.incident_location ? (
                <Badge variant="outline">{currentRecord.incident_location}</Badge>
              ) : null}
            </div>
            <h2 className="break-words font-heading text-2xl font-medium">
              {currentRecord.title}
            </h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={!previousRecord}
              onClick={() => previousRecord && onOpenRecord(previousRecord.id)}
            >
              <ChevronLeft data-icon="inline-start" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!nextRecord}
              onClick={() => nextRecord && onOpenRecord(nextRecord.id)}
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
        <DocumentPreview record={currentRecord} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <section className="rounded-lg border border-primary/20 bg-card/85 p-4 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-medium">Source</h3>
            <Button asChild variant="outline" size="sm">
              <a href={currentRecord.source_url} target="_blank" rel="noreferrer">
                Source
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          </div>
          <dl className="mt-4 grid gap-2">
            <MetadataItem label="Filename" value={currentRecord.original_filename} />
            <MetadataItem label="SHA-256" value={shortHash(currentRecord.content_hash)} />
            <MetadataItem label="Incident date" value={currentRecord.incident_date} />
            <MetadataItem label="Location source" value={currentRecord.location_source} />
          </dl>
        </section>

        <section className="rounded-lg border border-primary/20 bg-card/85 p-4 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
          <h3 className="font-heading text-lg font-medium">Extracted text</h3>
          <ScrollArea className="mt-3 h-52 rounded-lg border bg-muted/20 p-3">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {currentRecord.extracted_text || "No extractable text."}
            </pre>
          </ScrollArea>
        </section>

        <section className="rounded-lg border border-primary/20 bg-card/85 p-4 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md">
          <h3 className="font-heading text-lg font-medium">Notes</h3>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an analysis note" />
            <Button onClick={addNote} disabled={saving || !note.trim()}>
              {saving ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
              Add note
            </Button>
          </div>
          {currentRecord.notes?.length ? <Separator className="my-4" /> : null}
          <div className="flex flex-col gap-2">
            {currentRecord.notes?.map((item) => (
              <article className="rounded-lg border bg-muted/20 p-3" key={item.id}>
                <p className="text-sm leading-6">{item.body}</p>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {item.author} · {item.source}
                </span>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
