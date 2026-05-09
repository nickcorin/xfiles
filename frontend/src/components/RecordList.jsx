import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fileLabel, recordAgency } from "@/lib/records";

export function RecordList({ records, selectedRecord, onSelect }) {
  if (records.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No records match the current filters.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-17rem)] min-h-[420px] overflow-y-auto pr-3">
      <div className="flex flex-col gap-2">
        {records.map((record) => (
          <button
            className={cn(
              "group grid gap-2 rounded-lg border bg-card p-3 text-left text-card-foreground transition hover:border-primary/40 hover:bg-accent/60",
              selectedRecord?.id === record.id && "border-primary/60 bg-primary/10"
            )}
            key={record.id}
            onClick={() => onSelect(record.id)}
          >
            <span className="line-clamp-2 font-heading text-sm font-medium leading-snug">{record.title}</span>
            <span className="text-xs text-muted-foreground">{recordAgency(record)}</span>
            <span className="flex flex-wrap gap-1.5">
              <Badge variant={record.download_status === "failed" ? "destructive" : "secondary"}>
                {fileLabel(record)}
              </Badge>
              {record.incident_location ? <Badge variant="outline">{record.incident_location}</Badge> : null}
              <Badge variant="outline">{record.review_state}</Badge>
            </span>
            {record.match_reasons.length > 0 ? (
              <span className="text-xs text-muted-foreground">Matched {record.match_reasons.join(", ")}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
