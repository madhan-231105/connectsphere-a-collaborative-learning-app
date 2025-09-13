// src/pages/FriendSuggestion.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const FriendSuggestion = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Watch auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user); // user is null until logged in
    });
    return unsubscribe;
  }, []);

  // Fetch users once we know the current user
  useEffect(() => {
    if (!currentUser) return; // wait for auth before fetching

    const fetchUsers = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.id !== currentUser.uid); // exclude self
      setUsers(usersList);
    };

    fetchUsers();
  }, [currentUser]); // depends on currentUser, not currentUser.uid directly

  if (!currentUser) return <div>Loading…</div>; // show loader while waiting

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Friend Suggestions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 border rounded cursor-pointer hover:shadow-md"
            onClick={() => navigate(`/user-profile/${user.id}`)}
          >
            <h2 className="font-semibold">{user.name || "Unknown"}</h2>
            <p>{user.email}</p>
            <p className="text-sm text-gray-500">{user.bio || "No bio yet"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendSuggestion;
