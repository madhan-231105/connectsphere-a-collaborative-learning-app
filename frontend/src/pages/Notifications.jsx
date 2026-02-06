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
        const reqs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  const handleAcceptRequest = async (requestId, fromUserId, fromUserName) => {
    if (!currentUser) return;

    try {
      const requestRef = doc(db, "friend_requests", requestId);

      await updateDoc(requestRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", currentUser.uid, "friends", fromUserId), {
        name: fromUserName,
        avatar: "",
        addedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", fromUserId, "friends", currentUser.uid), {
        name: currentUser.displayName || "Anonymous",
        avatar: currentUser.photoURL || "",
        addedAt: serverTimestamp(),
      });

      console.log(`Friend request from ${fromUserName} accepted.`);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleDeclineRequest = async (requestId, fromUserName) => {
    if (!currentUser) return;

    try {
      const requestRef = doc(db, "friend_requests", requestId);

      await updateDoc(requestRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });

      console.log(`Friend request from ${fromUserName} declined.`);
    } catch (error) {
      console.error("Error declining friend request:", error);
      alert("Failed to decline friend request");
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            {requests.length === 0 ? "You're all caught up!" : `${requests.length} new notification${requests.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Bell className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No new notifications</h3>
            <p className="text-gray-500">When you get friend requests, they'll appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 mb-1">
                      <span
                        onClick={() => navigate(`/user-profile/${req.from}`)}
                        className="font-semibold hover:underline cursor-pointer"
                      >
                        {req.fromName || "Someone"}
                      </span>
                      {" "}sent you a friend request
                    </p>
                    <p className="text-sm text-gray-500">
                      {req.createdAt?.toDate
                        ? new Date(req.createdAt.toDate()).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Recently"}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() =>
                          handleAcceptRequest(req.id, req.from, req.fromName || req.from)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleDeclineRequest(req.id, req.fromName || req.from)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
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