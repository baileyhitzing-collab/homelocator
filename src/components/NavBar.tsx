import { Link } from "react-router-dom";

function NavBar() {
  return (
    <div className="h-20 bg-white flex items-center w-full shrink-0">
      <Link to="/" className="text-4xl pl-10 text-black no-underline">
        HomeBound.
      </Link>
    </div>
  );
}

export default NavBar;
