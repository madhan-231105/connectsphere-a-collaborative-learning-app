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
  Trash2,
  MapPin,
  Calendar,
  Mail,
  X,
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
        setProfileData((prev) => ({ 
          ...prev, 
          stats: { ...prev.stats, posts: fetchedPosts.length } 
        }));
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
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  };

  const handleChange = (field, value) => 
    setProfileData((prev) => ({ ...prev, [field]: value }));

  const handleSocialChange = (platform, value) =>
    setProfileData((prev) => ({ 
      ...prev, 
      socials: { ...prev.socials, [platform]: value } 
    }));

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
                comments: [...(p.comments || []), { 
                  ...newComment, 
                  id: docRef.id, 
                  createdAt: new Date() 
                }],
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
      const commentsRef = collection(db, "users", currentUser.uid, "posts", postId, "comments");
      const commentsSnap = await getDocs(commentsRef);
      const deleteCommentsPromises = commentsSnap.docs.map((c) => 
        deleteDoc(doc(db, "users", currentUser.uid, "posts", postId, "comments", c.id))
      );
      await Promise.all(deleteCommentsPromises);

      const postRef = doc(db, "users", currentUser.uid, "posts", postId);
      await deleteDoc(postRef);

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
          p.id === postId 
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } 
            : p
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

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900">
        {profileData.coverImage ? (
          <img 
            src={profileData.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover" 
          />
        ) : null}
        <div className="absolute inset-0 bg-black/20"></div>
        
        {isEditing && (
          <div className="absolute bottom-4 left-4 right-4 max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cover Image URL"
                value={profileData.coverImage}
                onChange={(e) => handleChange("coverImage", e.target.value)}
                className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {profileData.coverImage && (
                <button
                  onClick={() => handleChange("coverImage", "")}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-10">
        {/* Profile Completion */}
        {completion < 100 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-900">Complete your profile</p>
              <p className="text-sm font-semibold text-gray-900">{Math.round(completion)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={
                  profileData.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profileData.name || profileData.email
                  )}&background=212529&color=fff&size=128`
                }
                alt={profileData.name || "User"}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {isEditing && (
                <div className="absolute -bottom-2 -right-2">
                  <button
                    className="p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
                    title="Change avatar"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      placeholder="Enter your name"
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="text-2xl font-bold mb-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                      {profileData.name || "Your Name"}
                    </h1>
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.title}
                      placeholder="Your title or role"
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="text-lg mb-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  ) : (
                    profileData.title && (
                      <p className="text-lg text-gray-600 mb-2">{profileData.title}</p>
                    )
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{profileData.email}</span>
                    </div>
                    {profileData.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profileData.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {profileData.joinDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                {isEditing ? (
                  <textarea
                    value={profileData.bio}
                    placeholder="Tell us about yourself..."
                    onChange={(e) => handleChange("bio", e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    rows="3"
                  />
                ) : (
                  profileData.bio && (
                    <p className="text-gray-700 leading-relaxed">{profileData.bio}</p>
                  )
                )}
              </div>

              {/* Location (when editing) */}
              {isEditing && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={profileData.location}
                    placeholder="Your location"
                    onChange={(e) => handleChange("location", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Avatar URL (when editing) */}
              {isEditing && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={profileData.avatar}
                    placeholder="Avatar image URL"
                    onChange={(e) => handleChange("avatar", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Social Links */}
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    placeholder="Twitter URL"
                    value={profileData.socials.twitter}
                    onChange={(e) => handleSocialChange("twitter", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    placeholder="LinkedIn URL"
                    value={profileData.socials.linkedin}
                    onChange={(e) => handleSocialChange("linkedin", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    placeholder="GitHub URL"
                    value={profileData.socials.github}
                    onChange={(e) => handleSocialChange("github", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ) : (
                (profileData.socials.twitter || 
                 profileData.socials.linkedin || 
                 profileData.socials.github) && (
                  <div className="flex flex-wrap gap-3">
                    {profileData.socials.twitter && (
                      <a
                        href={profileData.socials.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Twitter
                      </a>
                    )}
                    {profileData.socials.linkedin && (
                      <a
                        href={profileData.socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profileData.socials.github && (
                      <a
                        href={profileData.socials.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        GitHub
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(profileData.stats).map(([key, val]) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center hover:shadow-md transition-shadow"
            >
              <p className="text-2xl font-bold text-gray-900">{val}</p>
              <p className="text-gray-500 capitalize text-sm mt-1">
                {key === "studyGroups" ? "Study Groups" : key}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: "posts", label: "Posts", icon: MessageCircle },
              { id: "activity", label: "Activity", icon: TrendingUp },
              { id: "about", label: "About", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-gray-900 border-b-2 border-gray-900 bg-gray-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-500 mb-6">Share your thoughts with the world!</p>
                  <button
                    onClick={goToAddPost}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Create Post
                  </button>
                </div>
              ) : (
                posts.map((post) => {
                  const hasLiked = post.likes.includes(currentUser?.uid);
                  return (
                    <div
                      key={post.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            {post.title && (
                              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                                {post.title}
                              </h3>
                            )}
                            <p className="text-sm text-gray-500">
                              {formatDate(post.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                          {post.content}
                        </p>

                        {post.photoURL && (
                          <img
                            src={post.photoURL}
                            alt="Post content"
                            className="rounded-lg w-full max-h-96 object-cover mb-4 border border-gray-200"
                          />
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                hasLiked
                                  ? "bg-red-50 text-red-600"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
                              <span className="font-medium">{post.likes.length}</span>
                            </button>
                            <div className="flex items-center gap-2 text-gray-500">
                              <MessageCircle className="w-5 h-5" />
                              <span className="font-medium">
                                {post.comments?.length || 0} comments
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-sm text-gray-900">
                                    {comment.author}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                    {comment.authorId === currentUser.uid && (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            Post
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
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-500">Your activity will appear here</p>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">About Me</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    Bio
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {profileData.bio || "No bio added yet"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    Location
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {profileData.location || "Location not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    Member Since
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {profileData.joinDate}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Skills & Interests</h4>
                  {profileData.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profileData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-sm font-medium border border-gray-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-3">
                      No skills added yet
                    </p>
                  )}
                  {isEditing && (
                    <input
                      type="text"
                      placeholder="Add skills (comma separated)"
                      defaultValue={profileData.skills?.join(", ") || ""}
                      onBlur={handleSkillsChange}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
        className="fixed bottom-8 right-8 p-4 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-110 z-50"
        title="Create a new post"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Profile;