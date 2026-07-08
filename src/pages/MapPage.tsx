import { useState, useRef } from "react";
import { createRoot } from 'react-dom/client';
import { useSearchParams, useNavigate } from "react-router-dom";
import Map, { NavigationControl, Popup } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import { SearchBox } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";


// Shape of the data shown in the popup when a county is clicked
type PopupInfo = {
  longitude: number;
  latitude: number;
  county: string;
  population: number;
  medianRent: number;
  medianHomeValue: number;
  medianIncome: number;
};

function MapPage() {

  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map>();
  const navigate = useNavigate();

  // Read lat/lng from the URL (set by the search on HomePage)
  const [searchParams] = useSearchParams();
  const lat = Number(searchParams.get("lat")) || 32.99815;
  const lng = Number(searchParams.get("lng")) || -83.51424;

  // Search box text
  const [value, setValue] = useState("");

  // Filter panel visibility and values
  const [showFilters, setShowFilters] = useState(false);
  const [population, setPopulation] = useState("");
  const [number, setNumber] = useState<number | string>("");
  const [range, setRange] = useState([100000, 500000]);

  // Info shown in the popup when the user clicks a county
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [activeLayer, setActiveLayer] = useState("Clear");




  // Sends filter values to the backend and narrows which counties are shown on the map
  async function applyFilters() {
    try {
      const minIncome = number ? Number(number) - 15000 : "";
      const maxIncome = number ? Number(number) + 15000 : "";

      const url = `http://localhost:3000/api/areas/filter?minPrice=${range[0]}&maxPrice=${range[1]}${minIncome ? `&minIncome=${minIncome}&maxIncome=${maxIncome}` : ""}${population ? `&populationType=${population}` : ""}`;

      const response = await fetch(url);
      const data = await response.json();

      // Only show counties whose names are in the filtered results
      const names = data.results.map((c: { areaName: string }) => c.areaName);
      if (mapInstance) {
        mapInstance.setFilter("big info", ["in", ["get", "areaName"], ["literal", names]]);
      }

      setShowFilters(false);
    } catch (error) {
      console.log("error:", error);
    }
  }

  // Resets all filters and shows every county again
  function clearFilters() {
    setPopulation("");
    setNumber("");
    setRange([0, 10000000]);
    if (mapInstance) {
      mapInstance.setFilter("big info", null);
    }
  }

  // Opens a popup with county info when the user clicks on the map
  function handleMapClick(e: MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const props = feature.properties;
    setPopupInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      county: props.county,
      population: props.population,
      medianRent: props.medianRent,
      medianHomeValue: props.medianHomeValue,
      medianIncome: props.medianIncome,
    });
  }

  // Choose which visual representation of data is showing
  function switchLayer(layerId: string) {
    setActiveLayer(layerId);
    if (!mapInstance) return;
    mapInstance.setLayoutProperty("high", "visibility", "none");
    mapInstance.setLayoutProperty("bach", "visibility", "none");
    mapInstance.setLayoutProperty("home", "visibility", "none");
    mapInstance.setLayoutProperty("income", "visibility", "none");
    mapInstance.setLayoutProperty("rent", "visibility", "none");
    mapInstance.setLayoutProperty("pop", "visibility", "none");
    mapInstance.setLayoutProperty(layerId, "visibility", "visible");
  }

  // Saves the currently open popup's county to localStorage favorites
  function saveToFavorites() {
    if (!popupInfo) return;
    const existing = JSON.parse(localStorage.getItem("favorites") || "[]");
    existing.push(popupInfo);
    localStorage.setItem("favorites", JSON.stringify(existing));
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* Top bar: search box, Filters button, Favorites button */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1,
          display: "flex",
          gap: "8px",
        }}
      >
        <SearchBox
          accessToken={token}
          map={mapInstance}
          mapboxgl={mapboxgl}
          marker
          value={value}
          onChange={(val) => setValue(val)}
          onRetrieve={(result) => {
            const feature = result.features[0];
            let minLng: number, minLat: number, maxLng: number, maxLat: number;

            // Use the result's bounding box if available, otherwise build one from the center point
            if (feature.bbox) {
              [minLng, minLat, maxLng, maxLat] = feature.bbox;
            } else {
              const [lng, lat] = feature.geometry.coordinates;
              const pad = 0.5;
              minLng = lng - pad; maxLng = lng + pad;
              minLat = lat - pad; maxLat = lat + pad;
            }

            // Filter the map to only show counties within this bounding box
            if (mapInstance) {
              mapInstance.setFilter("big info", ["within", {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [minLng, minLat],
                    [maxLng, minLat],
                    [maxLng, maxLat],
                    [minLng, maxLat],
                    [minLng, minLat],
                  ]],
                },
              }]);
            }
          }}
          placeholder="Search for counties in Georgia"
          options={{
            proximity: [-83.51424, 32.99815],
            bbox: [-85.60518, 30.35538, -80.75488, 34.98466],
          }}
        />

        <button onClick={() => setShowFilters(!showFilters)} className="bg-white px-3 py-1 rounded">
          Filters
        </button>

        <button onClick={() => navigate("/favorites")} className="bg-white px-3 py-1 rounded">
          Favorites
        </button>
      </div>

      {/* Filter panel — shown when user clicks the Filters button */}
      {showFilters && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white rounded-xl p-6 shadow-md w-80">
          <h2 className="text-lg font-medium mb-4">Population</h2>
          <div className="flex gap-12 pb-4">
            <button
              onClick={() => setPopulation("urban")}
              className={
                population === "urban"
                  ? "w-20 h-10 rounded-lg bg-blue-600 text-white"
                  : "w-20 h-10 rounded-lg bg-gray-300 hover:bg-gray-400"
              }
            >
              Urban
            </button>
            <button
              onClick={() => setPopulation("suburban")}
              className={
                population === "suburban"
                  ? "w-20 h-10 rounded-lg bg-blue-600 text-white"
                  : "w-20 h-10 rounded-lg bg-gray-300 hover:bg-gray-400"
              }
            >
              Suburban
            </button>
            <button
              onClick={() => setPopulation("rural")}
              className={
                population === "rural"
                  ? "w-20 h-10 rounded-lg bg-blue-600 text-white"
                  : "w-20 h-10 rounded-lg bg-gray-300 hover:bg-gray-400"
              }
            >
              Rural
            </button>
          </div>

          <div className="pb-4">
            <h2 className="text-lg font-medium mb-4">Yearly Income</h2>
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <h2 className="text-lg font-medium mb-4">Price Range</h2>
          <div className="flex justify-between mb-4">
            <span className="text-gray-500 text-sm">
              Min: <strong>${range[0].toLocaleString()}</strong>
            </span>
            <span className="text-gray-500 text-sm">
              Max: <strong>${range[1].toLocaleString()}</strong>
            </span>
          </div>

          <Slider
            range
            min={0}
            max={1000000}
            step={1000}
            value={range}
            onChange={(val) => setRange(val as number[])}
          />

          <button
            onClick={applyFilters}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>

          <button
            onClick={clearFilters}
            className="mt-2 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* The main map */}
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        onLoad={() => {
          const map = mapRef.current?.getMap();
          setMapInstance(map);

          // If the user arrived from a search, zoom into that area once the map is ready
          const searchLat = Number(searchParams.get("lat"));
          const searchLng = Number(searchParams.get("lng"));
          if (searchLat && searchLng && map) {
            const pad = 0.5;
            map.once("idle", () => {
              map.setFilter("big info", ["within", {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [searchLng - pad, searchLat - pad],
                    [searchLng + pad, searchLat - pad],
                    [searchLng + pad, searchLat + pad],
                    [searchLng - pad, searchLat + pad],
                    [searchLng - pad, searchLat - pad],
                  ]],
                },
              }]);
            });
          }
        }}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 6 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/d-peters/cmqfkvh9a00d301s392w72eku"
        interactiveLayerIds={["big info", "big info again"]}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" />

        {/* Popup shown when a county is clicked */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div>
              <h3 style={{ fontWeight: "bold", marginBottom: 4 }}>{popupInfo.county}</h3>
              <p>Population: {popupInfo.population.toLocaleString()}</p>
              <p>Median Rent: ${popupInfo.medianRent.toLocaleString()}</p>
              <p>Home Value: ${popupInfo.medianHomeValue.toLocaleString()}</p>
              <p>Median Income: ${popupInfo.medianIncome.toLocaleString()}</p>
              <button onClick={saveToFavorites} className="border rounded-lg p-2">
                Favorite
              </button>
            </div>
          </Popup>

        )}
      </Map>

      {/* Bottom bar: choropleth changer*/}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 300,
          zIndex: 1,
          display: "flex",
          gap: "30px",
        }}
      >
        <label>
          <input type="radio" name="choropleth" value="Clear" checked={activeLayer === ""} onChange={() => switchLayer("")} />
          Clear
        </label>

        <label>
          <input type="radio" name="choropleth" value="Population" checked={activeLayer === "pop"} onChange={() => switchLayer("pop")} />

          Population
        </label>

        <label>
          <input type="radio" name="choropleth" value="Median Income" checked={activeLayer === "income"} onChange={() => switchLayer("income")} />
          Median Income
        </label>

        <label>
          <input type="radio" name="choropleth" value="Median Rent" checked={activeLayer === "rent"} onChange={() => switchLayer("rent")} />
          Median Rent
        </label>

        <label>
          <input type="radio" name="choropleth" value="Median Home Value" checked={activeLayer === "home"} onChange={() => switchLayer("home")} />
          Median Home Value
        </label>

        <label>
          <input type="radio" name="choropleth" value="Bachelors Degree Rate" checked={activeLayer === "bach"} onChange={() => switchLayer("bach")} />
          Bachelors Degree Rate
        </label>

        <label>
          <input type="radio" name="choropleth" value="High School Graduation Rate" checked={activeLayer === "high"} onChange={() => switchLayer("high")} />
          High School Graduation Rate
        </label>

      </div>
    </div>
  );
}

export default MapPage;
