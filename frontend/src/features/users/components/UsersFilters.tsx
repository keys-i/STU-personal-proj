import type { UserStatus } from "../types";

export type FilterState = {
  name: string;
  status: UserStatus | "";
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
};

const STATUSES: (UserStatus | "")[] = ["", "ACTIVE", "INACTIVE", "SUSPENDED"];

export function UsersFilters(props: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  limit: number;
  onLimitChange: (n: number) => void;
  onApply: () => void;
}) {
  const v = props.value;

  return (
    <div className="filtersPanel">
      <div className="filtersAdvanced">
        <label>
          Status
          <select
            value={v.status}
            onChange={(e) =>
              props.onChange({
                ...v,
                status: e.target.value as FilterState["status"],
              })
            }
          >
            {STATUSES.map((s) => (
              <option key={s || "any"} value={s}>
                {s || "(any)"}
              </option>
            ))}
          </select>
        </label>

        <label>
          From date
          <input
            type="date"
            value={v.fromDate}
            onChange={(e) => props.onChange({ ...v, fromDate: e.target.value })}
          />
        </label>

        <label>
          To date
          <input
            type="date"
            value={v.toDate}
            onChange={(e) => props.onChange({ ...v, toDate: e.target.value })}
          />
        </label>

        <label>
          Limit
          <select
            value={props.limit}
            onChange={(e) => props.onLimitChange(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="row" style={{ alignSelf: "end" }}>
          <button type="button" onClick={props.onApply}>
            Apply
          </button>
        </div>
      </div>

      <div className="muted small">
        Note: search is at the top. These are the advanced filters.
      </div>
    </div>
  );
}
