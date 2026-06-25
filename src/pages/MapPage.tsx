import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";

import type { MapRef } from "react-map-gl/mapbox";
import { SearchBox } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";




function MapPage() {
  const [value, setValue] = useState("");
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map>();
  const mapRef = useRef<MapRef>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const [showFilters, setShowFilters] = useState(false);
  const [population, setPopulation] = useState("");
  const [number, setNumber] = useState<number | string>("");
  const [range, setRange] = useState([100000, 500000]);
  const [searchParams] = useSearchParams();
  const lat = Number(searchParams.get("lat")) || 32.99815;
  const lng = Number(searchParams.get("lng")) || -83.51424;
const [popupInfo, setPopupInfo] = useState<{
  longitude: number;
  latitude: number;
  county: string;
  population: number;
  medianRent: number;
  medianHomeValue: number;
  medianIncome: number;
} | null>(null);



async function applyFilters() {
  try{
  
  const minIncome = number ? Number(number) - 15000 : "";
  const maxIncome = number ? Number(number) + 15000 : "";

  const url = `http://localhost:3000/api/areas/filter?minPrice=${range[0]}&maxPrice=${range[1]}${minIncome ? `&minIncome=${minIncome}&maxIncome=${maxIncome}` : ""}${population ? `&populationType=${population}` : ""}`;

 

  const response = await fetch(url);
  const data = await response.json();
   console.log("url:", url)
console.log("results:", data.results)

  const names = data.results.map((c: { areaName: string }) => c.areaName);

  if (mapInstance) {
    mapInstance.setFilter("big info", ["in", ["get", "areaName"], ["literal", names]]);
  }

  setShowFilters(false);
}catch(error){
  console.log("error:", error)
} 
}

function handleMapClick(e: any) {
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



  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
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
          placeholder="Search for houses in Georgia"
          options={{
            proximity: [-83.51424, 32.99815],
            bbox: [-85.60518, 30.35538, -80.75488, 34.98466],
          }}
        />

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white px-3 py-1 rounded"
        >
          Filters
        </button>
      </div>

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
            <h2 className="text-lg font-medium mb-4"> Yearly Income </h2>
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            ></input>
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
        </div>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        onLoad={() => setMapInstance(mapRef.current?.getMap())}
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 8,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/d-peters/cmqfkvh9a00d301s392w72eku"
        interactiveLayerIds={["big info", "big info again"]}
        onClick={handleMapClick}
      >
        
        <NavigationControl position="top-right" />
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
    </div>
  </Popup>
)}

      </Map>
    </div>
  );
}

export default MapPage;
