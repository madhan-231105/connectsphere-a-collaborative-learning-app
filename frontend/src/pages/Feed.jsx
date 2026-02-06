import React, { useState, useEffect } from "react";
import { Plus, Heart, MessageCircle, User, Trash2 } from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Feed = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchFeed(user.uid);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchFeed = async (uid) => {
    try {
      const friendsSnap = await getDocs(collection(db, "users", uid, "friends"));
      const friendsIds = friendsSnap.docs.map((doc) => doc.id);
      friendsIds.push(uid);

      let allPosts = [];

      for (const friendId of friendsIds) {
        const postsRef = collection(db, "users", friendId, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const userDoc = await getDoc(doc(db, "users", friendId));
        const userName = userDoc.exists() ? userDoc.data().name : "Unknown";
        const avatar = userDoc.exists() ? userDoc.data().avatar : null;

        snap.docs.forEach((docSnap) => {
          const postData = docSnap.data();
          allPosts.push({
            id: docSnap.id,
            userId: friendId,
            userName,
            avatar,
            content: postData.content,
            title: postData.title || "",
            photoURL: postData.photoURL || "",
            likes: Array.isArray(postData.likes) ? postData.likes : [],
            comments: [],
            createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate() : new Date(),
          });
        });
      }

      allPosts.sort((a, b) => b.createdAt - a.createdAt);

      const postsWithComments = await Promise.all(
        allPosts.map(async (post) => {
          const commentsSnap = await getDocs(
            collection(db, "users", post.userId, "posts", post.id, "comments")
          );
          post.comments = commentsSnap.docs.map((c) => {
            const cData = c.data();
            return {
              id: c.id,
              text: cData.text,
              author: cData.author,
              authorId: cData.authorId,
              createdAt: cData.createdAt?.toDate ? cData.createdAt.toDate() : new Date(),
            };
          });
          return post;
        })
      );

      setPosts(postsWithComments);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching feed:", err);
      setLoading(false);
    }
  };

  const handleLike = async (post) => {
    if (!currentUser) return;
    const postRef = doc(db, "users", post.userId, "posts", post.id);
    const updatedLikes = post.likes.includes(currentUser.uid)
      ? post.likes.filter((id) => id !== currentUser.uid)
      : [...post.likes, currentUser.uid];

    await updateDoc(postRef, { likes: updatedLikes });
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: updatedLikes } : p)));
  };

  const handleAddComment = async (postId, postUserId) => {
    if (!currentUser) return;
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const commentsRef = collection(db, "users", postUserId, "posts", postId, "comments");
    const newComment = {
      text,
      author: currentUser.displayName || currentUser.email || "Anonymous",
      authorId: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(commentsRef, newComment);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, { ...newComment, id: docRef.id, createdAt: new Date() }] } : p
      )
    );
  };

  const handleDeleteComment = async (postId, postUserId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const commentRef = doc(db, "users", postUserId, "posts", postId, "comments", commentId);
      await deleteDoc(commentRef);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
        )
      );
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
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
          <p className="text-gray-600">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Feed</h1>

        {posts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageCircle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-6">Be the first to share something!</p>
            <button
              onClick={() => navigate("/add-post")}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create Post
            </button>
          </div>
        )}

        <div className="space-y-6">
          {posts.map((post) => {
            const hasLiked = post.likes.includes(currentUser?.uid);
            return (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Post Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={post.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName)}&background=212529&color=fff`}
                      alt={post.userName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{post.userName}</h3>
                      <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="px-6 pb-4">
                  {post.title && (
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
                  )}
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Image */}
                {post.photoURL && (
                  <div className="px-6 pb-4">
                    <img
                      src={post.photoURL}
                      alt="Post"
                      className="rounded-lg w-full max-h-96 object-cover border border-gray-200"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="px-6 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleLike(post)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                        hasLiked
                          ? "bg-red-50 text-red-600"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
                      <span className="text-sm font-medium">{post.likes.length}</span>
                    </button>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.comments.length} comments</span>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                {post.comments.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 space-y-3">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex items-start space-x-3">
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">{c.author}</span>
                            {c.authorId === currentUser.uid && (
                              <button
                                onClick={() => handleDeleteComment(post.id, post.userId, c.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{c.text}</p>
                          <span className="text-xs text-gray-500 mt-1 inline-block">
                            {formatDate(c.createdAt)}
                          </span>
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
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id, post.userId);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => handleAddComment(post.id, post.userId)}
                      disabled={!commentInputs[post.id]?.trim()}
                      className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Add Post Button */}
        <button
          onClick={() => navigate("/add-post")}
          className="fixed bottom-8 right-8 p-4 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-110 z-50"
          title="Create a new post"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Feed;