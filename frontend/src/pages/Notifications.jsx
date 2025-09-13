import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Listen for pending friend requests sent TO the current user
    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
    });

    return () => unsub();
  }, [currentUser]);

  const handleAcceptRequest = async (requestId, fromUserId, fromUserName) => {
    if (!currentUser) return;

    try {
      const requestRef = doc(db, "friend_requests", requestId);

      // Update friend request status
      await updateDoc(requestRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      // Add to current user's friends subcollection
      await setDoc(doc(db, "users", currentUser.uid, "friends", fromUserId), {
        name: fromUserName,
        avatar: "", // Optional: fetch from users collection
        addedAt: serverTimestamp(),
      });

      // Add to sender's friends subcollection
      await setDoc(doc(db, "users", fromUserId, "friends", currentUser.uid), {
        name: currentUser.displayName || "Anonymous",
        avatar: currentUser.photoURL || "",
        addedAt: serverTimestamp(),
      });

      console.log(`Friend request from ${fromUserName} accepted.`);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleDeclineRequest = async (requestId, fromUserName) => {
    if (!currentUser) return;

    try {
      const requestRef = doc(db, "friend_requests", requestId);

      // Update friend request status to declined
      await updateDoc(requestRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });

      console.log(`Friend request from ${fromUserName} declined.`);
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold mb-2">Notifications</h2>
      {requests.length === 0 && <p className="text-gray-500">No new friend requests</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between border-b py-2 last:border-b-0"
        >
          <span
            onClick={() => navigate(`/user-profile/${req.from}`)}
            className="cursor-pointer hover:underline text-gray-800 flex-grow"
          >
            New friend request from{" "}
            <span className="font-semibold">{req.fromName || req.from}</span>
          </span>
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() =>
                handleAcceptRequest(req.id, req.from, req.fromName || req.from)
              }
              className="px-3 py-1 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() =>
                handleDeclineRequest(req.id, req.fromName || req.from)
              }
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notifications;
