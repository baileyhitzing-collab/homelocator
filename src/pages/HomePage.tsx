import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBox } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import NavBar from "../components/NavBar";

function HomePage() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  // Stores the lat/lng of the location the user picked from the search box
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <div
      className="min-h-screen overflow-hidden relative"
      style={{
        backgroundImage: "url('mountain.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay on top of the background image */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1 }} />

      {/* Top navigation bar */}
      <div style={{ zIndex: 2, position: "relative" }}>
        <NavBar />
      </div>

      {/*  Headline text */}
      <div className="text-6xl absolute" style={{ top: "10vh", left: "50vw", zIndex: 2 }}>
        <h1 className="text-white" style={{ fontSize: "10vw" }}>Home is where the heart is.</h1>
        <p className="text-white">Find your place.</p>
      </div>

      {/* Search card */}
      <div
        className="bg-white shadow-md absolute rounded-lg p-5"
        style={{ top: "50vh", left: "5vw", zIndex: 2, width: "clamp(340px, 40vw, 620px)" }}
      >
        <h1 className="text-5xl font-medium">Where do you want to live?</h1>
        <div className="flex flex-col items-center justify-center gap-4 mt-5">
          <div className="flex items-center gap-2" style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)" }}>
            <SearchBox
              accessToken={token}
              mapboxgl={mapboxgl}
              value={value}
              onChange={(val) => setValue(val)}
              onRetrieve={(result) => {
                // Save the coordinates when the user picks a location
                const [lng, lat] = result.features[0].geometry.coordinates;
                setCoords({ lat, lng });
              }}
              placeholder="Search for a county or area"
            />
            <button
              onClick={() => {
                // Go to the map, passing the selected coordinates as URL params
                if (coords) {
                  navigate(`/map?lat=${coords.lat}&lng=${coords.lng}`);
                } else {
                  navigate("/map");
                }
              }}
              className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 text-2xl"
              style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)", width: "clamp(100px, 8vw, 160px)" }}
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
