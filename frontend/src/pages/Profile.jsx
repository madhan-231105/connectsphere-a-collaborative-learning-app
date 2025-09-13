import React, { useState, useEffect } from "react";
import {
  User,
  MessageCircle,
  TrendingUp,
  Edit3,
  Camera,
  Save,
  LogOut,
  Plus,
  Heart,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";


const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});

  const [profileData, setProfileData] = useState({
    uid: "",
    name: "",
    email: "",
    title: "",
    location: "",
    joinDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    avatar: "",
    coverImage: "",
    bio: "",
    stats: { posts: 0, followers: 0, following: 0, karma: 0, studyGroups: 0 },
    badges: [],
    skills: [],
    studyGroups: [],
    socials: { twitter: "", linkedin: "", github: "" },
  });

  const completion =
    (["name", "title", "avatar", "bio", "location"].filter(
      (field) => profileData[field] && profileData[field].toString().trim()
    ).length /
      5) *
    100;

  // Fetch current user and profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setProfileData((prev) => ({
              ...prev,
              ...userData,
              stats: userData.stats || prev.stats,
              socials: userData.socials || prev.socials,
            }));
          } else {
            const defaultProfile = {
              ...profileData,
              uid: user.uid,
              email: user.email || "",
              name: user.displayName || "",
            };
            await setDoc(docRef, defaultProfile);
            setProfileData(defaultProfile);
          }
        } catch (err) {
          console.error("Error fetching/creating profile:", err);
          setError("Failed to load profile data.");
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch posts
  useEffect(() => {
    if (!currentUser) return;

    const fetchPosts = async () => {
      try {
        const postsRef = collection(db, "users", currentUser.uid, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const fetchedPosts = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const postData = docSnap.data();
            const post = {
              id: docSnap.id,
              ...postData,
              comments: [],
              likes: Array.isArray(postData.likes) ? postData.likes : [],
              createdAt: postData.createdAt?.toDate
                ? postData.createdAt.toDate()
                : postData.createdAt
                ? new Date(postData.createdAt)
                : new Date(),
            };

            try {
              const commentsSnap = await getDocs(
                collection(db, "users", currentUser.uid, "posts", docSnap.id, "comments")
              );
              post.comments = commentsSnap.docs.map((c) => {
                const cData = c.data();
                return {
                  id: c.id,
                  ...cData,
                  createdAt: cData.createdAt?.toDate
                    ? cData.createdAt.toDate()
                    : new Date(),
                };
              });
            } catch (commentErr) {
              console.error("Error fetching comments for post:", docSnap.id, commentErr);
            }

            return post;
          })
        );

        setPosts(fetchedPosts);
        setProfileData((prev) => ({ ...prev, stats: { ...prev.stats, posts: fetchedPosts.length } }));
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
    };

    fetchPosts();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "users", currentUser.uid);
      await setDoc(docRef, profileData, { merge: true });
      setIsEditing(false);
      alert("Profile saved successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  };

  const handleChange = (field, value) => setProfileData((prev) => ({ ...prev, [field]: value }));

  const handleSocialChange = (platform, value) =>
    setProfileData((prev) => ({ ...prev, socials: { ...prev.socials, [platform]: value } }));

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to log out.");
    }
  };

  const goToAddPost = () => navigate("/add-post");

  const handleLike = async (postId) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, "users", currentUser.uid, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const post = postSnap.data();
      const likes = Array.isArray(post.likes) ? post.likes : [];
      const updatedLikes = likes.includes(currentUser.uid)
        ? likes.filter((uid) => uid !== currentUser.uid)
        : [...likes, currentUser.uid];

      await updateDoc(postRef, { likes: updatedLikes });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: updatedLikes } : p))
      );
    } catch (err) {
      console.error("Error liking/unliking post:", err);
      alert("Failed to update like status.");
    }
  };

  const handleAddComment = async (postId) => {
    if (!currentUser) return;
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    try {
      const commentsRef = collection(db, "users", currentUser.uid, "posts", postId, "comments");
      const newComment = {
        text: text.trim(),
        author: profileData.name || currentUser.email || "Anonymous",
        authorId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(commentsRef, newComment);
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), { ...newComment, id: docRef.id, createdAt: new Date() }],
              }
            : p
        )
      );
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      // Delete all comments first
      const commentsRef = collection(db, "users", currentUser.uid, "posts", postId, "comments");
      const commentsSnap = await getDocs(commentsRef);
      const deleteCommentsPromises = commentsSnap.docs.map((c) => deleteDoc(doc(db, "users", currentUser.uid, "posts", postId, "comments", c.id)));
      await Promise.all(deleteCommentsPromises);

      // Delete the post
      const postRef = doc(db, "users", currentUser.uid, "posts", postId);
      await deleteDoc(postRef);

      // Update local state
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setProfileData((prev) => ({
        ...prev,
        stats: { ...prev.stats, posts: prev.stats.posts - 1 },
      }));
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const commentRef = doc(db, "users", currentUser.uid, "posts", postId, "comments", commentId);
      await deleteDoc(commentRef);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
        )
      );
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment.");
    }
  };

  const handleSkillsChange = (e) => {
    const skillsText = e.target.value;
    handleChange(
      "skills",
      skillsText
        ? skillsText.split(",").map((s) => s.trim()).filter(Boolean)
        : []
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600">
        {profileData.coverImage ? (
          <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
        )}
        <div className="absolute inset-0 bg-black/30"></div>
        {isEditing && (
          <div className="absolute bottom-4 left-4 right-4">
            <input
              type="text"
              placeholder="Cover Image URL"
              value={profileData.coverImage}
              onChange={(e) => handleChange("coverImage", e.target.value)}
              className="w-full p-2 rounded bg-white/90 backdrop-blur-sm"
            />
          </div>
        )}
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
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <img
                src={
                  profileData.avatar ||
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                }
                alt={profileData.name || "User"}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {isEditing && (
                <div className="absolute bottom-0 left-0 w-full flex flex-col space-y-1">
                  <input
                    type="text"
                    placeholder="Avatar URL"
                    value={profileData.avatar}
                    onChange={(e) => handleChange("avatar", e.target.value)}
                    className="w-full p-1 text-xs rounded bg-white shadow border"
                  />
                  <button
                    onClick={() =>
                      alert("Integrate file upload functionality here")
                    }
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Camera className="w-3 h-3" /> <span>Upload</span>
                  </button>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      placeholder="Enter your name"
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="text-3xl font-bold mb-2 w-full border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {profileData.name || "Your Name"}
                    </h1>
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.title}
                      placeholder="Enter your title"
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="text-xl text-gray-600 mb-2 w-full border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <p className="text-xl text-gray-600 mb-2">
                      {profileData.title || "Your Title"}
                    </p>
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      placeholder="Enter your location"
                      onChange={(e) => handleChange("location", e.target.value)}
                      className="text-gray-600 mb-2 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none w-full bg-transparent"
                    />
                  ) : (
                    <p className="text-gray-600">{profileData.location || "Your Location"}</p>
                  )}
                </div>

                <div className="flex space-x-2 mt-4 md:mt-0">
                  <button
                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors flex items-center space-x-1 shadow-lg"
                  >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    <span>{isEditing ? "Save" : "Edit"}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-1 transition-colors shadow-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Bio */}
              {isEditing ? (
                <textarea
                  value={profileData.bio}
                  placeholder="Tell us about yourself..."
                  onChange={(e) => handleChange("bio", e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-blue-500 p-3 rounded-lg focus:outline-none resize-none"
                  rows="3"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {profileData.bio || "Share something about yourself..."}
                </p>
              )}

              {/* Social Links */}
              <div className="mt-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      placeholder="Twitter URL"
                      value={profileData.socials.twitter}
                      onChange={(e) => handleSocialChange("twitter", e.target.value)}
                      className="border-2 border-gray-300 focus:border-blue-500 rounded-lg p-2 text-sm w-full focus:outline-none"
                    />
                    <input
                      placeholder="LinkedIn URL"
                      value={profileData.socials.linkedin}
                      onChange={(e) => handleSocialChange("linkedin", e.target.value)}
                      className="border-2 border-gray-300 focus:border-blue-500 rounded-lg p-2 text-sm w-full focus:outline-none"
                    />
                    <input
                      placeholder="GitHub URL"
                      value={profileData.socials.github}
                      onChange={(e) => handleSocialChange("github", e.target.value)}
                      className="border-2 border-gray-300 focus:border-blue-500 rounded-lg p-2 text-sm w-full focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    {profileData.socials.twitter && (
                      <a href={profileData.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">Twitter</a>
                    )}
                    {profileData.socials.linkedin && (
                      <a href={profileData.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 transition-colors">LinkedIn</a>
                    )}
                    {profileData.socials.github && (
                      <a href={profileData.socials.github} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-gray-900 transition-colors">GitHub</a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(profileData.stats).map(([key, val]) => (
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
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-20">
          {/* Posts Tab */}
          {activeTab === "posts" && (
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No posts yet</p>
                  <p className="text-gray-400 text-sm mt-2">Share your thoughts with the world!</p>
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

                      {/* Like Section */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                              hasLiked ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

                      {/* Comments */}
                      <div className="mt-4 space-y-3">
                        {post.comments?.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-900">{comment.author}</span>
                              {comment.createdAt && (
                                <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm">{comment.text}</p>
                            {comment.authorId === currentUser.uid && (
                              <button
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="text-red-500 hover:text-red-600 text-xs mt-1"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}

                        {post.authorId === currentUser.uid && (
                          <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:text-red-600 text-sm ml-2">
                            Delete Post
                          </button>
                        )}

                        {/* Add Comment */}
                        <div className="flex gap-2 mt-4">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyPress={(e) => { if (e.key === "Enter") handleAddComment(post.id); }}
                            className="border-2 border-gray-200 focus:border-blue-500 rounded-lg p-2 w-full text-sm focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No activity yet</p>
              <p className="text-gray-400 text-sm mt-2">Your activity will appear here</p>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">About Me</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-500" /> Bio
                  </h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{profileData.bio || "No bio added yet"}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{profileData.location || "Location not specified"}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Member Since</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{profileData.joinDate}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Skills & Interests</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profileData.skills?.length ? (
                      profileData.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{skill}</span>
                      ))
                    ) : (
                      <p className="text-gray-500 bg-gray-50 p-3 rounded-lg w-full">No skills added yet</p>
                    )}
                  </div>
                  {isEditing && (
                    <input
                      type="text"
                      placeholder="Add skills (comma separated)"
                      defaultValue={profileData.skills?.join(", ") || ""}
                      onBlur={handleSkillsChange}
                      className="border-2 border-gray-300 focus:border-blue-500 rounded-lg p-2 w-full text-sm focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Post Button */}
      <button
        onClick={goToAddPost}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center z-50"
        title="Create a new post"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Profile;