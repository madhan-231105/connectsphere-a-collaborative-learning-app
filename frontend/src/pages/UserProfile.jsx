import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { ArrowLeft, UserPlus, UserMinus, MessageCircle, MapPin, Calendar, Mail } from "lucide-react";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        }

        const postsRef = collection(db, "users", id, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const userPosts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setPosts(userPosts);

        const friendDoc = await getDoc(doc(db, "users", currentUser.uid, "friends", id));
        setIsFriend(friendDoc.exists());

        const requestDoc = await getDoc(doc(db, "friend_requests", `${currentUser.uid}_${id}`));
        setRequestSent(requestDoc.exists() && requestDoc.data().status === "pending");
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, currentUser, navigate]);

  const handleSendFriendRequest = async () => {
    if (!currentUser || !user) return;

    try {
      await setDoc(doc(db, "friend_requests", `${currentUser.uid}_${id}`), {
        from: currentUser.uid,
        fromName: currentUser.displayName || currentUser.email,
        to: id,
        status: "pending",
        createdAt: new Date(),
      });
      setRequestSent(true);
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request");
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Remove ${user.name} from your friends?`)) return;

    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "friends", id));
      await deleteDoc(doc(db, "users", id, "friends", currentUser.uid));
      setIsFriend(false);
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Failed to remove friend");
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">User not found</p>
          <button
            onClick={() => navigate("/friend-suggestions")}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Suggestions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=212529&color=fff&size=128`}
              alt={user.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
            />

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.name || "Anonymous"}</h1>
              {user.bio && <p className="text-gray-600 mb-3">{user.bio}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                {user.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{posts.length} posts</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isFriend ? (
                  <>
                    <button
                      onClick={() => navigate(`/message/${id}`)}
                      className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={handleUnfriend}
                      className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                      <UserMinus className="w-4 h-4" />
                      Unfriend
                    </button>
                  </>
                ) : requestSent ? (
                  <button
                    disabled
                    className="px-6 py-2 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Request Sent
                  </button>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Posts</h2>

        {posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Calendar className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500">{user.name} hasn't shared anything yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {post.photoURL && (
                  <img
                    src={post.photoURL}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  {post.title && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                  )}
                  <p className="text-sm text-gray-500 mb-3">{formatDate(post.createdAt)}</p>
                  <p className="text-gray-700 line-clamp-3">{post.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;