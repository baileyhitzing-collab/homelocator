import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBox } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";

function HomePage() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);



  return (
    <>
    <div
      className="min-h-screen overflow-hidden relative"
      style={{
        backgroundImage: "url('mountain.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",

        
      }}
      
    >
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1}} />
      
      <div className="h-20 bg-white flex items-center w-screen " style={{zIndex: 2, position: "relative"}}>
        <h1 className="text-4xl pl-10"> HomeBound.</h1>
      </div>



      <div className=" text-6xl  absolute" style={{ top: "10vh", left: "50vw", zIndex: 2}}>
        <h1 className="text-white" style={{ fontSize: "10vw"}}>Home is where the heart is.</h1>
        <p className="text-white" >Find your place.</p>
      </div>
      
        <div className="bg-white shadow-md absolute rounded-lg p-5" style={{ top: "50vh", left: "5vw", zIndex: 2, width: "40vw", height: ""}}>
        <h1 className="text-5xl font-medium "> Where do you want to live?</h1>
        <div className="flex flex-col items-center justify-center gap-4 mt-5">

        <div className="flex items-center gap-2 " style={{ fontSize: "2vw" }}>
        <SearchBox
          accessToken={token}
          mapboxgl={mapboxgl}
          value={value}
          onChange={(val) => setValue(val)}
          onRetrieve={(result) => {
            console.log("retrieved:", result);
            const [lng, lat] = result.features[0].geometry.coordinates;
            setCoords({ lat, lng });
            }}

          placeholder="Search for a county or area"
        />
        <button
          onClick={() => {
            if (coords) {
              navigate(`/map?lat=${coords.lat}&lng=${coords.lng}`);
            } else {
              navigate("/map");
            }
          }}

          className=" bg-black text-white p-3 rounded-lg hover:bg-blue-700 text-2xl" style={{ fontSize: "2vw", width: "8vw"}}
        >
          Search 
        </button>
        </div>
      </div>
      </div>
    </div>

    
    </>
  );
}

export default HomePage;
