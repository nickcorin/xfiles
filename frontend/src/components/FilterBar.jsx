import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function valueOrAll(value) {
  return value || "all";
}

function fromSelectValue(value) {
  return value === "all" ? "" : value;
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={valueOrAll(value)} onValueChange={(nextValue) => onChange(fromSelectValue(nextValue))}>
      <SelectTrigger className="w-full md:w-44">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function FilterBar({
  query,
  setQuery,
  category,
  setCategory,
  reviewState,
  setReviewState,
  downloadStatus,
  setDownloadStatus,
  fileType,
  setFileType,
  categories,
  fileTypes,
}) {
  const categoryOptions = categories.map((item) => ({ value: item, label: item }));
  const reviewOptions = [
    { value: "unreviewed", label: "Unreviewed" },
    { value: "reviewed", label: "Reviewed" },
    { value: "follow-up", label: "Follow-up" },
  ];
  const downloadOptions = [
    { value: "downloaded", label: "Downloaded" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <section className="grid gap-3 rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur md:grid-cols-[minmax(280px,1fr)_repeat(4,auto)]">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search records, extracted text, metadata"
        />
      </label>
      <FilterSelect value={category} onChange={setCategory} placeholder="All categories" options={categoryOptions} />
      <FilterSelect value={reviewState} onChange={setReviewState} placeholder="All review states" options={reviewOptions} />
      <FilterSelect value={downloadStatus} onChange={setDownloadStatus} placeholder="All download states" options={downloadOptions} />
      <FilterSelect value={fileType} onChange={setFileType} placeholder="All file types" options={fileTypes} />
    </section>
  );
}
