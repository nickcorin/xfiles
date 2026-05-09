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
              {option.count ? `${option.label} (${option.count})` : option.label}
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
  filters,
  setFilter,
  filterGroups,
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-primary/20 bg-card/85 p-3 shadow-lg shadow-primary/5 ring-1 ring-primary/15 backdrop-blur-md md:grid-cols-[minmax(280px,1fr)_repeat(4,auto)]">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search records, extracted text, metadata"
        />
      </label>
      {filterGroups.map((group) => (
        <FilterSelect
          key={group.value}
          value={filters[group.value] || ""}
          onChange={(nextValue) => setFilter(group.value, nextValue)}
          placeholder={group.placeholder}
          options={group.options}
        />
      ))}
    </section>
  );
}
