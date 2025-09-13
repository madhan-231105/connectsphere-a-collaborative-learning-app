import React, { useEffect, useState } from "react";
import {
  User,
  MessageCircle,
  TrendingUp,
  Heart,
  UserPlus,
  Send, // Added for message icon
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  where,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [requestStatus, setRequestStatus] = useState("loading"); // 'loading', 'none', 'sent', 'received', 'friends', 'ownProfile'
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  // Fetch user profile and friend request status
  useEffect(() => {
    const fetchUserAndRequestStatus = async () => {
      setLoading(true);
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const fetchedUserData = { id: docSnap.id, ...docSnap.data() };
          setUserData(fetchedUserData);

          // Determine current user's relation to this profile
          if (id === currentUser.uid) {
            console.log("Viewing own profile.");
            setRequestStatus("ownProfile");
          } else {
            // 1. Check if they are already friends
            const friendDoc = await getDoc(doc(db, "users", currentUser.uid, "friends", id));
            if (friendDoc.exists()) {
                setRequestStatus("friends");
            } else {
                // 2. Check for a pending request sent by current user to this profile
                const sentRequestQuery = query(
                    collection(db, "friend_requests"),
                    where("from", "==", currentUser.uid),
                    where("to", "==", id),
                    where("status", "==", "pending")
                );
                const sentRequestSnap = await getDocs(sentRequestQuery);

                if (!sentRequestSnap.empty) {
                    setRequestStatus("sent");
                } else {
                    // 3. Check for a pending request received by current user from this profile
                    const receivedRequestQuery = query(
                        collection(db, "friend_requests"),
                        where("from", "==", id),
                        where("to", "==", currentUser.uid),
                        where("status", "==", "pending")
                    );
                    const receivedRequestSnap = await getDocs(receivedRequestQuery);

                    if (!receivedRequestSnap.empty) {
                        setRequestStatus("received");
                    } else {
                        setRequestStatus("none"); // No active relation found
                    }
                }
            }
          }

          // Fetch user posts
          const postsRef = collection(db, "users", docSnap.id, "posts");
          const q = query(postsRef, orderBy("createdAt", "desc"));
          const postsSnap = await getDocs(q);

          const fetchedPosts = await Promise.all(
            postsSnap.docs.map(async (p) => {
              const postData = p.data();
              const post = {
                id: p.id,
                ...postData,
                comments: [],
                likes: Array.isArray(postData.likes) ? postData.likes : [],
                createdAt: postData.createdAt?.toDate
                  ? postData.createdAt.toDate()
                  : new Date(),
              };

              try {
                const commentsSnap = await getDocs(
                  collection(db, "users", docSnap.id, "posts", p.id, "comments")
                );
                post.comments = commentsSnap.docs.map((c) => ({
                  id: c.id,
                  ...c.data(),
                  createdAt: c.data().createdAt?.toDate
                    ? c.data().createdAt.toDate()
                    : new Date(),
                }));
              } catch (err) {
                console.error("Error fetching comments for post", p.id, ":", err);
              }

              return post;
            })
          );

          setPosts(fetchedPosts);
        } else {
          console.error("User not found");
          navigate("/friend-suggestions");
        }
      } catch (err) {
        console.error("Error fetching user profile or request status:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser) {
      fetchUserAndRequestStatus();
    }
  }, [id, currentUser, navigate]);

  const sendFriendRequest = async () => {
    if (!userData || !currentUser) return;
    if (userData.id === currentUser.uid || requestStatus !== "none") return;

    try {
      const existingRequestQuery = query(
        collection(db, "friend_requests"),
        where("from", "==", currentUser.uid),
        where("to", "==", userData.id),
        where("status", "==", "pending")
      );
      const existingRequestSnap = await getDocs(existingRequestQuery);

      if (!existingRequestSnap.empty) {
        console.log("Friend request already sent by current user.");
        setRequestStatus("sent");
        return;
      }

      await addDoc(collection(db, "friend_requests"), {
        from: currentUser.uid,
        to: userData.id,
        fromName: currentUser.displayName || "Anonymous User",
        toName: userData.name,
        status: "pending",
        createdAt: new Date(),
      });
      setRequestStatus("sent");
      console.log(`Friend request sent to ${userData.name}`);
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!userData || !currentUser || requestStatus !== "received") return;

    try {
      const receivedRequestQuery = query(
        collection(db, "friend_requests"),
        where("from", "==", userData.id),
        where("to", "==", currentUser.uid),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(receivedRequestQuery);

      if (!querySnapshot.empty) {
        const requestId = querySnapshot.docs[0].id;
        const requestDocRef = doc(db, "friend_requests", requestId);
        await updateDoc(requestDocRef, {
          status: "accepted",
          updatedAt: new Date(),
        });

        await setDoc(doc(db, "users", currentUser.uid, "friends", userData.id), {
          name: userData.name,
          avatar: userData.avatar || "",
          addedAt: new Date()
        });
        await setDoc(doc(db, "users", userData.id, "friends", currentUser.uid), {
          name: currentUser.displayName || "Anonymous",
          avatar: currentUser.photoURL || "",
          addedAt: new Date()
        });

        setRequestStatus("friends");
        console.log(`Accepted friend request from ${userData.name}.`);
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!userData || !currentUser || requestStatus !== "received") return;

    try {
      const receivedRequestQuery = query(
        collection(db, "friend_requests"),
        where("from", "==", userData.id),
        where("to", "==", currentUser.uid),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(receivedRequestQuery);

      if (!querySnapshot.empty) {
        const requestId = querySnapshot.docs[0].id;
        const requestDocRef = doc(db, "friend_requests", requestId);
        await updateDoc(requestDocRef, {
            status: "declined",
            updatedAt: new Date(),
        });
        setRequestStatus("none");
        console.log(`Declined friend request from ${userData.name}.`);
      }
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!userData || !currentUser || requestStatus !== "sent") return;

    try {
      const sentRequestQuery = query(
        collection(db, "friend_requests"),
        where("from", "==", currentUser.uid),
        where("to", "==", userData.id),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(sentRequestQuery);

      if (!querySnapshot.empty) {
        const requestId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, "friend_requests", requestId));
        setRequestStatus("none");
        console.log(`Canceled friend request to ${userData.name}.`);
      }
    } catch (error) {
      console.error("Error canceling friend request:", error);
    }
  };

  // New function to handle messaging
  const handleMessageUser = () => {
    if (userData && userData.id) {
      navigate(`/message/${userData.id}`); // Navigate to the message page with the user's ID
    }
  };


  if (loading || requestStatus === "loading") return <p className="p-6">Loading...</p>;
  if (!userData) return <p className="p-6">User not found</p>;

  const completion =
    (["name", "title", "avatar", "bio", "location"].filter(
      (f) => userData[f] && userData[f].toString().trim()
    ).length /
      5) *
    100;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600">
        {userData.coverImage ? (
          <img
            src={userData.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
        )}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
        {/* Profile Completion Bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-700">Profile completion</p>
            <p className="text-sm font-medium text-blue-600">{Math.round(completion)}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="relative">
            <img
              src={
                userData.avatar ||
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
              }
              alt={userData.name || "User"}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
          </div>

          {/* Info Section */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{userData.name}</h1>
                <p className="text-xl text-gray-600 mb-2">{userData.title || "No title"}</p>
                <p className="text-gray-600">{userData.location || "No location"}</p>
              </div>

              <div className="flex space-x-2 mt-4 md:mt-0">
                {requestStatus === "none" && (
                  <button
                    onClick={sendFriendRequest}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Send Friend Request</span>
                  </button>
                )}

                {requestStatus === "sent" && (
                  <button
                    onClick={handleCancelFriendRequest}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                  >
                    <span>Cancel Request</span>
                  </button>
                )}

                {requestStatus === "received" && (
                  <>
                    <button
                      onClick={handleAcceptFriendRequest}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Accept Request</span>
                    </button>
                    <button
                      onClick={handleDeclineFriendRequest}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                    >
                      <span>Decline</span>
                    </button>
                  </>
                )}

                {requestStatus === "friends" && (
                  <>
                    <button
                      disabled
                      className="bg-purple-500 cursor-default text-white px-4 py-2 rounded-full flex items-center space-x-1 shadow-lg"
                    >
                      <span>Friends</span>
                    </button>
                    <button
                      onClick={handleMessageUser} // Message button for friends
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                      <span>Message</span>
                    </button>
                  </>
                )}

                {requestStatus === "ownProfile" && (
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-700 leading-relaxed">{userData.bio || "No bio available"}</p>

            {/* Social Links */}
            <div className="mt-4 flex space-x-4">
              {userData.socials?.twitter && (
                <a href={userData.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">Twitter</a>
              )}
              {userData.socials?.linkedin && (
                <a href={userData.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 transition-colors">LinkedIn</a>
              )}
              {userData.socials?.github && (
                <a href={userData.socials.github} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-gray-900 transition-colors">GitHub</a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(userData.stats || {}).map(([key, val]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{val}</p>
              <p className="text-gray-500 capitalize text-sm">{key === "studyGroups" ? "Study Groups" : key}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {[
              { id: "posts", label: "Posts", icon: MessageCircle },
              { id: "activity", label: "Activity", icon: TrendingUp },
              { id: "about", label: "About", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                className="flex items-center space-x-2 px-6 py-4 font-medium transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap"
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6 pb-20">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No posts yet</p>
              <p className="text-gray-400 text-sm mt-2">This user hasn’t shared anything yet.</p>
            </div>
          ) : (
            posts.map((post) => {
              const hasLiked = post.likes.includes(currentUser?.uid);
              return (
                <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{post.content}</p>
                  </div>

                  {post.photoURL && (
                    <div className="mb-4">
                      <img src={post.photoURL} alt="Post content" className="rounded-lg w-full max-h-96 object-cover shadow-sm" />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center space-x-4">
                      <button
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                          hasLiked ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
                        <span>{post.likes.length}</span>
                      </button>
                      <span className="text-sm text-gray-500">{post.comments?.length || 0} comments</span>
                    </div>
                    {post.createdAt && (
                      <span className="text-sm text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;