import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Bell, UserPlus, Check, X } from "lucide-react";

const Notifications = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "friend_requests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const reqs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRequests(reqs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // ✅ ACCEPT FRIEND REQUEST (ATOMIC + RULE SAFE)
  const handleAcceptRequest = async (requestId, fromUserId, fromUserName) => {
    if (!currentUser) return;

    try {
      const batch = writeBatch(db);

      const requestRef = doc(db, "friend_requests", requestId);

      const myFriendRef = doc(
        db,
        "users",
        currentUser.uid,
        "friends",
        fromUserId
      );

      const theirFriendRef = doc(
        db,
        "users",
        fromUserId,
        "friends",
        currentUser.uid
      );

      // 1️⃣ Update request
      batch.update(requestRef, {
        status: "accepted",
      });

      // 2️⃣ Add friend to me
      batch.set(myFriendRef, {
        friendId: fromUserId,
        name: fromUserName,
        avatar: "",
        createdAt: serverTimestamp(),
      });

      // 3️⃣ Add me to friend
      batch.set(theirFriendRef, {
        friendId: currentUser.uid,
        name: currentUser.displayName || "Anonymous",
        avatar: currentUser.photoURL || "",
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      console.log("Friend request accepted");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  // ✅ DECLINE REQUEST
  const handleDeclineRequest = async (requestId) => {
    if (!currentUser) return;

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "friend_requests", requestId), {
        status: "declined",
      });
      await batch.commit();
    } catch (error) {
      console.error("Error declining friend request:", error);
      alert("Failed to decline friend request");
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>

        {requests.length === 0 ? (
          <div className="bg-white p-10 rounded-xl text-center">
            <Bell className="mx-auto mb-4 text-gray-400" size={40} />
            No new notifications
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-6 rounded-xl border"
              >
                <p className="mb-4">
                  <span
                    onClick={() =>
                      navigate(`/user-profile/${req.from}`)
                    }
                    className="font-semibold cursor-pointer hover:underline"
                  >
                    {req.fromName || "Someone"}
                  </span>{" "}
                  sent you a friend request
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleAcceptRequest(
                        req.id,
                        req.from,
                        req.fromName || req.from
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded"
                  >
                    <Check size={16} /> Accept
                  </button>

                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="flex items-center gap-2 px-4 py-2 border rounded"
                  >
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
