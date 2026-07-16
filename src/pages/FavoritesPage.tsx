import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import type { PopupInfo } from "./MapPage";

function FavoritesPage() {
  const navigate = useNavigate();

  // Load saved favorites from localStorage as the initial state
  const [favorites, setFavorites] = useState<PopupInfo[]>(() =>
    JSON.parse(localStorage.getItem("favorites") || "[]")
  );

  // Removes a single favorite by its position in the list
  function removeFavorite(index: number) {
    const updated = favorites.filter((_, i) => i !== index);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl font-medium mb-4">Favorites</h1>
          <p className="text-gray-500 text-lg mb-6">
            You haven't favorited any counties yet.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/map")}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-5xl font-medium">Favorites</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/map")}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Map
            </button>
          </div>
        </div>

        {favorites.map((county, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-md mb-4">
            <h2 className="text-2xl font-medium mb-2">{county.county}</h2>
            <p>Population: {Number(county.population).toLocaleString()}</p>
            <p>Median Rent: ${Number(county.medianRent).toLocaleString()}</p>
            <p>Home Value: ${Number(county.medianHomeValue).toLocaleString()}</p>
            <p>Median Income: ${Number(county.medianIncome).toLocaleString()}</p>
            <button
              onClick={() => removeFavorite(index)}
              className="mt-3 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FavoritesPage;
