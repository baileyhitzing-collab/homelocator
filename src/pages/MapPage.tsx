import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Map, { NavigationControl, Popup } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import { SearchBox } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import NavBar from "../components/NavBar";


// Shape of the data shown in the popup when a county is clicked
export type PopupInfo = {
  longitude: number;
  latitude: number;
  county: string;
  population: number;
  medianRent: number;
  medianHomeValue: number;
  medianIncome: number;
  //schools: string/url?;
};

type MapArea = {
  areaName: string;
  latitude: number | null;
  longitude: number | null;
};

type RecommendationResult = {
  areaName: string;
  population: number;
  medianIncome: number;
  medianHomeValue: number;
  medianRent: number;
  highSchoolRate: number | null;
  bachelorRate: number | null;
  stateCode: string;
  countyCode: string;
  score: number;
  grade: string;
  recommendationReason: {
    strengths: string[];
    considerations: string[];
  };
};

function buildBoundsFilter(bounds: [number, number, number, number]): mapboxgl.FilterSpecification {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return ["within", {
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
  }
  ]

}

// Degrees of padding applied around a single search point vs. an existing result bounding box
const SEARCH_PAD = 0.5;
const BBOX_PAD = 0.3;

// Pads a center point out into a bounding box
function boundsFromPoint(lng: number, lat: number, pad: number): [number, number, number, number] {
  return [lng - pad, lat - pad, lng + pad, lat + pad];
}

// Pads an existing bounding box outward on all sides
function padBounds(bbox: [number, number, number, number], pad: number): [number, number, number, number] {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return [minLng - pad, minLat - pad, maxLng + pad, maxLat + pad];
}

function MapPage() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const apiUrl = import.meta.env.VITE_API_URL;
  const mapRef = useRef<MapRef>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map>();
  const navigate = useNavigate();

  // Read lat/lng from the URL (set by the search on HomePage)
  const [searchParams, setSearchParams] = useSearchParams();
  const lat = Number(searchParams.get("lat")) || 32.99815;
  const lng = Number(searchParams.get("lng")) || -83.51424;

  // Search box text
  const [value, setValue] = useState("");

  // Filter panel visibility and values
  const [showFilters, setShowFilters] = useState(false);
  const [population, setPopulation] = useState("");
  const [number, setNumber] = useState<number | string>("");
  const [range, setRange] = useState([100000, 500000]);
  // Whether the current price/income/population filters should still apply
  // the next time the search area changes (e.g. via a new search)
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Info shown in the popup when the user clicks a county
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [mapAreas, setMapAreas] = useState<MapArea[]>([]);

  // Build the initial search area from the URL, if the user arrived from a HomePage search
  const [searchBounds, setSearchBounds] = useState<[number, number, number, number] | null>(() => {
    const searchLat = Number(searchParams.get("lat"));
    const searchLng = Number(searchParams.get("lng"));
    return searchLat && searchLng ? boundsFromPoint(searchLng, searchLat, SEARCH_PAD) : null;
  });

  // Choropleth interaction and associated legends
  const [activeLayer, setActiveLayer] = useState("Clear");
  const [activeLine, setActiveLine] = useState("baseLine");

  const [activeLeg, setActiveLeg] = useState("none");
  // const handleLegend = (event) => {
  //   setActiveLeg(event.target.value);
  // };

  useEffect(() => {
    fetch(`${apiUrl}/api/map-areas`)
      .then((res) => res.json())
      .then((data) => setMapAreas(data));
  }, [apiUrl]);

  // If the user arrived here from a HomePage search, searchBounds is already
  // set. Fetch Top Picks scoped to that area once on mount 
  useEffect(() => {
    if (searchBounds) {
      fetchRecommendations(searchBounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Fetches the Top Picks recommendations using the current filter values.
  // Called whenever filters are applied AND whenever a new search happens,
  // so Top Picks always reflects the latest area/criteria.
  async function fetchRecommendations(bounds: [number, number, number, number] | null = searchBounds) {
    try {
      const minIncome = number ? Number(number) - 15000 : "";
      const maxIncome = number ? Number(number) + 15000 : "";

      // Pass the searched area straight to the backend so it can narrow the
      // candidate pool BEFORE scoring/ranking. 
      const boundsParams = bounds
        ? `&minLng=${bounds[0]}&minLat=${bounds[1]}&maxLng=${bounds[2]}&maxLat=${bounds[3]}`
        : "";

      const recUrl = `${apiUrl}/api/recommendations?maxPrice=${range[1]}&minPrice=${range[0]}${minIncome ? `&minIncome=${minIncome}&maxIncome=${maxIncome}` : ""}${population ? `&populationType=${population}` : ""}${boundsParams}`;
      const recResponse = await fetch(recUrl);
      const recData = await recResponse.json();
      setRecommendations(recData.results);
    } catch (error) {
      console.log("error:", error);
    }
  }

  // Sends filter values to the backend and narrows which counties are shown on the map
  // Fetches counties matching the current price/income/population filters
  // and applies them to the map, combined with the given search area if
  // there is one. Shared by applyFilters and by a new search (onRetrieve),
  // so the map keeps respecting active filters after the search area changes.
  async function updateMapFilter(bounds: [number, number, number, number] | null) {
    try {
      const minIncome = number ? Number(number) - 15000 : "";
      const maxIncome = number ? Number(number) + 15000 : "";

      const url = `${apiUrl}/api/areas/filter?minPrice=${range[0]}&maxPrice=${range[1]}${minIncome ? `&minIncome=${minIncome}&maxIncome=${maxIncome}` : ""}${population ? `&populationType=${population}` : ""}`;

      const response = await fetch(url);
      const data = await response.json();

      // Only show counties whose names are in the filtered results
      const names = data.results.map((c: { areaName: string }) => c.areaName);
      if (mapInstance) {
        const nameFilter = ["in", ["get", "areaName"], ["literal", names]];

        if (bounds) {
          mapInstance.setFilter("big info", ["all" , nameFilter, buildBoundsFilter(bounds)]);
        } else {
          mapInstance.setFilter("big info", nameFilter);
        }
      }
    } catch (error) {
      console.log("error:", error);
    }
  }

  async function applyFilters() {
    setFiltersApplied(true);
    await updateMapFilter(searchBounds);

    // Also refresh the Top Picks list using the same search
    await fetchRecommendations();

    setShowFilters(false);
  }

  // Resets all filters and shows every county again
  function clearFilters() {
    setPopulation("");
    setNumber("");
    setRange([0, 10000000]);
    setRecommendations([]);
    setFiltersApplied(false);
    if (mapInstance) {
      mapInstance.setFilter("big info", null);
    }
  }

  function flyToCounty(areaName: string) {
    if (!mapInstance) return;
    const area = mapAreas.find((m) => m.areaName === areaName);
    if (area?.latitude && area?.longitude) {
      mapInstance.flyTo({ center: [area.longitude, area.latitude], zoom: 10 });
    }
  }

  // Opens a popup with county info when the user clicks on the map
  function handleMapClick(e: MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const props = feature.properties;
    if (!props) return;
    setPopupInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      county: props.county,
      population: props.population,
      medianRent: props.medianRent,
      medianHomeValue: props.medianHomeValue,
      medianIncome: props.medianIncome,
      //schools: props.link,
    });
  }

  // Choose which visual representation of data is showing
  function switchLayer(layerId: string, lineId: string, choro: string) {

    setActiveLayer(layerId);
    setActiveLine(lineId);
    if (!mapInstance) return;

    /* mapRef.current.addLayer({
        id: layerId,
        type: 'line',
        source: 'maine',
        layout: {},
        paint: {
          'line-color': '#000',
          'line-width': 1
        }
      });  */
    mapInstance.setLayoutProperty("high", "visibility", "none");
    mapInstance.setLayoutProperty("highLine", "visibility", "none");
    mapInstance.setLayoutProperty("bach", "visibility", "none");
    mapInstance.setLayoutProperty("bachLine", "visibility", "none");
    mapInstance.setLayoutProperty("home", "visibility", "none");
    mapInstance.setLayoutProperty("homeLine", "visibility", "none");
    mapInstance.setLayoutProperty("income", "visibility", "none");
    mapInstance.setLayoutProperty("incomeLine", "visibility", "none");
    mapInstance.setLayoutProperty("rent", "visibility", "none");
    mapInstance.setLayoutProperty("rentLine", "visibility", "none");
    mapInstance.setLayoutProperty("pop", "visibility", "none");
    mapInstance.setLayoutProperty("popLine", "visibility", "none");
    mapInstance.setLayoutProperty("baseLine", "visibility", "none");

    mapInstance.setLayoutProperty(layerId, "visibility", "visible");
    mapInstance.setLayoutProperty(lineId, "visibility", "visible");

    setActiveLeg(choro);
  }

  // Saves the currently open popup's county to localStorage favorites.
  // Skips the save if that county is already favorited, so there can only
  // ever be one entry per county.
  function saveToFavorites() {
    if (!popupInfo) return;
    const existing = JSON.parse(localStorage.getItem("favorites") || "[]");

    const alreadyFavorited = existing.some(
      (fav: PopupInfo) => fav.county === popupInfo.county
    );
    if (alreadyFavorited) {
      alert(`${popupInfo.county} is already in your favorites.`);
      return;
    }

    existing.push(popupInfo);
    localStorage.setItem("favorites", JSON.stringify(existing));
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>

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
          onClear={() => {
            // Clearing the search box resets scoping back to statewide
            setSearchBounds(null);
            setSearchParams({});
            if (mapInstance) {
              mapInstance.setFilter("big info", null);
            }
            fetchRecommendations(null);
          }}
          onRetrieve={(result) => {
            const feature = result.features[0];
            const [lng, lat] = feature.geometry.coordinates;

            // Use the result's bounding box if available, otherwise build one from the center point
            const newBounds = feature.properties.bbox
              ? padBounds(feature.properties.bbox as [number, number, number, number], BBOX_PAD)
              : boundsFromPoint(lng, lat, SEARCH_PAD);
            setSearchBounds(newBounds);
            setSearchParams({ lat: String(lat), lng: String(lng) });

            // Keep the map filtered by any already-active filters, combined
            // with the new search area — otherwise a second search silently
            // drops whatever price/income/population filter was applied.
            if (filtersApplied) {
              updateMapFilter(newBounds);
            } else if (mapInstance) {
              mapInstance.setFilter("big info", buildBoundsFilter(newBounds));
            }

            // Refresh Top Picks for this new search, scoped to the searched area
            fetchRecommendations(newBounds);
          }}
          placeholder="Search for counties in Georgia"
          options={{
            proximity: [-83.51424, 32.99815],
            bbox: [-85.60518, 30.35538, -80.75488, 34.98466],
          }}
        />

        <button onClick={() => navigate("/")} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Home
        </button>

        <button onClick={() => setShowFilters(!showFilters)} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Filters
        </button>

        <button onClick={() => navigate("/favorites")} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Favorites
        </button>
      </div>

      {/* Filter panel — shown when user clicks the Filters button */}
      {showFilters && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white rounded-xl p-6 shadow-md w-[clamp(200px,50vw,500px)]">
          <button onClick={() => setShowFilters(false)} className=" px-2 py-1 absolute top-3 right-4 rounded text-xl hover:bg-gray-300 border ">X</button>

          <h2 className="text-lg font-medium mb-4">Population</h2>
          <div className="flex gap-12 pb-4">
            <button
              onClick={() => setPopulation("urban")}
              className={
                population === "urban"
                  ? "w-20 h-10 rounded-lg bg-black text-white"
                  : "w-20 h-10 rounded-lg bg-gray-300 hover:bg-gray-400"
              }
            >
              Urban
            </button>
            <button
              onClick={() => setPopulation("suburban")}
              className={
                population === "suburban"
                  ? "w-20 h-10 rounded-lg bg-black text-white"
                  : "w-20 h-10 rounded-lg bg-gray-300 hover:bg-gray-400"
              }
            >
              Suburban
            </button>
            <button
              onClick={() => setPopulation("rural")}
              className={
                population === "rural"
                  ? "w-20 h-10 rounded-lg bg-black text-white"
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
            className="mt-6 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
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

      {recommendations.length > 0 && (
        <div className="absolute top-0 right-0 h-full w-[clamp(260px,25vw,420px)] bg-black text-white overflow-y-auto p-4 z-10">
          <h2 className="text-lg font-medium mb-4">Top Picks</h2>
          {recommendations.map((r, i) => (
            <div
              key={r.areaName}
              className="border-b border-gray-700 py-3 cursor-pointer hover:bg-gray-900"
              onClick={() => flyToCounty(r.areaName)}
            >
              <div className="font-medium">#{i + 1} {r.areaName} — {r.score} ({r.grade})</div>
              <ul className="text-sm text-white list-disc pl-4">
                {r.recommendationReason.strengths.map((reason, j) => (
                  <li key={`strength-${j}`}>{reason}</li>
                ))}
                {r.recommendationReason.considerations.map((reason, j) => (
                  <li key={`consideration-${j}`} className="text-gray-400">{reason}</li>
                ))}
              </ul>
            </div>
          ))}
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
            map.flyTo({ center: [searchLng, searchLat], zoom: 10 });

            // Note: Top Picks for this search is handled by a separate effect
            // below, since it needs mapAreas to be loaded first.
            const bounds = boundsFromPoint(searchLng, searchLat, SEARCH_PAD);
            map.once("idle", () => {
              map.setFilter("big info", buildBoundsFilter(bounds));
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
              <button onClick={saveToFavorites} className="bg-black text-white rounded-lg p-2 hover:bg-gray-600 active:bg-gray-400 active:scale-95 transition-colors">
                Favorite
              </button>
            </div>
          </Popup>
        )}
      </Map>

      <div className="w-[clamp(200px,50vw,500px)]">
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 10,
          width: "fit-content",
          maxWidth: recommendations.length > 0
            ? "calc(100% - clamp(260px, 25vw, 420px) - 20px)"
            : "calc(100% - 20px)",
          zIndex: 1,
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          background: "white",
          border: 5,
          borderRadius: 12,
          padding: 7,
          borderRadius: 8,
        }}
      >

        <label>
          <input className="" type="radio" name="choropleth" value="Clear" checked={activeLayer === ""} onChange={() => switchLayer("", "baseLine", "")} />
          &nbsp;Clear
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="Population" checked={activeLayer === "pop"} onChange={() => switchLayer("pop", "popLine", "pop")} />
          &nbsp;Population
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="Median Income" checked={activeLayer === "income"} onChange={() => switchLayer("income", "incomeLine", "income")} />
          &nbsp;Median Income
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="Median Rent" checked={activeLayer === "rent"} onChange={() => switchLayer("rent", "rentLine", "rent")} />
          &nbsp;Median Rent
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="Median Home Value" checked={activeLayer === "home"} onChange={() => switchLayer("home", "homeLine", "home")} />
          &nbsp;Median Home Value
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="Bachelors Degree Rate" checked={activeLayer === "bach"} onChange={() => switchLayer("bach", "bachLine", "bach")} />
          &nbsp;Bachelors Degree Rate
        </label>

        <label>
          <input className="" type="radio" name="choropleth" value="High School Graduation Rate" checked={activeLayer === "high"} onChange={() => switchLayer("high", "highLine", "high")} />
          &nbsp;High School Graduation Rate
        </label>

        </div>
        {/* 
         <button onClick={() => setShowFilters(!showFilters)} className="bg-white px-3 py-1 rounded">
          Population
        </button>

        <button onClick={() => navigate("/favorites")} className="bg-white px-3 py-1 rounded">
          Median Income
        </button>

        <button onClick={() => setShowFilters(!showFilters)} className="bg-white px-3 py-1 rounded">
          Median Rent
        </button>

        <button onClick={() => navigate("/favorites")} className="bg-white px-3 py-1 rounded">
          Median Home Value
        </button>

        <button onClick={() => setShowFilters(!showFilters)} className="bg-white px-3 py-1 rounded">
          Bachelors Degree Rate
        </button>

        <button onClick={() => navigate("/favorites")} className="bg-white px-3 py-1 rounded">
          High School Graduation Rate
        </button> */}
      </div>

      <div className="center"
        //className="w-[clamp(300px,50vw,1000px)]"
        style={{
          position: "absolute",
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bottom: 25,
          //left: 290,
          zIndex: 1,
          display: "flex",
          //gap: "30px",
          //background: "white",
          border: 5,
          padding: 7,
        }}
      >
        {/*className="image-display-area" style={{ bottom: '20px' }}>*/}
        {activeLeg === 'pop' && (
          <img
            src="choroPop.png"
            alt="pop"
            style={{ borderRadius: '8px', width: 650, height: 60 }}
          />
        )}
        {activeLeg === 'income' && (
          <img
            src="choroIncome.png"
            alt="income"
            style={{ borderRadius: '8px', width: 450, height: 60 }}
          />
        )}
        {activeLeg === 'rent' && (
          <img
            src="choroRent.png"
            alt="rent"
            style={{ borderRadius: '8px', width: 330, height: 60 }}
          />
        )}
        {activeLeg === 'home' && (
          <img
            src="choroHome.png"
            alt="home"
            style={{ borderRadius: '8px', width: 500, height: 60 }}
          />
        )}
        {activeLeg === 'bach' && (
          <img
            src="choroBach.png"
            alt="bach"
            style={{ borderRadius: '8px', width: 230, height: 60 }}
          />
        )}
        {activeLeg === 'high' && (
          <img
            src="choroHigh.png"
            alt="high"
            style={{ borderRadius: '8px', width: 400, height: 60 }}
          />
        )}
      </div>
      </div>
    </div>
  );
}
export default MapPage;
