// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import AddPost from "./pages/AddPost";
import FriendSuggestion from "./pages/FriendSuggestion";
import Navbar from "./Components/Navbar";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import Feed from "./pages/Feed";
import Message from "./pages/Message";
import GroupChat from "./pages/GroupChat";
import Groups from "./pages/Groups";

function AppWrapper() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/login";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/add-post" element={<AddPost />} />
        <Route path="/friend-suggestions" element={<FriendSuggestion />} />
        <Route path="/user-profile/:id" element={<UserProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/message/:id" element={<Message />} /> {/* 1-on-1 chat */}
        <Route path="/group-chat/:id" element={<GroupChat />} /> {/* ✅ Group chat route */}
        <Route path="/groups" element={<Groups />} />  {/* add route */}

      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
