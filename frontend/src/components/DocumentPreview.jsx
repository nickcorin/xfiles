import { Download, FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

export function DocumentPreview({ record }) {
  if (!record) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        Select a document.
      </div>
    );
  }

  const fileUrl = `${API_BASE_URL}/api/records/${record.id}/file`;

  if (record.download_status === "failed") {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed bg-destructive/10 p-6 text-center">
        <div className="flex max-w-md flex-col items-center gap-3">
          <FileWarning className="size-8 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-medium">Download failed</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {record.failure_reason || "This source record can be retried on the next ingest."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (record.media_type?.startsWith("image/")) {
    return (
      <img
        className="max-h-[72vh] min-h-[360px] w-full rounded-lg border bg-muted object-contain"
        src={fileUrl}
        alt={record.title}
      />
    );
  }

  if (record.media_type?.startsWith("video/")) {
    return <video className="max-h-[72vh] w-full rounded-lg border bg-muted" src={fileUrl} controls />;
  }

  if (record.media_type === "application/pdf") {
    return <iframe className="h-[72vh] w-full rounded-lg border bg-muted" src={fileUrl} title={record.title} />;
  }

  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border bg-muted/20">
      <Button asChild>
        <a href={fileUrl}>
          <Download data-icon="inline-start" />
          Download
        </a>
      </Button>
    </div>
  );
}
