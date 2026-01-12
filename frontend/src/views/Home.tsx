// src/views/Home.tsx
import { Link } from "react-router-dom";
import "../App.css";

export function Home() {
  return (
    <div className="homeWrap">
      <div className="spellStage" aria-hidden="true">
        <div className="spellBook">
          <div className="spellCover" />
          <div className="spellPages" />
          <div className="spellRune" />
          <div className="spellDust" />
        </div>
      </div>

      <div className="homeText">
        <div className="homeKicker">Spellbook loaded</div>
        <h1 className="homeTitle">Open the ledger</h1>
        <p className="homeSub">
          Head to the users view to create, search, edit, and soft-delete.
        </p>

        <div className="homeActions">
          <Link className="homeBtn" to="/view">
            Enter /view
          </Link>
        </div>
      </div>
    </div>
  );
}
