import React, { useState, useEffect } from "react";
import { Plus, Heart, MessageCircle, User } from "lucide-react";
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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Feed = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});

  // Fetch current user
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

  // Fetch posts from friends + own
  const fetchFeed = async (uid) => {
    try {
      const friendsSnap = await getDocs(collection(db, "users", uid, "friends"));
      const friendsIds = friendsSnap.docs.map((doc) => doc.id);
      friendsIds.push(uid); // include own posts

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

      // Fetch comments
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

  if (loading) return <p className="text-center mt-8">Loading feed...</p>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Feed</h1>

      {posts.length === 0 && (
        <div className="text-center text-gray-500">
          <MessageCircle className="mx-auto mb-2 w-8 h-8" />
          <p>No posts yet</p>
        </div>
      )}

      {posts.map((post) => {
        const hasLiked = post.likes.includes(currentUser?.uid);
        return (
          <div key={post.id} className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={post.avatar || "/default-avatar.png"}
                alt={post.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{post.userName}</p>
                <p className="text-gray-400 text-sm">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{post.content}</p>
            {post.photoURL && <img src={post.photoURL} alt="Post" className="rounded-lg mb-4 w-full max-h-96 object-cover" />}

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handleLike(post)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                  hasLiked ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>{post.likes.length}</span>
              </button>
              <span className="text-gray-400 text-sm">{post.comments.length} comments</span>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              {post.comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-2 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{c.author}</p>
                    <p className="text-gray-700 text-sm">{c.text}</p>
                    <p className="text-gray-400 text-xs">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  {c.authorId === currentUser.uid && (
                    <button onClick={() => handleDeleteComment(post.id, post.userId, c.id)} className="text-red-500 text-xs ml-2">
                      Delete
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ""}
                  onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyPress={(e) => { if (e.key === "Enter") handleAddComment(post.id, post.userId); }}
                  className="border-2 border-gray-200 focus:border-blue-500 rounded-lg p-2 w-full text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleAddComment(post.id, post.userId)}
                  disabled={!commentInputs[post.id]?.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Post Button */}
      <button
        onClick={() => navigate("/add-post")}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center z-50"
        title="Create a new post"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Feed;
