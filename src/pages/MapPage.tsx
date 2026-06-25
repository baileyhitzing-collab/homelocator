import { useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { SearchBox } from "@mapbox/search-js-react";
import "mapbox-gl/dist/mapbox-gl.css";

function MapPage() {
  const [value, setValue] = useState("");
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>
        <SearchBox
          accessToken={token}
          value={value}
          onChange={(val) => setValue(val)}
          placeholder="Find the perfect county"
          options={{
            proximity: [-83.51424, 32.99815],
            bbox: [-85.60518, 30.35538, -80.75488, 34.98466],
          }}
        />
      </div>

      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: -83.51424,
          latitude: 32.99815,
          zoom: 6.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/d-peters/cmqfkvh9a00d301s392w72eku"
      >
        <Marker longitude={-83.51424} latitude={32.99815} />
        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
}

export default MapPage;
