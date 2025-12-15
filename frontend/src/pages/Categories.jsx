import { Link } from "react-router-dom";

const categories = [
  { id: "TRACE", name: "Trace It" },
  { id: "SPOT_THE_BUG", name: "Spot The Bug" },
  { id: "BINARY_BLITZ", name: "Binary Blitz" },
  { id: "CONCEPT_CLASH", name: "Concept Clash" },
];

export default function Categories() {
  return (
    <div className="container">
      <h2>Select Category</h2>
      {categories.map((c) => (
        <Link key={c.id} to={`/difficulty/${c.id}`}>
          <button>{c.name}</button>
        </Link>
      ))}
    </div>
  );
}
