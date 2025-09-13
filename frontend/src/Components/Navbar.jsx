import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Users, MessageCircle, Bell, User as UserIcon, LogOut } from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    await signOut(auth);
    navigate("/login");
  };

const navItems = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/friend-suggestions", label: "Suggestions", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserIcon }
];



  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              ConnectSphere
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center space-x-4">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-1 px-3 py-2 rounded-md transition-colors 
                   ${isActive ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Icon (optional hamburger) */}
          <div className="md:hidden flex items-center">
            {/* Add your mobile menu button here */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
