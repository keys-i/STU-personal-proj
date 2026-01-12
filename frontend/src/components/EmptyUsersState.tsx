export function EmptyUsersState() {
  return (
    <div className="emptyState">
      <div className="emptyFace">:(</div>
      <div className="emptyTitle">No users showed up to the party.</div>
      <div className="emptySub">
        Hit the pencil up top to invite the first one.
      </div>

      <div className="emptyArrowWrap" aria-hidden="true">
        <svg className="emptyArrow" viewBox="0 0 220 120">
          <path
            d="M10 95 C 60 30, 120 40, 180 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M178 20 L 205 18 L 190 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
