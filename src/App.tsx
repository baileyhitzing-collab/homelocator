import { useState } from "react";

import "./App.css";

import Slider from "rc-slider";

import "rc-slider/assets/index.css";

function App() {
  const [range, setRange] = useState([100000, 500000]);

  return (
    <>
      <div className="flex items-center justify-center text-6xl mt-20 ">
        <h1>HOME LOCATION FINDER</h1>
      </div>
      <div className="flex items-center justify-center min-h-screen ">
        <div className=" bg-white rounded-x1 p-6 shadow-md w-96 flex flex-col">
          <h2 className="text-lg font-medium mb-4">Price Range</h2>
          <div className="flex justify-between mb-4">
            <span className="text-gray-500 text-sm">
              Min:
              <strong>${range[0].toLocaleString()}</strong>
            </span>
            <span className="text-gray-500 text-sm">
              Max:
              <strong>${range[1].toLocaleString()}</strong>
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
          <button className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bgblue-700">
            Search Areas
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
