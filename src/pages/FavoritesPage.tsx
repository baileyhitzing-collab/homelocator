import { useState } from "react";

function FavoritesPage() {
  // Load saved favorites from localStorage as the initial state
  const [favorites, setFavorites] = useState<any[]>(() =>
    JSON.parse(localStorage.getItem("favorites") || "[]")
  );

  // Removes a single favorite by its position in the list
  function removeFavorite(index: number) {
    const updated = favorites.filter((_, i) => i !== index);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  }

  return (
    <div>
      <h1>Favorites</h1>
      {favorites.map((county, index) => (
        <div key={index} className="border rounded-lg p-4 mb-4 shadow-sm">
          <h2 className="text-xl font-bold mb-2">{county.county}</h2>
          <p>Population: {Number(county.population).toLocaleString()}</p>
          <p>Median Rent: ${Number(county.medianRent).toLocaleString()}</p>
          <p>Home Value: ${Number(county.medianHomeValue).toLocaleString()}</p>
          <p>Median Income: ${Number(county.medianIncome).toLocaleString()}</p>
          <button onClick={() => removeFavorite(index)} className="border p-2 bg-white rounded-lg">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default FavoritesPage;
